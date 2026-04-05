// @ts-nocheck
/**
 * Skills Verification System
 * 
 * Comprehensive skill verification including:
 * - Skill assessment tests
 * - Open Badges credentials
 * - Peer endorsements
 * - Employer verification requests
 * - Verification badges
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

const prismaClient = new PrismaClient();
const prisma = prismaClient as any;

// ============================================================================
// CONFIGURATION
// ============================================================================

const SKILL_LEVELS = {
  BEGINNER: { value: 1, label: 'Beginner', description: 'Basic understanding' },
  INTERMEDIATE: { value: 2, label: 'Intermediate', description: 'Working knowledge' },
  ADVANCED: { value: 3, label: 'Advanced', description: 'Expert level' },
  EXPERT: { value: 4, label: 'Expert', description: 'Industry leader' }
};

const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

const VERIFICATION_TYPES = {
  SELF_REPORTED: 'self_reported',
  PEER_ENDORSED: 'peer_endorsed',
  ASSESSMENT_PASSED: 'assessment_passed',
  CREDENTIAL_VERIFIED: 'credential_verified',
  EMPLOYER_VERIFIED: 'employer_verified'
};

const BADGE_LEVELS = {
  BRONZE: { threshold: 1, icon: '🥉', color: '#CD7F32' },
  SILVER: { threshold: 3, icon: '🥈', color: '#C0C0C0' },
  GOLD: { threshold: 5, icon: '🥇', color: '#FFD700' },
  PLATINUM: { threshold: 10, icon: '💎', color: '#E5E4E2' }
};

// ============================================================================
// SKILL ASSESSMENTS
// ============================================================================

/**
 * Available skill assessments
 */
const SKILL_ASSESSMENTS = {
  'javascript': {
    name: 'JavaScript Fundamentals',
    category: 'Programming',
    duration: 30, // minutes
    questionCount: 20,
    passingScore: 70,
    levels: ['beginner', 'intermediate', 'advanced']
  },
  'python': {
    name: 'Python Programming',
    category: 'Programming',
    duration: 30,
    questionCount: 20,
    passingScore: 70,
    levels: ['beginner', 'intermediate', 'advanced']
  },
  'excel': {
    name: 'Microsoft Excel',
    category: 'Software',
    duration: 25,
    questionCount: 15,
    passingScore: 65,
    levels: ['beginner', 'intermediate', 'advanced']
  },
  'customer-service': {
    name: 'Customer Service Skills',
    category: 'Soft Skills',
    duration: 20,
    questionCount: 15,
    passingScore: 75,
    levels: ['intermediate']
  },
  'project-management': {
    name: 'Project Management',
    category: 'Management',
    duration: 35,
    questionCount: 25,
    passingScore: 70,
    levels: ['intermediate', 'advanced']
  },
  'first-aid': {
    name: 'First Aid Knowledge',
    category: 'Safety',
    duration: 20,
    questionCount: 20,
    passingScore: 80,
    levels: ['beginner']
  },
  'forklift-safety': {
    name: 'Forklift Safety',
    category: 'Safety',
    duration: 15,
    questionCount: 15,
    passingScore: 85,
    levels: ['beginner']
  },
  'cultural-awareness': {
    name: 'Cultural Awareness',
    category: 'Soft Skills',
    duration: 20,
    questionCount: 15,
    passingScore: 70,
    levels: ['beginner', 'intermediate']
  }
};

/**
 * Get available assessments
 */
export function getAvailableAssessments(category = null) {
  let assessments = Object.entries(SKILL_ASSESSMENTS).map(([id, data]) => ({
    id,
    ...data
  }));

  if (category) {
    assessments = assessments.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }

  return assessments;
}

/**
 * Start a skill assessment
 */
