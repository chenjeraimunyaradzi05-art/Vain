// @ts-nocheck
/**
 * Apprenticeship & Traineeship Module
 * 
 * Specialized support for Australian apprenticeships including:
 * - Apprenticeship job listings
 * - Training plan tracking
 * - Mentor assignment for apprentices
 * - Government incentive information
 * - Completion certification
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prismaClient = new PrismaClient();
const prisma = prismaClient as any;

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Australian Apprenticeship Types
 */
export const APPRENTICESHIP_TYPES = {
  APPRENTICESHIP: {
    id: 'apprenticeship',
    label: 'Apprenticeship',
    description: 'Traditional trade apprenticeship (usually 3-4 years)',
    typicalDuration: 48, // months
    industries: ['construction', 'automotive', 'electrical', 'plumbing', 'hospitality']
  },
  TRAINEESHIP: {
    id: 'traineeship',
    label: 'Traineeship',
    description: 'Vocational traineeship (usually 1-2 years)',
    typicalDuration: 18,
    industries: ['business', 'retail', 'healthcare', 'it', 'community-services']
  },
  SCHOOL_BASED: {
    id: 'school-based',
    label: 'School-Based Apprenticeship',
    description: 'Part-time while completing Year 11-12',
    typicalDuration: 24,
    industries: ['all']
  },
  MATURE_AGE: {
    id: 'mature-age',
    label: 'Mature Age Apprenticeship',
    description: 'For adults 21+ entering a trade',
    typicalDuration: 36,
    industries: ['all']
  },
  INDIGENOUS: {
    id: 'indigenous',
    label: 'Indigenous Apprenticeship',
    description: 'Apprenticeship with cultural support for First Nations peoples',
    typicalDuration: 48,
    industries: ['all']
  }
};

/**
 * Australian trades and qualifications
 */
export const TRADES = {
  // Construction
  'carpentry': { name: 'Carpentry', cert: 'Certificate III in Carpentry (CPC30220)', duration: 48 },
  'plumbing': { name: 'Plumbing', cert: 'Certificate III in Plumbing (CPC32420)', duration: 48 },
  'electrical': { name: 'Electrical', cert: 'Certificate III in Electrotechnology (UEE30820)', duration: 48 },
  'bricklaying': { name: 'Bricklaying', cert: 'Certificate III in Bricklaying/Blocklaying (CPC33020)', duration: 48 },
  'painting': { name: 'Painting & Decorating', cert: 'Certificate III in Painting and Decorating (CPC30620)', duration: 36 },
  
  // Automotive
  'automotive-mechanic': { name: 'Automotive Mechanic', cert: 'Certificate III in Light Vehicle Mechanical Technology (AUR30620)', duration: 48 },
  'panel-beating': { name: 'Panel Beating', cert: 'Certificate III in Automotive Body Repair Technology (AUR32120)', duration: 48 },
  
  // Hospitality
  'chef': { name: 'Commercial Cookery', cert: 'Certificate III in Commercial Cookery (SIT30821)', duration: 36 },
  'baker': { name: 'Baking', cert: 'Certificate III in Baking (FBP30521)', duration: 36 },
  
  // Other
  'hairdressing': { name: 'Hairdressing', cert: 'Certificate III in Hairdressing (SHB30416)', duration: 36 },
  'horticulture': { name: 'Horticulture', cert: 'Certificate III in Horticulture (AHC30716)', duration: 36 },
  'childcare': { name: 'Early Childhood Education', cert: 'Certificate III in Early Childhood Education and Care (CHC30121)', duration: 18 },
  'aged-care': { name: 'Aged Care', cert: 'Certificate III in Individual Support (CHC33015)', duration: 12 },
  'it-support': { name: 'IT Support', cert: 'Certificate III in Information Technology (ICT30120)', duration: 18 }
};

/**
 * Government incentives for employers and apprentices
 */
