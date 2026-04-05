// @ts-nocheck
/**
 * Employer Verification System
 * 
 * Features:
 * - Verification request workflow
 * - ABN (Australian Business Number) verification
 * - Document upload and verification
 * - Admin verification dashboard data
 * - Verification badges
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

const prismaClient = new PrismaClient();
const prisma = prismaClient as any;

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERIFICATION_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended'
};

const VERIFICATION_TYPES = {
  BASIC: {
    id: 'basic',
    label: 'Basic Verification',
    description: 'ABN verified',
    requirements: ['abn'],
    badge: '✓',
    color: '#6B7280'
  },
  STANDARD: {
    id: 'standard',
    label: 'Verified Employer',
    description: 'ABN and identity verified',
    requirements: ['abn', 'identity'],
    badge: '✓✓',
    color: '#3B82F6'
  },
  PREMIUM: {
    id: 'premium',
    label: 'Premium Verified',
    description: 'Full verification with references',
    requirements: ['abn', 'identity', 'documents', 'references'],
    badge: '★',
    color: '#F59E0B'
  },
  RAP_COMMITTED: {
    id: 'rap_committed',
    label: 'RAP Committed',
    description: 'Has Reconciliation Action Plan',
    requirements: ['abn', 'identity', 'rap_document'],
    badge: '🤝',
    color: '#10B981'
  },
  INDIGENOUS_OWNED: {
    id: 'indigenous_owned',
    label: 'Indigenous Owned',
    description: 'Verified Indigenous-owned business',
    requirements: ['abn', 'identity', 'indigenous_ownership'],
    badge: '🪃',
    color: '#8B4513'
  }
};

const DOCUMENT_TYPES = {
  ABN_CERTIFICATE: {
    id: 'abn_certificate',
    label: 'ABN Certificate',
    description: 'Australian Business Number registration certificate',
    required: true
  },
  ASIC_EXTRACT: {
    id: 'asic_extract',
    label: 'ASIC Company Extract',
    description: 'Current company extract from ASIC',
    required: false
  },
  INSURANCE_CERTIFICATE: {
    id: 'insurance_certificate',
    label: 'Insurance Certificate',
    description: 'Public liability or professional indemnity insurance',
    required: false
  },
  RAP_DOCUMENT: {
    id: 'rap_document',
    label: 'Reconciliation Action Plan',
    description: 'Current RAP document or proof of RAP commitment',
    required: false
  },
  INDIGENOUS_CERTIFICATION: {
    id: 'indigenous_certification',
    label: 'Indigenous Business Certification',
    description: 'Certification from Supply Nation or similar',
    required: false
  },
  DIRECTOR_ID: {
    id: 'director_id',
    label: 'Director Identification',
    description: 'Government-issued ID of company director',
    required: false
  }
};

// S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ngurra-verifications';

// ============================================================================
// ABN VERIFICATION
// ============================================================================

/**
 * Verify Australian Business Number using ABR API
 */