export async function startAssessment(userId, assessmentId, level = 'intermediate') {
  const assessment = SKILL_ASSESSMENTS[assessmentId];
  if (!assessment) {
    throw new Error('Assessment not found');
  }

  if (!assessment.levels.includes(level)) {
    throw new Error(`Level ${level} not available for this assessment`);
  }

  // Check if user has pending assessment
  const pending = await prisma.skillAssessment.findFirst({
    where: {
      userId,
      assessmentId,
      status: 'in_progress'
    }
  });

  if (pending) {
    // Return existing session
    return {
      sessionId: pending.id,
      assessmentId,
      name: assessment.name,
      duration: assessment.duration,
      questionCount: assessment.questionCount,
      startedAt: pending.startedAt,
      expiresAt: new Date(pending.startedAt.getTime() + assessment.duration * 60 * 1000)
    };
  }

  // Generate questions (in production, fetch from question bank)
  const questions = await generateAssessmentQuestions(assessmentId, level, assessment.questionCount);

  // Create assessment session
  const session = await prisma.skillAssessment.create({
    data: {
      userId,
      assessmentId,
      level,
      status: 'in_progress',
      questions: questions.map(q => q.id),
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + assessment.duration * 60 * 1000)
    }
  });

  return {
    sessionId: session.id,
    assessmentId,
    name: assessment.name,
    level,
    duration: assessment.duration,
    questionCount: assessment.questionCount,
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      type: q.type
    })),
    startedAt: session.startedAt,
    expiresAt: session.expiresAt
  };
}

/**
 * Submit assessment answers
 */
export async function submitAssessment(userId, sessionId, answers) {
  const session = await prisma.skillAssessment.findFirst({
    where: { id: sessionId, userId }
  });

  if (!session) {
    throw new Error('Assessment session not found');
  }

  if (session.status !== 'in_progress') {
    throw new Error('Assessment already completed or expired');
  }

  if (new Date() > session.expiresAt) {
    await prisma.skillAssessment.update({
      where: { id: sessionId },
      data: { status: 'expired' }
    });
    throw new Error('Assessment has expired');
  }

  // Grade the assessment
  const questions = await getQuestionsById(session.questions);
  let correct = 0;
  const results = [];

  for (const question of questions) {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correctAnswer;
    if (isCorrect) correct++;
    
    results.push({
      questionId: question.id,
      userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation
    });
  }

  const score = Math.round((correct / questions.length) * 100);
  const assessment = SKILL_ASSESSMENTS[session.assessmentId];
  const passed = score >= assessment.passingScore;

  // Update session
  await prisma.skillAssessment.update({
    where: { id: sessionId },
    data: {
      status: passed ? 'passed' : 'failed',
      score,
      answers,
      completedAt: new Date()
    }
  });

  // If passed, add verification to skill
  if (passed) {
    await addSkillVerification(userId, session.assessmentId, {
      type: VERIFICATION_TYPES.ASSESSMENT_PASSED,
      score,
      level: session.level,
      assessmentSessionId: sessionId
    });
  }

  return {
    sessionId,
    assessmentId: session.assessmentId,
    level: session.level,
    score,
    passingScore: assessment.passingScore,
    passed,
    correct,
    total: questions.length,
    results,
    verificationAdded: passed
  };
}

/**
 * Generate assessment questions (mock implementation)
 */
async function generateAssessmentQuestions(assessmentId, level, count) {
  // In production, fetch from a question bank database
  const questions = [];
  
  for (let i = 0; i < count; i++) {
    questions.push({
      id: `${assessmentId}-${level}-${i}`,
      question: `Sample question ${i + 1} for ${assessmentId} at ${level} level`,
      type: 'multiple_choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: ['Option A', 'Option B', 'Option C', 'Option D'][Math.floor(Math.random() * 4)],
      explanation: 'Explanation for the correct answer.'
    });
  }

  return questions;
}

/**
 * Get questions by IDs
 */
async function getQuestionsById(questionIds) {
  // In production, fetch from database
  return questionIds.map(id => {
    const parts = id.split('-');
    return {
      id,
      correctAnswer: 'Option A', // Mock - in production, fetch actual correct answers
      explanation: 'Correct answer explanation'
    };
  });
}

// ============================================================================
// OPEN BADGES / CREDENTIALS
// ============================================================================

/**
 * Verify and import an Open Badge credential
 */