export const GOVERNMENT_INCENTIVES = {
  employer: [
    {
      id: 'boosting-apprenticeship-commencements',
      name: 'Boosting Apprenticeship Commencements',
      description: '50% wage subsidy for new apprentices (up to $7,000/quarter)',
      eligibility: 'Employers of new apprentices commenced from October 2020',
      amount: 'Up to $28,000 over 12 months',
      url: 'https://www.dese.gov.au/boosting-apprenticeship-commencements'
    },
    {
      id: 'indigenous-apprenticeship-wage-subsidy',
      name: 'Indigenous Apprenticeship Wage Subsidy',
      description: 'Additional wage subsidy for Indigenous apprentices',
      eligibility: 'Employers of Indigenous Australian apprentices',
      amount: 'Up to $4,000 per year',
      url: 'https://www.niaa.gov.au'
    },
    {
      id: 'australian-apprenticeship-incentive',
      name: 'Australian Apprenticeship Incentive System',
      description: 'Priority occupation incentive payments',
      eligibility: 'Apprentices in priority occupations',
      amount: 'Up to $5,000',
      url: 'https://www.australianapprenticeships.gov.au'
    }
  ],
  apprentice: [
    {
      id: 'living-away-from-home-allowance',
      name: 'Living Away From Home Allowance',
      description: 'Financial support for apprentices who need to live away from home',
      eligibility: 'First and second year apprentices living away from parents',
      amount: 'Up to $77.17/week',
      url: 'https://www.australianapprenticeships.gov.au/lafha'
    },
    {
      id: 'trade-support-loan',
      name: 'Trade Support Loan',
      description: 'Income-contingent loan to help with costs during apprenticeship',
      eligibility: 'Australian apprentices in Certificate III or IV',
      amount: 'Up to $21,426 over life of apprenticeship',
      url: 'https://www.australianapprenticeships.gov.au/trade-support-loans'
    },
    {
      id: 'tools-for-trade',
      name: 'Tools for Your Trade',
      description: 'Tax deduction for tools and equipment',
      eligibility: 'All apprentices',
      amount: 'Tax deductible purchases',
      url: 'https://www.ato.gov.au'
    },
    {
      id: 'indigenous-education-support',
      name: 'ABSTUDY',
      description: 'Living allowance for Indigenous Australian students and apprentices',
      eligibility: 'Aboriginal and Torres Strait Islander apprentices',
      amount: 'Variable based on circumstances',
      url: 'https://www.servicesaustralia.gov.au/abstudy'
    }
  ]
};

// ============================================================================
// APPRENTICESHIP LISTINGS
// ============================================================================

/**
 * Create an apprenticeship listing
 */
export async function createApprenticeshipListing(employerId, listingData) {
  const trade = TRADES[listingData.tradeCode];
  
  const listing = await prisma.apprenticeshipListing.create({
    data: {
      employerId,
      title: listingData.title || `${trade?.name || listingData.trade} Apprenticeship`,
      trade: listingData.trade,
      tradeCode: listingData.tradeCode,
      type: listingData.type || 'apprenticeship',
      qualification: trade?.cert || listingData.qualification,
      duration: trade?.duration || listingData.duration,
      location: listingData.location,
      isRemote: listingData.isRemote ?? false,
      description: listingData.description,
      requirements: listingData.requirements || [],
      benefits: listingData.benefits || [],
      wageInfo: listingData.wageInfo || getDefaultWageInfo(listingData.type),
      rtoPartner: listingData.rtoPartner, // Registered Training Organization
      startDate: listingData.startDate ? new Date(listingData.startDate) : null,
      applicationDeadline: listingData.applicationDeadline ? new Date(listingData.applicationDeadline) : null,
      positions: listingData.positions || 1,
      isIndigenousFriendly: listingData.isIndigenousFriendly ?? false,
      culturalSupport: listingData.culturalSupport,
      status: 'draft'
    }
  });

  return formatListingResponse(listing);
}

/**
 * Get apprenticeship listings with filters
 */