export async function verifyABN(abn) {
  // Clean ABN (remove spaces)
  const cleanAbn = abn.replace(/\s/g, '');

  // Validate ABN format (11 digits)
  if (!/^\d{11}$/.test(cleanAbn)) {
    return {
      valid: false,
      error: 'Invalid ABN format. ABN must be 11 digits.'
    };
  }

  // Validate ABN checksum
  if (!validateAbnChecksum(cleanAbn)) {
    return {
      valid: false,
      error: 'Invalid ABN checksum.'
    };
  }

  // Query Australian Business Register API
  try {
    const abrApiKey = process.env.ABR_API_KEY;
    
    if (abrApiKey) {
      const response = await fetch(
        `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByABN?searchString=${cleanAbn}&includeHistoricalDetails=N&authenticationGuid=${abrApiKey}`
      );

      if (response.ok) {
        const xml = await response.text();
        const businessInfo = parseAbrResponse(xml);
        
        if (businessInfo) {
          return {
            valid: true,
            abn: cleanAbn,
            entityName: businessInfo.entityName,
            entityType: businessInfo.entityType,
            status: businessInfo.status,
            gstRegistered: businessInfo.gstRegistered,
            location: businessInfo.location,
            verifiedAt: new Date().toISOString()
          };
        }
      }
    }

    // Fallback: Return valid based on checksum only
    return {
      valid: true,
      abn: cleanAbn,
      note: 'ABN format valid. Full verification requires ABR API key.',
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('ABN verification error:', error);
    return {
      valid: true,
      abn: cleanAbn,
      note: 'ABN format valid. Online verification unavailable.',
      verifiedAt: new Date().toISOString()
    };
  }
}

/**
 * Validate ABN checksum using standard algorithm
 */
function validateAbnChecksum(abn) {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;

  for (let i = 0; i < 11; i++) {
    let digit = parseInt(abn[i], 10);
    if (i === 0) digit -= 1; // Subtract 1 from first digit
    sum += digit * weights[i];
  }

  return sum % 89 === 0;
}

/**
 * Parse ABR XML response
 */
function parseAbrResponse(xml) {
  try {
    // Simple XML parsing (in production, use proper XML parser)
    const entityName = xml.match(/<organisationName>([^<]+)<\/organisationName>/)?.[1] ||
                       xml.match(/<givenName>([^<]+)<\/givenName>/)?.[1];
    const entityType = xml.match(/<entityTypeText>([^<]+)<\/entityTypeText>/)?.[1];
    const status = xml.match(/<entityStatusCode>([^<]+)<\/entityStatusCode>/)?.[1];
    const gst = xml.match(/<effectiveTo>0001-01-01<\/effectiveTo>/); // GST registered if no end date
    const state = xml.match(/<stateCode>([^<]+)<\/stateCode>/)?.[1];
    const postcode = xml.match(/<postcode>([^<]+)<\/postcode>/)?.[1];

    return {
      entityName: entityName || 'Unknown',
      entityType: entityType || 'Unknown',
      status: status === 'Active' ? 'Active' : 'Inactive',
      gstRegistered: !!gst,
      location: state && postcode ? `${state} ${postcode}` : null
    };
  } catch {
    return null;
  }
}

// ============================================================================
// VERIFICATION REQUEST WORKFLOW
// ============================================================================

/**
 * Submit verification request
 */
export async function submitVerificationRequest(companyId, requestData) {
  // Check for existing pending request
  const existing = await prisma.verificationRequest.findFirst({
    where: {
      companyId,
      status: { in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.IN_REVIEW] }
    }
  });

  if (existing) {
    throw new Error('A verification request is already pending');
  }

  // Verify ABN first
  const abnVerification = await verifyABN(requestData.abn);
  if (!abnVerification.valid) {
    throw new Error(abnVerification.error);
  }

  const request = await prisma.verificationRequest.create({
    data: {
      companyId,
      type: requestData.type || 'standard',
      abn: abnVerification.abn,
      abnVerified: true,
      abnDetails: abnVerification,
      contactName: requestData.contactName,
      contactEmail: requestData.contactEmail,
      contactPhone: requestData.contactPhone,
      companyWebsite: requestData.companyWebsite,
      employeeCount: requestData.employeeCount,
      industryType: requestData.industryType,
      indigenousOwned: requestData.indigenousOwned ?? false,
      hasRAP: requestData.hasRAP ?? false,
      rapStatus: requestData.rapStatus,
      additionalInfo: requestData.additionalInfo,
      status: VERIFICATION_STATUS.PENDING,
      submittedAt: new Date()
    }
  });

  // Notify admin team
  await notifyAdminsNewRequest(request);

  return formatRequestResponse(request);
}

/**
 * Get verification request status
 */