export async function verifyCredential(userId, credentialData) {
  const { type, url, rawData } = credentialData;

  let verificationResult;

  switch (type) {
    case 'open_badge':
      verificationResult = await verifyOpenBadge(url || rawData);
      break;
    case 'certificate':
      verificationResult = await verifyCertificate(rawData);
      break;
    case 'micro_credential':
      verificationResult = await verifyMicroCredential(url);
      break;
    default:
      throw new Error('Unknown credential type');
  }

  if (!verificationResult.valid) {
    return {
      success: false,
      error: verificationResult.error || 'Credential verification failed'
    };
  }

  // Store verified credential
  const credential = await prisma.verifiedCredential.create({
    data: {
      userId,
      type,
      issuer: verificationResult.issuer,
      name: verificationResult.name,
      description: verificationResult.description,
      issuedAt: verificationResult.issuedDate,
      expiresAt: verificationResult.expiryDate,
      verificationUrl: url,
      rawData: verificationResult.rawData,
      skills: verificationResult.skills || [],
      status: VERIFICATION_STATUS.VERIFIED,
      verifiedAt: new Date()
    }
  });

  // Add skill verifications for each skill in credential
  for (const skill of verificationResult.skills || []) {
    await addSkillVerification(userId, skill, {
      type: VERIFICATION_TYPES.CREDENTIAL_VERIFIED,
      credentialId: credential.id,
      issuer: verificationResult.issuer
    });
  }

  return {
    success: true,
    credential: {
      id: credential.id,
      name: credential.name,
      issuer: credential.issuer,
      issuedAt: credential.issuedAt,
      skills: credential.skills
    }
  };
}

/**
 * Verify Open Badge 2.0/3.0
 */