export async function getApprenticeshipListings(filters = {}) {
  const {
    trade,
    type,
    location,
    isIndigenousFriendly,
    status = 'open',
    page = 1,
    limit = 20
  } = filters;

  const where = {};
  
  if (trade) where.tradeCode = trade;
  if (type) where.type = type;
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (isIndigenousFriendly) where.isIndigenousFriendly = true;
  if (status) where.status = status;

  const [listings, total] = await Promise.all([
    prisma.apprenticeshipListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        employer: {
          select: { id: true, name: true, logo: true }
        }
      }
    }),
    prisma.apprenticeshipListing.count({ where })
  ]);

  return {
    listings: listings.map(formatListingResponse),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get default wage info based on apprenticeship type
 */
function getDefaultWageInfo(type) {
  // Australian apprentice minimum wages (approximate)
  return {
    year1: { min: 14.77, max: 17.00, basis: 'hourly' },
    year2: { min: 17.76, max: 20.00, basis: 'hourly' },
    year3: { min: 22.59, max: 25.00, basis: 'hourly' },
    year4: { min: 27.54, max: 30.00, basis: 'hourly' },
    note: 'Wages vary by award and may be higher. Check with Fair Work.'
  };
}

// ============================================================================
// TRAINING PLAN TRACKING
// ============================================================================

/**
 * Create training plan for an apprentice
 */
export async function createTrainingPlan(apprenticeshipId, planData) {
  const plan = await prisma.trainingPlan.create({
    data: {
      apprenticeshipId,
      apprenticeId: planData.apprenticeId,
      rtoId: planData.rtoId,
      rtoName: planData.rtoName,
      qualification: planData.qualification,
      startDate: new Date(planData.startDate),
      expectedEndDate: new Date(planData.expectedEndDate),
      status: 'active',
      units: planData.units || [],
      competencies: planData.competencies || [],
      workplaceSupport: planData.workplaceSupport
    }
  });

  return formatTrainingPlanResponse(plan);
}

/**
 * Add a unit/competency to training plan
 */
export async function addTrainingUnit(planId, unitData) {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId }
  });

  if (!plan) {
    throw new Error('Training plan not found');
  }

  const unit = {
    id: uuid(),
    code: unitData.code,
    name: unitData.name,
    type: unitData.type || 'core', // core or elective
    deliveryMode: unitData.deliveryMode || 'workplace', // workplace, classroom, online
    status: 'not_started',
    scheduledDate: unitData.scheduledDate,
    assessments: []
  };

  const units = [...(plan.units || []), unit];

  await prisma.trainingPlan.update({
    where: { id: planId },
    data: { units }
  });

  return unit;
}

/**
 * Update unit progress
 */
export async function updateUnitProgress(planId, unitId, progressData) {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId }
  });

  if (!plan) {
    throw new Error('Training plan not found');
  }

  const units = (plan.units || []).map(unit => {
    if (unit.id === unitId) {
      return {
        ...unit,
        status: progressData.status || unit.status,
        completedDate: progressData.completedDate,
        result: progressData.result, // competent, not_yet_competent
        assessorNotes: progressData.assessorNotes,
        assessments: progressData.assessments || unit.assessments
      };
    }
    return unit;
  });

  const completedUnits = units.filter(u => u.status === 'completed').length;
  const totalUnits = units.length;
  const progress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  await prisma.trainingPlan.update({
    where: { id: planId },
    data: { 
      units,
      progress,
      updatedAt: new Date()
    }
  });

  return { unitId, status: progressData.status, overallProgress: progress };
}

/**
 * Get training plan with progress
 */
export async function getTrainingPlan(planId) {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      apprentice: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!plan) return null;

  return formatTrainingPlanResponse(plan);
}

/**
 * Get training progress summary
 */
export async function getTrainingProgress(apprenticeId) {
  const plans = await prisma.trainingPlan.findMany({
    where: { apprenticeId },
    orderBy: { startDate: 'desc' }
  });

  return plans.map(plan => {
    const units = plan.units || [];
    const completed = units.filter(u => u.status === 'completed').length;
    const inProgress = units.filter(u => u.status === 'in_progress').length;
    
    return {
      planId: plan.id,
      qualification: plan.qualification,
      rtoName: plan.rtoName,
      startDate: plan.startDate,
      expectedEndDate: plan.expectedEndDate,
      status: plan.status,
      progress: {
        completed,
        inProgress,
        notStarted: units.length - completed - inProgress,
        total: units.length,
        percentage: plan.progress || 0
      }
    };
  });
}

