// @ts-nocheck
/**
 * Career Portfolio Builder
 * 
 * Comprehensive portfolio functionality including:
 * - Project showcase with media
 * - Work samples gallery
 * - Portfolio templates
 * - Public shareable URLs
 * - Analytics tracking
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

const prismaClient = new PrismaClient();
const prisma = prismaClient as any;

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORTFOLIO_CONFIG = {
  maxProjects: 20,
  maxMediaPerProject: 10,
  maxMediaSize: 50 * 1024 * 1024, // 50MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  supportedVideoTypes: ['video/mp4', 'video/webm'],
  supportedDocTypes: ['application/pdf'],
  defaultTemplate: 'modern'
};

const TEMPLATES = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, minimalist design with focus on visuals',
    primaryColor: '#2563eb',
    layout: 'grid',
    features: ['hero', 'skills', 'projects', 'contact']
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Bold, artistic design for creative professionals',
    primaryColor: '#9333ea',
    layout: 'masonry',
    features: ['splash', 'work', 'about', 'contact']
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Traditional, corporate-friendly layout',
    primaryColor: '#1e3a5f',
    layout: 'list',
    features: ['summary', 'experience', 'projects', 'education']
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Text-focused, fast-loading design',
    primaryColor: '#171717',
    layout: 'single-column',
    features: ['intro', 'work', 'contact']
  },
  indigenous: {
    id: 'indigenous',
    name: 'Cultural Connection',
    description: 'Design celebrating Indigenous Australian heritage',
    primaryColor: '#8B4513',
    layout: 'story',
    features: ['culture', 'journey', 'work', 'community']
  }
};

const PROJECT_CATEGORIES = [
  'Web Development',
  'Mobile App',
  'Design',
  'Art',
  'Photography',
  'Video',
  'Writing',
  'Research',
  'Community Project',
  'Cultural Project',
  'Education',
  'Business',
  'Other'
];

// S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ngurra-portfolios';

// ============================================================================
// PORTFOLIO MANAGEMENT
// ============================================================================

/**
 * Create or update portfolio settings
 */
export async function createOrUpdatePortfolio(userId, settings) {
  let portfolio = await prisma.portfolio.findFirst({
    where: { userId }
  });

  const slug = settings.slug || await generateUniqueSlug(settings.displayName || userId);

  if (portfolio) {
    portfolio = await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        displayName: settings.displayName,
        headline: settings.headline,
        bio: settings.bio,
        slug,
        template: settings.template || portfolio.template,
        customColors: settings.customColors,
        socialLinks: settings.socialLinks,
        contactEmail: settings.contactEmail,
        showEmail: settings.showEmail ?? portfolio.showEmail,
        isPublic: settings.isPublic ?? portfolio.isPublic,
        customDomain: settings.customDomain,
        updatedAt: new Date()
      }
    });
  } else {
    portfolio = await prisma.portfolio.create({
      data: {
        userId,
        displayName: settings.displayName || 'My Portfolio',
        headline: settings.headline,
        bio: settings.bio,
        slug,
        template: settings.template || PORTFOLIO_CONFIG.defaultTemplate,
        customColors: settings.customColors,
        socialLinks: settings.socialLinks || {},
        contactEmail: settings.contactEmail,
        showEmail: settings.showEmail ?? false,
        isPublic: settings.isPublic ?? false
      }
    });
  }

  return formatPortfolioResponse(portfolio);
}

/**
 * Get portfolio by user ID
 */
export async function getPortfolioByUserId(userId, includeProjects = true) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId },
    include: includeProjects ? {
      projects: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          media: {
            orderBy: { displayOrder: 'asc' }
          }
        }
      }
    } : undefined
  });

  if (!portfolio) return null;
  return formatPortfolioResponse(portfolio);
}

/**
 * Get portfolio by public slug
 */