export async function getVerificationStatus(companyId) {
  const request = await prisma.verificationRequest.findFirst({
    where: { companyId },
    orderBy: { submittedAt: 'desc' },
    include: {
      documents: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  if (!request) {
    return {
      hasRequest: false,
      isVerified: false
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { verificationStatus: true, verificationLevel: true }
  });

  return {
    hasRequest: true,
    request: formatRequestResponse(request),
    isVerified: company?.verificationStatus === 'verified',
    verificationLevel: company?.verificationLevel,
    documents: request.documents.map(d => ({
      id: d.id,
      type: d.type,
      status: d.status,
      uploadedAt: d.uploadedAt
    })),
    reviews: request.reviews.map(r => ({
      date: r.createdAt,
      status: r.newStatus,
      notes: r.notes
    }))
  };
}

// ============================================================================
// DOCUMENT UPLOAD
// ============================================================================

/**
 * Get upload URL for verification document
 */
export async function getDocumentUploadUrl(requestId, documentType, fileName) {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    throw new Error('Verification request not found');
  }

  if (!DOCUMENT_TYPES[documentType.toUpperCase()]) {
    throw new Error('Invalid document type');
  }

  const documentId = uuid();
  const extension = fileName.split('.').pop();
  const key = `verifications/${request.companyId}/${requestId}/${documentType}/${documentId}.${extension}`;

  // Create document record
  const document = await prisma.verificationDocument.create({
    data: {
      id: documentId,
      requestId,
      type: documentType,
      fileName,
      s3Key: key,
      status: 'uploading'
    }
  });

  // Generate presigned upload URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: getContentType(extension)
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    documentId,
    uploadUrl,
    expires: new Date(Date.now() + 3600 * 1000).toISOString()
  };
}

/**
 * Confirm document upload
 */
export async function confirmDocumentUpload(documentId) {
  const document = await prisma.verificationDocument.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    throw new Error('Document not found');
  }

  await prisma.verificationDocument.update({
    where: { id: documentId },
    data: {
      status: 'pending_review',
      uploadedAt: new Date()
    }
  });

  // Check if all required documents are uploaded
  await checkDocumentCompleteness(document.requestId);

  return { confirmed: true, documentId };
}

/**
 * Check if all required documents are uploaded
 */
async function checkDocumentCompleteness(requestId) {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: { documents: true }
  });

  if (!request) return;

  const verificationTypeInfo = VERIFICATION_TYPES[request.type.toUpperCase()];
  if (!verificationTypeInfo) return;

  const requiredDocs = verificationTypeInfo.requirements;
  const uploadedDocs = request.documents.map(d => d.type.toLowerCase());

  const hasAllRequired = requiredDocs.every(req => {
    if (req === 'abn') return request.abnVerified;
    if (req === 'identity') return uploadedDocs.includes('director_id');
    if (req === 'documents') return uploadedDocs.includes('asic_extract') || uploadedDocs.includes('insurance_certificate');
    if (req === 'rap_document') return uploadedDocs.includes('rap_document');
    if (req === 'indigenous_ownership') return uploadedDocs.includes('indigenous_certification');
    return true;
  });

  if (hasAllRequired && request.status === VERIFICATION_STATUS.PENDING) {
    await prisma.verificationRequest.update({
      where: { id: requestId },
      data: { 
        status: VERIFICATION_STATUS.IN_REVIEW,
        reviewStartedAt: new Date()
      }
    });
  }
}

function getContentType(extension) {
  const types = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  };
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

// ============================================================================
// ADMIN VERIFICATION DASHBOARD
// ============================================================================

/**
 * Get verification requests for admin dashboard
 */