// ============================================================================
// MENTOR ASSIGNMENT
// ============================================================================

/**
 * Assign workplace mentor to apprentice
 */
export async function assignMentor(apprenticeshipId, mentorData) {
  const assignment = await prisma.apprenticeMentor.create({
    data: {
      apprenticeshipId,
      apprenticeId: mentorData.apprenticeId,
      mentorId: mentorData.mentorId,
      mentorName: mentorData.mentorName,
      mentorRole: mentorData.mentorRole,
      mentorContact: mentorData.mentorContact,
      startDate: new Date(),
      responsibilities: mentorData.responsibilities || [
        'Provide on-the-job training and guidance',
        'Monitor progress and provide feedback',
        'Support competency development',
        'Liaise with RTO assessors',
        'Ensure workplace safety'
      ],
      meetingFrequency: mentorData.meetingFrequency || 'weekly',
      status: 'active'
    }
  });

  // Notify both parties
  await createMentorshipNotification(assignment);

  return assignment;
}

/**
 * Log mentoring session
 */
export async function logMentoringSession(mentorAssignmentId, sessionData) {
  const session = await prisma.mentoringSession.create({
    data: {
      mentorAssignmentId,
      date: new Date(sessionData.date),
      duration: sessionData.duration, // minutes
      type: sessionData.type || 'one-on-one', // one-on-one, observation, assessment
      topics: sessionData.topics || [],
      skillsWorkedOn: sessionData.skillsWorkedOn || [],
      feedback: sessionData.feedback,
      apprenticeProgress: sessionData.apprenticeProgress,
      nextSteps: sessionData.nextSteps,
      concernsRaised: sessionData.concernsRaised
    }
  });

  // Update mentor assignment with last session date
  await prisma.apprenticeMentor.update({
    where: { id: mentorAssignmentId },
    data: { lastSessionDate: new Date(sessionData.date) }
  });

  return session;
}

/**
 * Get mentoring history
 */
export async function getMentoringHistory(apprenticeId) {
  const assignments = await prisma.apprenticeMentor.findMany({
    where: { apprenticeId },
    include: {
      sessions: {
        orderBy: { date: 'desc' }
      }
    }
  });

  return assignments.map(a => ({
    id: a.id,
    mentorName: a.mentorName,
    mentorRole: a.mentorRole,
    startDate: a.startDate,
    status: a.status,
    sessionCount: a.sessions.length,
    lastSession: a.sessions[0] || null,
    totalHours: Math.round(a.sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60)
  }));
}

async function createMentorshipNotification(assignment) {
  // Notify apprentice
  await prisma.notification.create({
    data: {
      userId: assignment.apprenticeId,
      type: 'MENTOR_ASSIGNED',
      title: 'Workplace Mentor Assigned',
      message: `${assignment.mentorName} has been assigned as your workplace mentor.`,
      metadata: { mentorAssignmentId: assignment.id }
    }
  }).catch(() => {});

  // Notify mentor if they're a platform user
  if (assignment.mentorId) {
    await prisma.notification.create({
      data: {
        userId: assignment.mentorId,
        type: 'MENTEE_ASSIGNED',
        title: 'New Apprentice Assigned',
        message: 'You have been assigned as a workplace mentor for a new apprentice.',
        metadata: { mentorAssignmentId: assignment.id }
      }
    }).catch(() => {});
  }
}

// ============================================================================
// GOVERNMENT INCENTIVES
// ============================================================================

/**
 * Get applicable incentives for an apprenticeship
 */