export async function getPortfolioBySlug(slug, viewerId = null) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { slug, isPublic: true },
    include: {
      projects: {
        where: { isActive: true, isPublic: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          media: {
            where: { isPublic: true },
            orderBy: { displayOrder: 'asc' }
          }
        }
      },
      user: {
        select: {
          name: true,
          profileImageUrl: true,
          skills: {
            where: { isVerified: true },
            take: 10
          }
        }
      }
    }
  });

  if (!portfolio) return null;

  // Track view
  await trackPortfolioView(portfolio.id, viewerId);

  return formatPublicPortfolioResponse(portfolio);
}

/**
 * Generate unique slug
 */
async function generateUniqueSlug(baseName) {
  let slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  let counter = 0;
  let uniqueSlug = slug;

  while (await prisma.portfolio.findFirst({ where: { slug: uniqueSlug } })) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Check slug availability
 */
export async function checkSlugAvailability(slug, currentUserId = null) {
  const existing = await prisma.portfolio.findFirst({
    where: { slug }
  });

  if (!existing) return { available: true };
  if (existing.userId === currentUserId) return { available: true };
  return { available: false, suggestion: `${slug}-${Date.now().toString(36)}` };
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

/**
 * Add a project to portfolio
 */
export async function addProject(userId, projectData) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId }
  });

  if (!portfolio) {
    throw new Error('Portfolio not found. Create a portfolio first.');
  }

  // Check project limit
  const projectCount = await prisma.portfolioProject.count({
    where: { portfolioId: portfolio.id, isActive: true }
  });

  if (projectCount >= PORTFOLIO_CONFIG.maxProjects) {
    throw new Error(`Maximum ${PORTFOLIO_CONFIG.maxProjects} projects allowed`);
  }

  // Get next display order
  const maxOrder = await prisma.portfolioProject.aggregate({
    where: { portfolioId: portfolio.id },
    _max: { displayOrder: true }
  });

  const project = await prisma.portfolioProject.create({
    data: {
      portfolioId: portfolio.id,
      title: projectData.title,
      description: projectData.description,
      shortDescription: projectData.shortDescription,
      category: projectData.category,
      technologies: projectData.technologies || [],
      projectUrl: projectData.projectUrl,
      sourceUrl: projectData.sourceUrl,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      isOngoing: projectData.isOngoing ?? false,
      role: projectData.role,
      teamSize: projectData.teamSize,
      highlights: projectData.highlights || [],
      displayOrder: (maxOrder._max?.displayOrder ?? -1) + 1,
      isPublic: projectData.isPublic ?? true,
      isFeatured: projectData.isFeatured ?? false
    }
  });

  return formatProjectResponse(project);
}

/**
 * Update a project
 */
export async function updateProject(userId, projectId, projectData) {
  const project = await prisma.portfolioProject.findFirst({
    where: { id: projectId },
    include: { portfolio: true }
  });

  if (!project || project.portfolio.userId !== userId) {
    throw new Error('Project not found');
  }

  const updated = await prisma.portfolioProject.update({
    where: { id: projectId },
    data: {
      title: projectData.title ?? project.title,
      description: projectData.description ?? project.description,
      shortDescription: projectData.shortDescription ?? project.shortDescription,
      category: projectData.category ?? project.category,
      technologies: projectData.technologies ?? project.technologies,
      projectUrl: projectData.projectUrl ?? project.projectUrl,
      sourceUrl: projectData.sourceUrl ?? project.sourceUrl,
      startDate: projectData.startDate ?? project.startDate,
      endDate: projectData.endDate ?? project.endDate,
      isOngoing: projectData.isOngoing ?? project.isOngoing,
      role: projectData.role ?? project.role,
      teamSize: projectData.teamSize ?? project.teamSize,
      highlights: projectData.highlights ?? project.highlights,
      isPublic: projectData.isPublic ?? project.isPublic,
      isFeatured: projectData.isFeatured ?? project.isFeatured,
      updatedAt: new Date()
    },
    include: { media: true }
  });

  return formatProjectResponse(updated);
}

