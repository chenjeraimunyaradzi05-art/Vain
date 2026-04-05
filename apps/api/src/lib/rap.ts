/**
 * RAP (Reconciliation Action Plan) Certification Logic
 * 
 * Handles badge awards and certification status based on hiring targets and milestones.
 */

import { prisma } from '../db';

// RAP certification levels based on Indigenous hiring achievement
export const CERTIFICATION_LEVELS = {
  BRONZE: { threshold: 3, label: 'Bronze Partner', description: 'Committed to Indigenous employment' },
  SILVER: { threshold: 10, label: 'Silver Partner', description: 'Strong commitment to Indigenous employment' },
  GOLD: { threshold: 25, label: 'Gold Partner', description: 'Outstanding contribution to Indigenous employment' },
  PLATINUM: { threshold: 50, label: 'Platinum Partner', description: 'Exceptional leader in Indigenous employment' },
};

// Retention milestone bonuses
export const RETENTION_BONUS = {
  MONTH_1: 1,
  MONTH_3: 2,
  MONTH_6: 3,
  YEAR_1: 5,
};

/**
 * Calculate certification points for a company based on placements and retention
 */
export async function calculateCertificationPoints(companyUserId) {
  // Some environments/schemas may not include the RAP-related models.
  // Avoid crashing routes by returning safe defaults.
  if (!prisma?.placementOutcome || typeof prisma.placementOutcome.count !== 'function') {
    return {
      hiredPlacements: 0,
      retentionMilestones: 0,
      totalPoints: 0,
    };
  }

  // Count all HIRED placements for this company
  const hiredPlacements = await prisma.placementOutcome.count({
    where: {
      milestone: 'HIRED',
      application: {
        job: { userId: companyUserId },
      },
    },
  });

  // Count retention milestones for bonus points
  const retentionMilestones = await prisma.placementOutcome.findMany({
    where: {
      milestone: { in: ['MONTH_1', 'MONTH_3', 'MONTH_6', 'YEAR_1'] },
      application: {
        job: { userId: companyUserId },
      },
    },
    select: { milestone: true },
  });

  // Base points from hires
  let totalPoints = hiredPlacements;

  // Add bonus points for retention
  for (const { milestone } of retentionMilestones) {
    totalPoints += RETENTION_BONUS[milestone] || 0;
  }

  return {
    hiredPlacements,
    retentionMilestones: retentionMilestones.length,
    totalPoints,
  };
}

/**
 * Determine the certification level for given points
 */
export function getCertificationLevel(points) {
  if (points >= CERTIFICATION_LEVELS.PLATINUM.threshold) {
    return { level: 'PLATINUM', ...CERTIFICATION_LEVELS.PLATINUM };
  }
  if (points >= CERTIFICATION_LEVELS.GOLD.threshold) {
    return { level: 'GOLD', ...CERTIFICATION_LEVELS.GOLD };
  }
  if (points >= CERTIFICATION_LEVELS.SILVER.threshold) {
    return { level: 'SILVER', ...CERTIFICATION_LEVELS.SILVER };
  }
  if (points >= CERTIFICATION_LEVELS.BRONZE.threshold) {
    return { level: 'BRONZE', ...CERTIFICATION_LEVELS.BRONZE };
  }
  return null;
}

/**
 * Award or update RAP certification badge for a company
 */
export async function updateCertificationBadge(companyUserId) {
  const { totalPoints, hiredPlacements, retentionMilestones } = await calculateCertificationPoints(companyUserId);
  const certification = getCertificationLevel(totalPoints);

  if (!certification) {
    // Not enough points for any certification
    return {
      certified: false,
      totalPoints,
      hiredPlacements,
      retentionMilestones,
      nextLevel: {
        level: 'BRONZE',
        pointsNeeded: CERTIFICATION_LEVELS.BRONZE.threshold - totalPoints,
        ...CERTIFICATION_LEVELS.BRONZE,
      },
    };
  }

  // Update company profile with certification badge
  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
  });

  if (company) {
    await prisma.companyProfile.update({
      where: { userId: companyUserId },
      data: {
        rapCertificationLevel: certification.level,
        rapCertifiedAt: company.rapCertifiedAt || new Date(),
        rapPoints: totalPoints,
      },
    });
  }

  // Determine next level
  let nextLevel: any = null;
  if (certification.level === 'BRONZE') {
    nextLevel = {
      level: 'SILVER',
      pointsNeeded: CERTIFICATION_LEVELS.SILVER.threshold - totalPoints,
      ...CERTIFICATION_LEVELS.SILVER,
    };
  } else if (certification.level === 'SILVER') {
    nextLevel = {
      level: 'GOLD',
      pointsNeeded: CERTIFICATION_LEVELS.GOLD.threshold - totalPoints,
      ...CERTIFICATION_LEVELS.GOLD,
    };
  } else if (certification.level === 'GOLD') {
    nextLevel = {
      level: 'PLATINUM',
      pointsNeeded: CERTIFICATION_LEVELS.PLATINUM.threshold - totalPoints,
      ...CERTIFICATION_LEVELS.PLATINUM,
    };
  }

  return {
    certified: true,
    currentLevel: certification.level,
    label: certification.label,
    description: certification.description,
    totalPoints,
    hiredPlacements,
    retentionMilestones,
    nextLevel,
  };
}

/**
 * Get certification status for a company (read-only, doesn't update)
 */
export async function getCertificationStatus(companyUserId) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
    select: {
      rapCertificationLevel: true,
      rapCertifiedAt: true,
      rapPoints: true,
    },
  });

  if (!company) {
    return { certified: false, error: 'Company not found' };
  }

  if (!company.rapCertificationLevel) {
    const { totalPoints } = await calculateCertificationPoints(companyUserId);
    return {
      certified: false,
      totalPoints,
      nextLevel: {
        level: 'BRONZE',
        pointsNeeded: Math.max(0, CERTIFICATION_LEVELS.BRONZE.threshold - totalPoints),
        ...CERTIFICATION_LEVELS.BRONZE,
      },
    };
  }

  const certification = CERTIFICATION_LEVELS[company.rapCertificationLevel];
  return {
    certified: true,
    currentLevel: company.rapCertificationLevel,
    label: certification?.label,
    description: certification?.description,
    certifiedAt: company.rapCertifiedAt,
    totalPoints: company.rapPoints,
  };
}

/**
 * Check if company meets RAP certification requirements
 */
export async function checkCertificationEligibility(companyUserId) {
  const { totalPoints } = await calculateCertificationPoints(companyUserId);
  const certification = getCertificationLevel(totalPoints);
  
  return {
    eligible: certification !== null,
    currentPoints: totalPoints,
    wouldAchieve: certification?.level || null,
    threshold: CERTIFICATION_LEVELS.BRONZE.threshold,
  };
}