export function getApplicableIncentives(apprenticeshipData) {
  const { type, isIndigenous, trade, apprenticeAge } = apprenticeshipData;
  
  const applicable = {
    employer: [],
    apprentice: []
  };

  // Always include base incentives
  applicable.employer.push(GOVERNMENT_INCENTIVES.employer[0]); // Boosting Apprenticeship Commencements
  applicable.employer.push(GOVERNMENT_INCENTIVES.employer[2]); // Australian Apprenticeship Incentive

  // Indigenous-specific
  if (isIndigenous) {
    applicable.employer.push(GOVERNMENT_INCENTIVES.employer[1]); // Indigenous Wage Subsidy
    applicable.apprentice.push(
      GOVERNMENT_INCENTIVES.apprentice.find(i => i.id === 'indigenous-education-support')
    );
  }

  // Standard apprentice incentives
  applicable.apprentice.push(GOVERNMENT_INCENTIVES.apprentice[0]); // Living Away From Home
  applicable.apprentice.push(GOVERNMENT_INCENTIVES.apprentice[1]); // Trade Support Loan
  applicable.apprentice.push(GOVERNMENT_INCENTIVES.apprentice[2]); // Tools for Trade

  // Filter out undefined
  applicable.employer = applicable.employer.filter(Boolean);
  applicable.apprentice = applicable.apprentice.filter(Boolean);

  return applicable;
}

/**
 * Get all incentive information
 */
export function getAllIncentives() {
  return GOVERNMENT_INCENTIVES;
}

/**
 * Calculate estimated incentives value
 */
export function calculateIncentivesValue(apprenticeshipData) {
  const incentives = getApplicableIncentives(apprenticeshipData);
  
  let employerTotal = 0;
  let apprenticeTotal = 0;

  // Estimate employer incentives (rough values)
  if (incentives.employer.some(i => i.id === 'boosting-apprenticeship-commencements')) {
    employerTotal += 28000;
  }
  if (incentives.employer.some(i => i.id === 'indigenous-apprenticeship-wage-subsidy')) {
    employerTotal += 16000; // $4,000 x 4 years
  }
  if (incentives.employer.some(i => i.id === 'australian-apprenticeship-incentive')) {
    employerTotal += 5000;
  }

  // Estimate apprentice incentives
  if (incentives.apprentice.some(i => i.id === 'trade-support-loan')) {
    apprenticeTotal += 21426;
  }
  if (incentives.apprentice.some(i => i.id === 'living-away-from-home-allowance')) {
    apprenticeTotal += 4000; // First year estimate
  }

  return {
    employerEstimate: employerTotal,
    apprenticeEstimate: apprenticeTotal,
    totalEstimate: employerTotal + apprenticeTotal,
    note: 'Estimates only. Actual amounts depend on eligibility and current program availability.'
  };
}

// ============================================================================
// COMPLETION CERTIFICATION
// ============================================================================

/**
 * Record apprenticeship completion
 */
export async function recordCompletion(apprenticeshipId, completionData) {
  const apprenticeship = await prisma.apprenticeship.findUnique({
    where: { id: apprenticeshipId },
    include: { trainingPlan: true }
  });

  if (!apprenticeship) {
    throw new Error('Apprenticeship not found');
  }

  // Create completion record
  const completion = await prisma.apprenticeshipCompletion.create({
    data: {
      apprenticeshipId,
      apprenticeId: apprenticeship.apprenticeId,
      qualification: completionData.qualification || apprenticeship.trainingPlan?.qualification,
      completionDate: new Date(completionData.completionDate),
      certificateNumber: completionData.certificateNumber,
      issuingBody: completionData.issuingBody || apprenticeship.trainingPlan?.rtoName,
      finalResult: completionData.finalResult || 'completed',
      employerFeedback: completionData.employerFeedback,
      mentorFeedback: completionData.mentorFeedback,
      achievements: completionData.achievements || []
    }
  });

  // Update apprenticeship status
  await prisma.apprenticeship.update({
    where: { id: apprenticeshipId },
    data: { status: 'completed', completedAt: new Date() }
  });

  // Create milestone
  await prisma.careerMilestone.create({
    data: {
      userId: apprenticeship.apprenticeId,
      type: 'certification',
      title: `Completed ${completionData.qualification || 'Apprenticeship'}`,
      description: `Successfully completed apprenticeship with ${apprenticeship.employerName || 'employer'}`,
      achievedAt: new Date(completionData.completionDate),
      category: 'learning'
    }
  }).catch(() => {});

  return formatCompletionResponse(completion);
}