/**
 * Delete a project
 */
export async function deleteProject(userId, projectId) {
  const project = await prisma.portfolioProject.findFirst({
    where: { id: projectId },
    include: { portfolio: true, media: true }
  });

  if (!project || project.portfolio.userId !== userId) {
    throw new Error('Project not found');
  }

  // Delete media files from S3
  for (const media of project.media) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: media.s3Key
      }));
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  }

  // Soft delete project
  await prisma.portfolioProject.update({
    where: { id: projectId },
    data: { isActive: false, deletedAt: new Date() }
  });

  return { deleted: true };
}

/**
 * Reorder projects
 */
export async function reorderProjects(userId, projectOrder) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId }
  });

  if (!portfolio) {
    throw new Error('Portfolio not found');
  }

  // Update display order for each project
  const updates = projectOrder.map((projectId, index) =>
    prisma.portfolioProject.updateMany({
      where: { id: projectId, portfolioId: portfolio.id },
      data: { displayOrder: index }
    })
  );

  await prisma.$transaction(updates);

  return { success: true };
}

/**
 * Get all projects for a portfolio
 */
export async function getProjects(userId) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId }
  });

  if (!portfolio) return [];

  const projects = await prisma.portfolioProject.findMany({
    where: { portfolioId: portfolio.id, isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: { media: { orderBy: { displayOrder: 'asc' } } }
  });

  return projects.map(formatProjectResponse);
}

// ============================================================================
// MEDIA GALLERY
// ============================================================================

/**
 * Get upload URL for project media
 */
export async function getMediaUploadUrl(userId, projectId, fileInfo) {
  const project = await prisma.portfolioProject.findFirst({
    where: { id: projectId },
    include: { portfolio: true }
  });

  if (!project || project.portfolio.userId !== userId) {
    throw new Error('Project not found');
  }

  // Check media limit
  const mediaCount = await prisma.portfolioMedia.count({
    where: { projectId }
  });

  if (mediaCount >= PORTFOLIO_CONFIG.maxMediaPerProject) {
    throw new Error(`Maximum ${PORTFOLIO_CONFIG.maxMediaPerProject} media items per project`);
  }

  // Validate file type
  const allTypes = [
    ...PORTFOLIO_CONFIG.supportedImageTypes,
    ...PORTFOLIO_CONFIG.supportedVideoTypes,
    ...PORTFOLIO_CONFIG.supportedDocTypes
  ];

  if (!allTypes.includes(fileInfo.contentType)) {
    throw new Error('Unsupported file type');
  }

  if (fileInfo.size > PORTFOLIO_CONFIG.maxMediaSize) {
    throw new Error(`File size exceeds ${PORTFOLIO_CONFIG.maxMediaSize / 1024 / 1024}MB limit`);
  }

  const mediaId = uuid();
  const extension = fileInfo.fileName.split('.').pop();
  const key = `portfolios/${userId}/${projectId}/${mediaId}.${extension}`;

  // Create media record
  const media = await prisma.portfolioMedia.create({
    data: {
      id: mediaId,
      projectId,
      type: getMediaType(fileInfo.contentType),
      fileName: fileInfo.fileName,
      contentType: fileInfo.contentType,
      fileSize: fileInfo.size,
      s3Key: key,
      status: 'uploading'
    }
  });

  // Generate presigned URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileInfo.contentType
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    mediaId,
    uploadUrl,
    expires: new Date(Date.now() + 3600 * 1000).toISOString()
  };
}

/**
 * Confirm media upload completion
 */