export async function getVerificationRequests(options = {}) {
  const { status, type, page = 1, limit = 20 } = options;

  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [requests, total] = await Promise.all([
    prisma.verificationRequest.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        company: {
          select: { id: true, name: true, logo: true }
        },
        documents: {
          select: { id: true, type: true, status: true }
        }
      }
    }),
    prisma.verificationRequest.count({ where })
  ]);

  return {
    requests: requests.map(r => ({
      id: r.id,
      company: r.company,
      type: r.type,
      status: r.status,
      abn: r.abn,
      abnVerified: r.abnVerified,
      submittedAt: r.submittedAt,
      documentsCount: r.documents.length,
      documentsReady: r.documents.filter(d => d.status === 'pending_review').length
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

/**
 * Get verification dashboard stats
 */
export async function getVerificationDashboardStats() {
  const [pending, inReview, approved, rejected] = await Promise.all([
    prisma.verificationRequest.count({ where: { status: VERIFICATION_STATUS.PENDING } }),
    prisma.verificationRequest.count({ where: { status: VERIFICATION_STATUS.IN_REVIEW } }),
    prisma.verificationRequest.count({ where: { status: VERIFICATION_STATUS.APPROVED } }),
    prisma.verificationRequest.count({ where: { status: VERIFICATION_STATUS.REJECTED } })
  ]);

  // Average processing time
  const recentApproved = await prisma.verificationRequest.findMany({
    where: {
      status: VERIFICATION_STATUS.APPROVED,
      approvedAt: { not: null }
    },
    orderBy: { approvedAt: 'desc' },
    take: 50,
    select: { submittedAt: true, approvedAt: true }
  });

  const avgProcessingDays = recentApproved.length > 0
    ? Math.round(recentApproved.reduce((sum, r) => {
        return sum + (new Date(r.approvedAt) - new Date(r.submittedAt)) / (1000 * 60 * 60 * 24);
      }, 0) / recentApproved.length)
    : 0;

  return {
    pending,
    inReview,
    approved,
    rejected,
    total: pending + inReview + approved + rejected,
    avgProcessingDays,
    needsAttention: pending + inReview
  };
}

/**
 * Review verification request (admin action)
 */
export async function reviewVerificationRequest(requestId, adminId, reviewData) {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    throw new Error('Verification request not found');
  }

  const { action, notes, documentReviews } = reviewData;

  // Record review
  await prisma.verificationReview.create({
    data: {
      requestId,
      adminId,
      previousStatus: request.status,
      newStatus: action,
      notes,
      documentReviews
    }
  });

  // Update request status
  const updateData = {
    status: action,
    reviewedBy: adminId,
    reviewNotes: notes
  };

  if (action === VERIFICATION_STATUS.APPROVED) {
    updateData.approvedAt = new Date();
  } else if (action === VERIFICATION_STATUS.REJECTED) {
    updateData.rejectedAt = new Date();
    updateData.rejectionReason = notes;
  }

  await prisma.verificationRequest.update({
    where: { id: requestId },
    data: updateData
  });

  // If approved, update company verification status
  if (action === VERIFICATION_STATUS.APPROVED) {
    await prisma.company.update({
      where: { id: request.companyId },
      data: {
        verificationStatus: 'verified',
        verificationLevel: request.type,
        verifiedAt: new Date()
      }
    });

    // Notify company
    await notifyCompanyVerified(request);
  } else if (action === VERIFICATION_STATUS.REJECTED) {
    await notifyCompanyRejected(request, notes);
  }

  return { success: true, newStatus: action };
}

// ============================================================================
// VERIFICATION BADGES
// ============================================================================

/**
 * Get verification badge for a company
 */
export async function getVerificationBadge(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      verificationStatus: true,
      verificationLevel: true,
      verifiedAt: true
    }
  });

  if (!company || company.verificationStatus !== 'verified') {
    return null;
  }

  const badgeType = VERIFICATION_TYPES[company.verificationLevel?.toUpperCase()] || VERIFICATION_TYPES.BASIC;

  return {
    type: badgeType.id,
    label: badgeType.label,
    description: badgeType.description,
    badge: badgeType.badge,
    color: badgeType.color,
    verifiedAt: company.verifiedAt,
    verifyUrl: `${process.env.APP_URL}/verify/company/${companyId}`
  };
}

/**
 * Verify company badge publicly
 */