async function verifyOpenBadge(badgeUrl) {
  try {
    // Fetch badge assertion
    const response = await fetch(badgeUrl, {
      headers: { 'Accept': 'application/ld+json' }
    });

    if (!response.ok) {
      return { valid: false, error: 'Could not fetch badge' };
    }

    const badge = await response.json();

    // Verify badge structure
    if (!badge['@context'] || !badge.type) {
      return { valid: false, error: 'Invalid badge format' };
    }

    // Verify issuer
    const issuerUrl = typeof badge.issuer === 'string' ? badge.issuer : badge.issuer?.id;
    if (!issuerUrl) {
      return { valid: false, error: 'Missing issuer information' };
    }

    // Fetch and verify issuer (in production, validate issuer signature)
    const issuerResponse = await fetch(issuerUrl, {
      headers: { 'Accept': 'application/ld+json' }
    });
    const issuer = issuerResponse.ok ? await issuerResponse.json() : null;

    // Extract skills from badge criteria or tags
    const skills = extractSkillsFromBadge(badge);

    return {
      valid: true,
      issuer: issuer?.name || badge.issuer?.name || 'Unknown Issuer',
      name: badge.name || badge.badge?.name || 'Unknown Badge',
      description: badge.description || badge.badge?.description,
      issuedDate: badge.issuedOn ? new Date(badge.issuedOn) : new Date(),
      expiryDate: badge.expires ? new Date(badge.expires) : null,
      skills,
      rawData: badge
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Verify certificate (e.g., uploaded PDF with QR code)
 */
async function verifyCertificate(certificateData) {
  // In production, implement certificate verification
  // Could use blockchain verification, issuer API, or QR code verification
  
  return {
    valid: true,
    issuer: certificateData.issuer || 'Certificate Issuer',
    name: certificateData.name || 'Certificate',
    description: certificateData.description,
    issuedDate: certificateData.issuedDate ? new Date(certificateData.issuedDate) : new Date(),
    skills: certificateData.skills || [],
    rawData: certificateData
  };
}

/**
 * Verify micro-credential
 */
async function verifyMicroCredential(url) {
  // In production, implement micro-credential verification
  // Could integrate with specific platforms (Credly, Badgr, etc.)
  
  return {
    valid: true,
    issuer: 'Micro-credential Provider',
    name: 'Micro-credential',
    description: 'Verified micro-credential',
    issuedDate: new Date(),
    skills: [],
    rawData: { url }
  };
}

/**
 * Extract skills from badge metadata
 */
function extractSkillsFromBadge(badge) {
  const skills = [];

  // Check tags
  if (badge.tags) {
    skills.push(...(Array.isArray(badge.tags) ? badge.tags : [badge.tags]));
  }

  // Check alignment (competencies)
  if (badge.alignment) {
    const alignments = Array.isArray(badge.alignment) ? badge.alignment : [badge.alignment];
    for (const alignment of alignments) {
      if (alignment.targetName) {
        skills.push(alignment.targetName);
      }
    }
  }

  // Check criteria for skill keywords
  if (badge.criteria?.narrative) {
    // Simple keyword extraction (in production, use NLP)
    const keywords = extractKeywords(badge.criteria.narrative);
    skills.push(...keywords);
  }

  return [...new Set(skills)].slice(0, 10); // Dedupe and limit
}

function extractKeywords(text) {
  // Simple keyword extraction - in production use NLP
  const commonSkills = [
    'leadership', 'communication', 'teamwork', 'problem-solving',
    'project management', 'data analysis', 'programming', 'design',
    'customer service', 'sales', 'marketing', 'finance'
  ];
  
  const lowerText = text.toLowerCase();
  return commonSkills.filter(skill => lowerText.includes(skill));
}

// ============================================================================
// PEER ENDORSEMENTS
// ============================================================================

/**
 * Request endorsement from a peer
 */
export async function requestEndorsement(userId, skill, endorserEmail, message = null) {
  // Check if user exists with this email
  const endorser = await prisma.user.findFirst({
    where: { email: endorserEmail }
  });

  const request = await prisma.endorsementRequest.create({
    data: {
      userId,
      skill,
      endorserEmail,
      endorserId: endorser?.id,
      message,
      token: uuid(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    }
  });

  // Send email to endorser
  // await sendEndorsementRequestEmail(endorserEmail, request);

  return {
    requestId: request.id,
    skill,
    endorserEmail,
    status: 'pending',
    expiresAt: request.expiresAt
  };
}

/**
 * Submit endorsement for a user's skill
 */
export async function submitEndorsement(token, endorsement) {
  const request = await prisma.endorsementRequest.findFirst({
    where: { token, status: 'pending' }
  });

  if (!request) {
    throw new Error('Invalid or expired endorsement request');
  }

  if (new Date() > request.expiresAt) {
    await prisma.endorsementRequest.update({
      where: { id: request.id },
      data: { status: 'expired' }
    });
    throw new Error('Endorsement request has expired');
  }

  // Create endorsement
  const endorsementRecord = await prisma.skillEndorsement.create({
    data: {
      userId: request.userId,
      skill: request.skill,
      endorserId: request.endorserId,
      endorserEmail: request.endorserEmail,
      endorserName: endorsement.name,
      endorserTitle: endorsement.title,
      endorserCompany: endorsement.company,
      relationship: endorsement.relationship,
      yearsKnown: endorsement.yearsKnown,
      level: endorsement.level,
      comment: endorsement.comment,
      isVerified: !!request.endorserId // Verified if endorser is a platform user
    }
  });

  // Update request status
  await prisma.endorsementRequest.update({
    where: { id: request.id },
    data: { status: 'completed' }
  });

  // Add skill verification
  await addSkillVerification(request.userId, request.skill, {
    type: VERIFICATION_TYPES.PEER_ENDORSED,
    endorsementId: endorsementRecord.id,
    endorserName: endorsement.name
  });

  return {
    success: true,
    endorsementId: endorsementRecord.id
  };
}

/**
 * Get endorsements for a user
 */
export async function getEndorsements(userId, skill = null) {
  const where = { userId };
  if (skill) where.skill = skill;

  const endorsements = await prisma.skillEndorsement.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  // Group by skill
  const bySkill = endorsements.reduce((acc, e) => {
    if (!acc[e.skill]) {
      acc[e.skill] = [];
    }
    acc[e.skill].push({
      id: e.id,
      endorserName: e.endorserName,
      endorserTitle: e.endorserTitle,
      endorserCompany: e.endorserCompany,
      relationship: e.relationship,
      level: e.level,
      comment: e.comment,
      isVerified: e.isVerified,
      createdAt: e.createdAt
    });
    return acc;
  }, {});

  return bySkill;
}

// ============================================================================
// EMPLOYER VERIFICATION
// ============================================================================

/**
 * Request skill verification from employer
 */
export async function requestEmployerVerification(userId, skill, employerDetails) {
  const request = await prisma.employerVerificationRequest.create({
    data: {
      userId,
      skill,
      employerEmail: employerDetails.email,
      employerName: employerDetails.name,
      employerCompany: employerDetails.company,
      employmentDates: employerDetails.dates,
      jobTitle: employerDetails.jobTitle,
      token: uuid(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  // Send verification request email
  // await sendEmployerVerificationEmail(employerDetails.email, request);

  return {
    requestId: request.id,
    skill,
    employerEmail: employerDetails.email,
    status: 'pending'
  };
}

/**
 * Submit employer verification response
 */
export async function submitEmployerVerification(token, verification) {
  const request = await prisma.employerVerificationRequest.findFirst({
    where: { token, status: 'pending' }
  });

  if (!request) {
    throw new Error('Invalid or expired verification request');
  }

  const status = verification.verified ? VERIFICATION_STATUS.VERIFIED : VERIFICATION_STATUS.REJECTED;

  await prisma.employerVerificationRequest.update({
    where: { id: request.id },
    data: {
      status,
      verifiedAt: new Date(),
      verifierResponse: verification
    }
  });

  if (verification.verified) {
    await addSkillVerification(request.userId, request.skill, {
      type: VERIFICATION_TYPES.EMPLOYER_VERIFIED,
      verificationRequestId: request.id,
      employer: request.employerCompany,
      jobTitle: request.jobTitle
    });
  }

  return {
    success: true,
    verified: verification.verified
  };
}

// ============================================================================
// SKILL VERIFICATION MANAGEMENT
// ============================================================================

/**
 * Add verification to a skill
 */
export async function addSkillVerification(userId, skillName, verificationData) {
  // Find or create skill
  let userSkill = await prisma.userSkill.findFirst({
    where: { userId, name: skillName }
  });

  if (!userSkill) {
    userSkill = await prisma.userSkill.create({
      data: {
        userId,
        name: skillName,
        level: 'intermediate',
        yearsExperience: 0
      }
    });
  }

  // Add verification
  const verification = await prisma.skillVerification.create({
    data: {
      userSkillId: userSkill.id,
      userId,
      skillName,
      type: verificationData.type,
      metadata: verificationData,
      verifiedAt: new Date(),
      expiresAt: verificationData.expiresAt
    }
  });

  // Update skill verification count and badge level
  const verificationCount = await prisma.skillVerification.count({
    where: { userSkillId: userSkill.id }
  });

  const badgeLevel = calculateBadgeLevel(verificationCount);

  await prisma.userSkill.update({
    where: { id: userSkill.id },
    data: {
      verificationCount,
      badgeLevel,
      isVerified: verificationCount > 0,
      lastVerifiedAt: new Date()
    }
  });

  return verification;
}

/**
 * Get verification summary for a user's skills
 */
export async function getSkillVerifications(userId) {
  const skills = await prisma.userSkill.findMany({
    where: { userId },
    include: {
      verifications: {
        orderBy: { verifiedAt: 'desc' }
      }
    }
  });

  return skills.map(skill => ({
    id: skill.id,
    name: skill.name,
    level: skill.level,
    isVerified: skill.isVerified,
    verificationCount: skill.verificationCount,
    badgeLevel: skill.badgeLevel,
    badge: skill.badgeLevel ? BADGE_LEVELS[skill.badgeLevel] : null,
    verifications: skill.verifications.map(v => ({
      type: v.type,
      verifiedAt: v.verifiedAt,
      expiresAt: v.expiresAt,
      metadata: v.metadata
    }))
  }));
}

/**
 * Calculate badge level based on verification count
 */
function calculateBadgeLevel(count) {
  if (count >= BADGE_LEVELS.PLATINUM.threshold) return 'PLATINUM';
  if (count >= BADGE_LEVELS.GOLD.threshold) return 'GOLD';
  if (count >= BADGE_LEVELS.SILVER.threshold) return 'SILVER';
  if (count >= BADGE_LEVELS.BRONZE.threshold) return 'BRONZE';
  return null;
}

// ============================================================================
// VERIFICATION BADGES
// ============================================================================

/**
 * Get verification badges for display
 */
export async function getUserBadges(userId) {
  const skills = await prisma.userSkill.findMany({
    where: {
      userId,
      badgeLevel: { not: null }
    },
    orderBy: { verificationCount: 'desc' }
  });

  return skills.map(skill => ({
    skill: skill.name,
    level: skill.badgeLevel,
    badge: BADGE_LEVELS[skill.badgeLevel],
    verificationCount: skill.verificationCount,
    earnedAt: skill.lastVerifiedAt
  }));
}

/**
 * Generate embeddable badge HTML
 */
export function generateBadgeEmbed(userId, skillName, badgeLevel) {
  const badge = BADGE_LEVELS[badgeLevel];
  if (!badge) return null;

  const verifyUrl = `${process.env.APP_URL}/verify/skill/${userId}/${encodeURIComponent(skillName)}`;

  return {
    html: `<a href="${verifyUrl}" target="_blank" rel="noopener">
      <img src="${process.env.APP_URL}/badges/${badgeLevel.toLowerCase()}.png" 
           alt="${skillName} - ${badgeLevel} verified" 
           style="height: 40px;" />
    </a>`,
    url: verifyUrl,
    imageUrl: `${process.env.APP_URL}/badges/${badgeLevel.toLowerCase()}.png`
  };
}

// ============================================================================
// VERIFICATION HISTORY & AUDIT
// ============================================================================

/**
 * Get verification audit trail
 */
export async function getVerificationHistory(userId, options = {}) {
  const { skillName, type, limit = 50 } = options;

  const where = { userId };
  if (skillName) where.skillName = skillName;
  if (type) where.type = type;

  const verifications = await prisma.skillVerification.findMany({
    where,
    orderBy: { verifiedAt: 'desc' },
    take: limit
  });

  return verifications.map(v => ({
    id: v.id,
    skillName: v.skillName,
    type: v.type,
    verifiedAt: v.verifiedAt,
    expiresAt: v.expiresAt,
    isExpired: v.expiresAt && new Date() > v.expiresAt,
    metadata: v.metadata
  }));
}

/**
 * Verify a skill publicly (for verification URLs)
 */
export async function verifySkillPublic(userId, skillName) {
  const skill = await prisma.userSkill.findFirst({
    where: { userId, name: skillName },
    include: {
      verifications: {
        orderBy: { verifiedAt: 'desc' },
        take: 5
      },
      user: {
        select: { name: true }
      }
    }
  });

  if (!skill) {
    return { verified: false, error: 'Skill not found' };
  }

  return {
    verified: skill.isVerified,
    user: skill.user.name,
    skill: skill.name,
    level: skill.level,
    badgeLevel: skill.badgeLevel,
    verificationCount: skill.verificationCount,
    lastVerifiedAt: skill.lastVerifiedAt,
    verifications: skill.verifications.map(v => ({
      type: v.type,
      verifiedAt: v.verifiedAt
    }))
  };
}

export default {
  // Assessments
  getAvailableAssessments,
  startAssessment,
  submitAssessment,
  
  // Credentials
  verifyCredential,
  
  // Endorsements
  requestEndorsement,
  submitEndorsement,
  getEndorsements,
  
  // Employer verification
  requestEmployerVerification,
  submitEmployerVerification,
  
  // Verification management
  addSkillVerification,
  getSkillVerifications,
  
  // Badges
  getUserBadges,
  generateBadgeEmbed,
  
  // History
  getVerificationHistory,
  verifySkillPublic,
  
  // Constants
  SKILL_LEVELS,
  VERIFICATION_STATUS,
  VERIFICATION_TYPES,
  BADGE_LEVELS
};

export {};