export async function confirmMediaUpload(userId, mediaId, metadata = {}) {
  const media = await prisma.portfolioMedia.findFirst({
    where: { id: mediaId },
    include: { project: { include: { portfolio: true } } }
  });

  if (!media || media.project.portfolio.userId !== userId) {
    throw new Error('Media not found');
  }

  // Get next display order
  const maxOrder = await prisma.portfolioMedia.aggregate({
    where: { projectId: media.projectId },
    _max: { displayOrder: true }
  });

  const updated = await prisma.portfolioMedia.update({
    where: { id: mediaId },
    data: {
      status: 'ready',
      url: getS3PublicUrl(media.s3Key),
      title: metadata.title,
      caption: metadata.caption,
      altText: metadata.altText,
      displayOrder: (maxOrder._max?.displayOrder ?? -1) + 1
    }
  });

  return formatMediaResponse(updated);
}

/**
 * Update media metadata
 */
export async function updateMedia(userId, mediaId, metadata) {
  const media = await prisma.portfolioMedia.findFirst({
    where: { id: mediaId },
    include: { project: { include: { portfolio: true } } }
  });

  if (!media || media.project.portfolio.userId !== userId) {
    throw new Error('Media not found');
  }

  const updated = await prisma.portfolioMedia.update({
    where: { id: mediaId },
    data: {
      title: metadata.title ?? media.title,
      caption: metadata.caption ?? media.caption,
      altText: metadata.altText ?? media.altText,
      isPublic: metadata.isPublic ?? media.isPublic,
      isCover: metadata.isCover ?? media.isCover
    }
  });

  // If setting as cover, unset other covers
  if (metadata.isCover) {
    await prisma.portfolioMedia.updateMany({
      where: {
        projectId: media.projectId,
        id: { not: mediaId }
      },
      data: { isCover: false }
    });
  }

  return formatMediaResponse(updated);
}

/**
 * Delete media
 */
export async function deleteMedia(userId, mediaId) {
  const media = await prisma.portfolioMedia.findFirst({
    where: { id: mediaId },
    include: { project: { include: { portfolio: true } } }
  });

  if (!media || media.project.portfolio.userId !== userId) {
    throw new Error('Media not found');
  }

  // Delete from S3
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: media.s3Key
    }));
  } catch (error) {
    console.error('S3 deletion error:', error);
  }

  await prisma.portfolioMedia.delete({ where: { id: mediaId } });

  return { deleted: true };
}

/**
 * Reorder media within a project
 */
export async function reorderMedia(userId, projectId, mediaOrder) {
  const project = await prisma.portfolioProject.findFirst({
    where: { id: projectId },
    include: { portfolio: true }
  });

  if (!project || project.portfolio.userId !== userId) {
    throw new Error('Project not found');
  }

  const updates = mediaOrder.map((mediaId, index) =>
    prisma.portfolioMedia.updateMany({
      where: { id: mediaId, projectId },
      data: { displayOrder: index }
    })
  );

  await prisma.$transaction(updates);

  return { success: true };
}

function getMediaType(contentType) {
  if (PORTFOLIO_CONFIG.supportedImageTypes.includes(contentType)) return 'image';
  if (PORTFOLIO_CONFIG.supportedVideoTypes.includes(contentType)) return 'video';
  if (PORTFOLIO_CONFIG.supportedDocTypes.includes(contentType)) return 'document';
  return 'other';
}

// ============================================================================
// PORTFOLIO TEMPLATES
// ============================================================================

/**
 * Get available templates
 */
export function getTemplates() {
  return Object.values(TEMPLATES);
}

/**
 * Apply template to portfolio
 */
export async function applyTemplate(userId, templateId) {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error('Template not found');
  }

  const portfolio = await prisma.portfolio.updateMany({
    where: { userId },
    data: {
      template: templateId,
      customColors: {
        primary: template.primaryColor,
        layout: template.layout
      }
    }
  });

  return { applied: true, template };
}

/**
 * Get template preview data
 */
export function getTemplatePreview(templateId) {
  const template = TEMPLATES[templateId];
  if (!template) return null;

  return {
    ...template,
    previewUrl: `${process.env.APP_URL}/portfolio/preview/${templateId}`,
    previewImage: `${process.env.APP_URL}/templates/${templateId}-preview.jpg`
  };
}