/**
 * Generate completion certificate data
 */
export async function generateCertificateData(completionId) {
  const completion = await prisma.apprenticeshipCompletion.findUnique({
    where: { id: completionId },
    include: {
      apprenticeship: true,
      apprentice: {
        select: { name: true }
      }
    }
  });

  if (!completion) {
    throw new Error('Completion record not found');
  }

  return {
    certificateNumber: completion.certificateNumber,
    recipientName: completion.apprentice.name,
    qualification: completion.qualification,
    completionDate: completion.completionDate,
    issuingBody: completion.issuingBody,
    employerName: completion.apprenticeship?.employerName,
    verificationUrl: `${process.env.APP_URL}/verify/certificate/${completion.certificateNumber}`,
    achievements: completion.achievements
  };
}

/**
 * Verify certificate
 */
export async function verifyCertificate(certificateNumber) {
  const completion = await prisma.apprenticeshipCompletion.findFirst({
    where: { certificateNumber },
    include: {
      apprentice: { select: { name: true } }
    }
  });

  if (!completion) {
    return { valid: false, error: 'Certificate not found' };
  }

  return {
    valid: true,
    recipientName: completion.apprentice.name,
    qualification: completion.qualification,
    completionDate: completion.completionDate,
    issuingBody: completion.issuingBody
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatListingResponse(listing) {
  const typeInfo = APPRENTICESHIP_TYPES[listing.type?.toUpperCase()];
  
  return {
    id: listing.id,
    title: listing.title,
    trade: listing.trade,
    tradeCode: listing.tradeCode,
    type: listing.type,
    typeInfo: typeInfo ? { label: typeInfo.label, description: typeInfo.description } : null,
    qualification: listing.qualification,
    duration: listing.duration,
    location: listing.location,
    isRemote: listing.isRemote,
    description: listing.description,
    requirements: listing.requirements,
    benefits: listing.benefits,
    wageInfo: listing.wageInfo,
    rtoPartner: listing.rtoPartner,
    startDate: listing.startDate,
    applicationDeadline: listing.applicationDeadline,
    positions: listing.positions,
    isIndigenousFriendly: listing.isIndigenousFriendly,
    culturalSupport: listing.culturalSupport,
    status: listing.status,
    employer: listing.employer,
    createdAt: listing.createdAt
  };
}

function formatTrainingPlanResponse(plan) {
  const units = plan.units || [];
  const completed = units.filter(u => u.status === 'completed');
  const inProgress = units.filter(u => u.status === 'in_progress');

  return {
    id: plan.id,
    qualification: plan.qualification,
    rtoName: plan.rtoName,
    startDate: plan.startDate,
    expectedEndDate: plan.expectedEndDate,
    status: plan.status,
    units,
    progress: {
      completed: completed.length,
      inProgress: inProgress.length,
      total: units.length,
      percentage: plan.progress || 0
    },
    apprentice: plan.apprentice,
    competencies: plan.competencies,
    workplaceSupport: plan.workplaceSupport
  };
}

function formatCompletionResponse(completion) {
  return {
    id: completion.id,
    qualification: completion.qualification,
    completionDate: completion.completionDate,
    certificateNumber: completion.certificateNumber,
    issuingBody: completion.issuingBody,
    finalResult: completion.finalResult,
    achievements: completion.achievements
  };
}

export default {
  // Listings
  createApprenticeshipListing,
  getApprenticeshipListings,
  
  // Training plans
  createTrainingPlan,
  addTrainingUnit,
  updateUnitProgress,
  getTrainingPlan,
  getTrainingProgress,
  
  // Mentoring
  assignMentor,
  logMentoringSession,
  getMentoringHistory,
  
  // Incentives
  getApplicableIncentives,
  getAllIncentives,
  calculateIncentivesValue,
  
  // Completion
  recordCompletion,
  generateCertificateData,
  verifyCertificate,
  
  // Config
  APPRENTICESHIP_TYPES,
  TRADES,
  GOVERNMENT_INCENTIVES
};

export {};