export async function verifyCompanyBadge(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      verificationStatus: true,
      verificationLevel: true,
      verifiedAt: true,
      industryType: true,
      location: true
    }
  });

  if (!company) {
    return { verified: false, error: 'Company not found' };
  }

  if (company.verificationStatus !== 'verified') {
    return { verified: false, error: 'Company not verified' };
  }

  const badgeType = VERIFICATION_TYPES[company.verificationLevel?.toUpperCase()] || VERIFICATION_TYPES.BASIC;

  return {
    verified: true,
    company: {
      name: company.name,
      industry: company.industryType,
      location: company.location
    },
    verification: {
      level: badgeType.label,
      description: badgeType.description,
      verifiedAt: company.verifiedAt
    }
  };
}

/**
 * Generate embeddable verification badge
 */
export function generateBadgeEmbed(companyId, verificationLevel) {
  const badgeType = VERIFICATION_TYPES[verificationLevel?.toUpperCase()] || VERIFICATION_TYPES.BASIC;
  const verifyUrl = `${process.env.APP_URL}/verify/company/${companyId}`;

  return {
    html: `<a href="${verifyUrl}" target="_blank" rel="noopener" title="${badgeType.label}">
      <img src="${process.env.APP_URL}/badges/employer/${verificationLevel}.svg" 
           alt="${badgeType.label}" 
           style="height: 32px;" />
    </a>`,
    markdown: `[![${badgeType.label}](${process.env.APP_URL}/badges/employer/${verificationLevel}.svg)](${verifyUrl})`,
    url: verifyUrl,
    imageUrl: `${process.env.APP_URL}/badges/employer/${verificationLevel}.svg`
  };
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

async function notifyAdminsNewRequest(request) {
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true }
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'VERIFICATION_REQUEST',
        title: 'New Employer Verification Request',
        message: `A new ${request.type} verification request requires review.`,
        metadata: { requestId: request.id },
        priority: 'high'
      }
    }).catch(() => {});
  }
}

async function notifyCompanyVerified(request) {
  const company = await prisma.company.findUnique({
    where: { id: request.companyId },
    include: { users: { select: { id: true } } }
  });

  if (!company) return;

  for (const user of company.users) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'VERIFICATION_APPROVED',
        title: 'Verification Approved! 🎉',
        message: `Your company has been verified. You now have the ${VERIFICATION_TYPES[request.type.toUpperCase()]?.label || 'Verified'} badge.`,
        metadata: { requestId: request.id }
      }
    }).catch(() => {});
  }
}

async function notifyCompanyRejected(request, reason) {
  const company = await prisma.company.findUnique({
    where: { id: request.companyId },
    include: { users: { select: { id: true } } }
  });

  if (!company) return;

  for (const user of company.users) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'VERIFICATION_REJECTED',
        title: 'Verification Not Approved',
        message: reason || 'Your verification request was not approved. Please review the requirements and try again.',
        metadata: { requestId: request.id }
      }
    }).catch(() => {});
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRequestResponse(request) {
  const typeInfo = VERIFICATION_TYPES[request.type?.toUpperCase()];
  
  return {
    id: request.id,
    type: request.type,
    typeInfo: typeInfo ? {
      label: typeInfo.label,
      description: typeInfo.description,
      requirements: typeInfo.requirements
    } : null,
    status: request.status,
    abn: request.abn,
    abnVerified: request.abnVerified,
    abnDetails: request.abnDetails,
    contactName: request.contactName,
    contactEmail: request.contactEmail,
    indigenousOwned: request.indigenousOwned,
    hasRAP: request.hasRAP,
    submittedAt: request.submittedAt,
    approvedAt: request.approvedAt,
    rejectedAt: request.rejectedAt,
    rejectionReason: request.rejectionReason
  };
}

export default {
  // ABN verification
  verifyABN,
  
  // Request workflow
  submitVerificationRequest,
  getVerificationStatus,
  
  // Documents
  getDocumentUploadUrl,
  confirmDocumentUpload,
  
  // Admin dashboard
  getVerificationRequests,
  getVerificationDashboardStats,
  reviewVerificationRequest,
  
  // Badges
  getVerificationBadge,
  verifyCompanyBadge,
  generateBadgeEmbed,
  
  // Config
  VERIFICATION_STATUS,
  VERIFICATION_TYPES,
  DOCUMENT_TYPES
};

export {};