// ============================================================================
// PUBLIC URL & SHARING
// ============================================================================

/**
 * Get public portfolio URL
 */
export async function getPublicUrl(userId) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId }
  });

  if (!portfolio) return null;

  const baseUrl = process.env.APP_URL || 'https://ngurrapathways.com.au';
  
  return {
    url: `${baseUrl}/p/${portfolio.slug}`,
    slug: portfolio.slug,
    customDomain: portfolio.customDomain,
    isPublic: portfolio.isPublic
  };
}

/**
 * Generate shareable link with optional expiry
 */
export async function createShareableLink(userId, options = {}) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId }
  });

  if (!portfolio) {
    throw new Error('Portfolio not found');
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = options.expiresIn 
    ? new Date(Date.now() + options.expiresIn * 1000)
    : null;

  const link = await prisma.portfolioShareLink.create({
    data: {
      portfolioId: portfolio.id,
      token,
      expiresAt,
      password: options.password ? await hashPassword(options.password) : null,
      maxViews: options.maxViews,
      viewCount: 0
    }
  });

  const baseUrl = process.env.APP_URL || 'https://ngurrapathways.com.au';

  return {
    url: `${baseUrl}/p/s/${token}`,
    token,
    expiresAt,
    hasPassword: !!options.password,
    maxViews: options.maxViews
  };
}

/**
 * Access portfolio via share link
 */
export async function accessViaShareLink(token, password = null) {
  const link = await prisma.portfolioShareLink.findFirst({
    where: { token },
    include: {
      portfolio: {
        include: {
          projects: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            include: { media: { orderBy: { displayOrder: 'asc' } } }
          },
          user: {
            select: { name: true, profileImageUrl: true }
          }
        }
      }
    }
  });

  if (!link) {
    throw new Error('Invalid share link');
  }

  if (link.expiresAt && new Date() > link.expiresAt) {
    throw new Error('Share link has expired');
  }

  if (link.maxViews && link.viewCount >= link.maxViews) {
    throw new Error('Share link view limit reached');
  }

  if (link.password) {
    if (!password) {
      throw new Error('Password required');
    }
    const valid = await verifyPassword(password, link.password);
    if (!valid) {
      throw new Error('Invalid password');
    }
  }

  // Increment view count
  await prisma.portfolioShareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 } }
  });

  return formatPublicPortfolioResponse(link.portfolio);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(testHash));
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Track portfolio view
 */
async function trackPortfolioView(portfolioId, viewerId) {
  await prisma.portfolioView.create({
    data: {
      portfolioId,
      viewerId,
      viewedAt: new Date(),
      referrer: null // Would come from request headers
    }
  }).catch(() => {
    // Table might not exist
  });

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { viewCount: { increment: 1 } }
  }).catch(() => {});
}

/**
 * Get portfolio analytics
 */
export async function getAnalytics(userId, dateRange = 30) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId },
    include: { projects: { where: { isActive: true } } }
  });

  if (!portfolio) return null;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  // Get views
  let views = [];
  try {
    views = await prisma.portfolioView.findMany({
      where: {
        portfolioId: portfolio.id,
        viewedAt: { gte: startDate }
      },
      orderBy: { viewedAt: 'asc' }
    });
  } catch {
    // Table might not exist
  }

  // Calculate metrics
  const totalViews = portfolio.viewCount || 0;
  const periodViews = views.length;
  const uniqueViewers = new Set(views.filter(v => v.viewerId).map(v => v.viewerId)).size;

  // Views by day
  const viewsByDay = views.reduce((acc, view) => {
    const day = view.viewedAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  // Project views
  const projectViewCounts = portfolio.projects.map(p => ({
    projectId: p.id,
    title: p.title,
    views: p.viewCount || 0
  }));

  return {
    overview: {
      totalViews,
      periodViews,
      uniqueViewers,
      projectCount: portfolio.projects.length,
      isPublic: portfolio.isPublic
    },
    viewsByDay,
    topProjects: projectViewCounts
      .sort((a, b) => b.views - a.views)
      .slice(0, 5),
    dateRange,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Track project view
 */
export async function trackProjectView(projectId, viewerId) {
  await prisma.portfolioProject.update({
    where: { id: projectId },
    data: { viewCount: { increment: 1 } }
  }).catch(() => {});
}

// ============================================================================
// HELPERS
// ============================================================================

function getS3PublicUrl(s3Key) {
  const cdnDomain = process.env.CDN_DOMAIN;
  if (cdnDomain) {
    return `https://${cdnDomain}/${s3Key}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${s3Key}`;
}

function formatPortfolioResponse(portfolio) {
  return {
    id: portfolio.id,
    userId: portfolio.userId,
    displayName: portfolio.displayName,
    headline: portfolio.headline,
    bio: portfolio.bio,
    slug: portfolio.slug,
    template: portfolio.template,
    customColors: portfolio.customColors,
    socialLinks: portfolio.socialLinks,
    contactEmail: portfolio.contactEmail,
    showEmail: portfolio.showEmail,
    isPublic: portfolio.isPublic,
    customDomain: portfolio.customDomain,
    viewCount: portfolio.viewCount || 0,
    projects: portfolio.projects?.map(formatProjectResponse),
    createdAt: portfolio.createdAt,
    updatedAt: portfolio.updatedAt
  };
}

function formatPublicPortfolioResponse(portfolio) {
  return {
    displayName: portfolio.displayName,
    headline: portfolio.headline,
    bio: portfolio.bio,
    template: portfolio.template,
    customColors: portfolio.customColors,
    socialLinks: portfolio.socialLinks,
    contactEmail: portfolio.showEmail ? portfolio.contactEmail : null,
    user: portfolio.user,
    projects: portfolio.projects?.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      shortDescription: p.shortDescription,
      category: p.category,
      technologies: p.technologies,
      projectUrl: p.projectUrl,
      role: p.role,
      startDate: p.startDate,
      endDate: p.endDate,
      isOngoing: p.isOngoing,
      highlights: p.highlights,
      isFeatured: p.isFeatured,
      media: p.media?.map(formatMediaResponse)
    }))
  };
}

function formatProjectResponse(project) {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    shortDescription: project.shortDescription,
    category: project.category,
    technologies: project.technologies,
    projectUrl: project.projectUrl,
    sourceUrl: project.sourceUrl,
    startDate: project.startDate,
    endDate: project.endDate,
    isOngoing: project.isOngoing,
    role: project.role,
    teamSize: project.teamSize,
    highlights: project.highlights,
    displayOrder: project.displayOrder,
    isPublic: project.isPublic,
    isFeatured: project.isFeatured,
    viewCount: project.viewCount || 0,
    media: project.media?.map(formatMediaResponse),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

function formatMediaResponse(media) {
  return {
    id: media.id,
    type: media.type,
    url: media.url,
    title: media.title,
    caption: media.caption,
    altText: media.altText,
    displayOrder: media.displayOrder,
    isCover: media.isCover
  };
}

export default {
  // Portfolio management
  createOrUpdatePortfolio,
  getPortfolioByUserId,
  getPortfolioBySlug,
  checkSlugAvailability,
  
  // Project management
  addProject,
  updateProject,
  deleteProject,
  reorderProjects,
  getProjects,
  
  // Media
  getMediaUploadUrl,
  confirmMediaUpload,
  updateMedia,
  deleteMedia,
  reorderMedia,
  
  // Templates
  getTemplates,
  applyTemplate,
  getTemplatePreview,
  
  // Sharing
  getPublicUrl,
  createShareableLink,
  accessViaShareLink,
  
  // Analytics
  getAnalytics,
  trackProjectView,
  
  // Config
  TEMPLATES,
  PROJECT_CATEGORIES,
  PORTFOLIO_CONFIG
};

export {};
