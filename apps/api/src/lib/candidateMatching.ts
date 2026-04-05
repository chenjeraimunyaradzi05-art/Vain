// @ts-nocheck
/**
 * Employer AI Matching - Candidate Ranking System
 * 
 * Ranks job applicants by:
 * - Skills match score (required + preferred skills)
 * - Cultural fit indicators (RAP alignment, mentorship participation)
 * - Readiness assessment (qualifications, experience, availability)
 * - Red flag detection (overqualified, skill gaps, location issues)
 * 
 * Helps employers reduce hiring friction and improve retention
 */

import { prisma } from '../db';

/**
 * Weight constants for candidate scoring
 */
const WEIGHTS = {
  SKILLS_REQUIRED: 35,      // Must-have skills
  SKILLS_PREFERRED: 15,     // Nice-to-have skills
  EXPERIENCE_MATCH: 20,     // Years of experience alignment
  QUALIFICATION_MATCH: 15,  // Education/certification match
  CULTURAL_SIGNALS: 10,     // RAP engagement, mentorship, community
  AVAILABILITY: 5,          // Start date, location flexibility
};

/**
 * Red flag types and severity levels
 */
const RED_FLAG_TYPES = {
  OVERQUALIFIED: {
    id: 'overqualified',
    label: 'May be Overqualified',
    severity: 'warning',
    description: 'Candidate may have significantly more experience than required'
  },
  UNDERQUALIFIED: {
    id: 'underqualified',
    label: 'Skills Gap Detected',
    severity: 'info',
    description: 'Candidate is missing some required skills but shows potential'
  },
  LOCATION_MISMATCH: {
    id: 'location_mismatch',
    label: 'Location Consideration',
    severity: 'info',
    description: 'Candidate may need relocation or remote work arrangement'
  },
  SHORT_TENURE: {
    id: 'short_tenure',
    label: 'Tenure Pattern',
    severity: 'info',
    description: 'Previous roles show shorter-than-average tenure'
  },
  SALARY_MISMATCH: {
    id: 'salary_mismatch',
    label: 'Salary Expectations',
    severity: 'warning',
    description: 'Expected salary may exceed budget range'
  },
  DELAYED_START: {
    id: 'delayed_start',
    label: 'Delayed Availability',
    severity: 'info',
    description: 'Candidate cannot start within the preferred timeframe'
  }
};

/**
 * Green flag types (positive indicators)
 */
const GREEN_FLAG_TYPES = {
  MENTORSHIP_ACTIVE: {
    id: 'mentorship_active',
    label: 'Active Mentee',
    description: 'Currently engaged in platform mentorship program'
  },
  TRAINING_COMPLETE: {
    id: 'training_complete',
    label: 'Training Completed',
    description: 'Has completed relevant training courses on platform'
  },
  COMMUNITY_ENGAGED: {
    id: 'community_engaged',
    label: 'Community Member',
    description: 'Active participant in community forums'
  },
  VERIFIED_PROFILE: {
    id: 'verified_profile',
    label: 'Verified Profile',
    description: 'Profile has been verified by community elder'
  },
  BADGE_HOLDER: {
    id: 'badge_holder',
    label: 'Credential Holder',
    description: 'Has earned relevant digital credentials'
  },
  REFERRAL: {
    id: 'referral',
    label: 'Internal Referral',
    description: 'Referred by another platform member'
  }
};

/**
 * Calculate skills match score between candidate and job
 * @param {string[]} candidateSkills - Candidate's skills
 * @param {string[]} requiredSkills - Job required skills
 * @param {string[]} preferredSkills - Job preferred skills
 * @returns {object} { requiredScore, preferredScore, matchedRequired, matchedPreferred, missingRequired }
 */
function calculateSkillsMatch(candidateSkills = [], requiredSkills = [], preferredSkills = []) {
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
  const normalizedPreferred = preferredSkills.map(s => s.toLowerCase().trim());

  // Find matched and missing required skills
  const matchedRequired = normalizedRequired.filter(skill =>
    normalizedCandidateSkills.some(cs => 
      cs === skill || cs.includes(skill) || skill.includes(cs)
    )
  );
  const missingRequired = normalizedRequired.filter(skill => !matchedRequired.includes(skill));

  // Find matched preferred skills
  const matchedPreferred = normalizedPreferred.filter(skill =>
    normalizedCandidateSkills.some(cs =>
      cs === skill || cs.includes(skill) || skill.includes(cs)
    )
  );

  // Calculate scores
  const requiredScore = normalizedRequired.length > 0
    ? (matchedRequired.length / normalizedRequired.length) * 100
    : 100;

  const preferredScore = normalizedPreferred.length > 0
    ? (matchedPreferred.length / normalizedPreferred.length) * 100
    : 100;

  return {
    requiredScore,
    preferredScore,
    matchedRequired,
    matchedPreferred,
    missingRequired
  };
}

/**
 * Calculate experience match score
 * @param {number} candidateYears - Candidate's years of experience
 * @param {number} minYears - Minimum required years
 * @param {number} maxYears - Maximum preferred years
 * @returns {object} { score, isOverqualified, isUnderqualified }
 */
function calculateExperienceMatch(candidateYears = 0, minYears = 0, maxYears = 15) {
  const years = Number(candidateYears) || 0;
  const min = Number(minYears) || 0;
  const max = Number(maxYears) || 15;

  let score = 0;
  let isOverqualified = false;
  let isUnderqualified = false;

  if (years < min) {
    // Under minimum - partial credit
    score = Math.max(0, (years / min) * 70);
    isUnderqualified = min - years > 2;
  } else if (years > max + 5) {
    // Significantly over - may be overqualified
    score = 70;
    isOverqualified = true;
  } else if (years > max) {
    // Slightly over maximum
    score = 85;
  } else {
    // In the sweet spot
    score = 100;
  }

  return { score, isOverqualified, isUnderqualified };
}

/**
 * Calculate cultural signals score
 * @param {object} candidateProfile - Candidate profile data
 * @returns {object} { score, signals }
 */
async function calculateCulturalSignals(candidateProfile) {
  const userId = candidateProfile?.userId || candidateProfile?.id;
  if (!userId) {
    return { score: 50, signals: [] };
  }

  const signals = [];
  let score = 50; // Neutral baseline

  try {
    // Check mentorship participation
    const mentorshipCount = await prisma.mentorSession?.count({
      where: { menteeId: userId }
    }).catch(() => 0) || 0;

    if (mentorshipCount > 0) {
      signals.push(GREEN_FLAG_TYPES.MENTORSHIP_ACTIVE);
      score += 15;
    }

    // Check training completions
    const completedCourses = await prisma.courseEnrolment?.count({
      where: { userId, status: 'COMPLETED' }
    }).catch(() => 0) || 0;

    if (completedCourses > 0) {
      signals.push(GREEN_FLAG_TYPES.TRAINING_COMPLETE);
      score += 10;
    }

    // Check forum engagement
    const forumPosts = await prisma.forumReply?.count({
      where: { userId }
    }).catch(() => 0) || 0;

    if (forumPosts >= 5) {
      signals.push(GREEN_FLAG_TYPES.COMMUNITY_ENGAGED);
      score += 10;
    }

    // Check badges
    const badges = await prisma.userBadge?.count({
      where: { userId }
    }).catch(() => 0) || 0;

    if (badges > 0) {
      signals.push(GREEN_FLAG_TYPES.BADGE_HOLDER);
      score += 10;
    }

    // Check verification status
    if (candidateProfile?.verified || candidateProfile?.elderVerified) {
      signals.push(GREEN_FLAG_TYPES.VERIFIED_PROFILE);
      score += 10;
    }

    // Check if referred
    if (candidateProfile?.referredBy) {
      signals.push(GREEN_FLAG_TYPES.REFERRAL);
      score += 10;
    }

  } catch (err) {
    console.error('Cultural signals calculation error:', err);
  }

  return { score: Math.min(100, score), signals };
}

/**
 * Detect red flags in candidate application
 * @param {object} candidate - Candidate profile
 * @param {object} job - Job listing
 * @param {object} application - Application data
 * @returns {Array} Array of red flags
 */
function detectRedFlags(candidate, job, application = {}) {
  const flags = [];

  // Check overqualification
  const candidateYears = Number(candidate?.yearsExperience) || 0;
  const jobMaxYears = Number(job?.maxExperience) || 10;
  if (candidateYears > jobMaxYears + 5) {
    flags.push({
      ...RED_FLAG_TYPES.OVERQUALIFIED,
      detail: `${candidateYears} years experience vs ${jobMaxYears} max preferred`
    });
  }

  // Check location mismatch
  const candidateLocation = candidate?.location?.toLowerCase() || '';
  const jobLocation = job?.location?.toLowerCase() || '';
  const isRemote = job?.remote || jobLocation.includes('remote');
  
  if (!isRemote && candidateLocation && jobLocation && !candidateLocation.includes(jobLocation) && !jobLocation.includes(candidateLocation)) {
    flags.push({
      ...RED_FLAG_TYPES.LOCATION_MISMATCH,
      detail: `Candidate: ${candidate?.location}, Job: ${job?.location}`
    });
  }

  // Check salary expectations
  const app: any = application || {};
  const expectedSalary = Number(app?.expectedSalary || (candidate as any)?.expectedSalary) || 0;
  const maxSalary = Number(job?.salaryMax) || 0;
  if (expectedSalary > 0 && maxSalary > 0 && expectedSalary > maxSalary * 1.2) {
    flags.push({
      ...RED_FLAG_TYPES.SALARY_MISMATCH,
      detail: `Expected: $${expectedSalary.toLocaleString()}, Budget: $${maxSalary.toLocaleString()}`
    });
  }

  // Check availability
  const startDate = app?.availableFrom ? new Date(app.availableFrom) : null;
  const preferredStart = job?.startDate ? new Date(job.startDate) : null;
  if (startDate && preferredStart && startDate > preferredStart) {
    const daysDiff = Math.ceil((startDate.getTime() - preferredStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      flags.push({
        ...RED_FLAG_TYPES.DELAYED_START,
        detail: `Available ${daysDiff} days after preferred start`
      });
    }
  }

  return flags;
}

/**
 * Calculate overall match score for a candidate
 * @param {object} candidate - Candidate profile with skills
 * @param {object} job - Job listing with requirements
 * @param {object} application - Application data
 * @returns {Promise<object>} Match result with score, breakdown, flags
 */
async function calculateCandidateScore(candidate, job, application: any = {}) {
  const breakdown: any = {};
  let totalScore = 0;

  // 1. Skills match (50 points total)
  const candidateSkills = candidate?.skills?.map(s => s.name || s) || [];
  const requiredSkills = job?.requiredSkills?.map(s => s.name || s) || [];
  const preferredSkills = job?.preferredSkills?.map(s => s.name || s) || [];
  
  const skillsMatch = calculateSkillsMatch(candidateSkills, requiredSkills, preferredSkills);
  
  const requiredSkillsPoints = (skillsMatch.requiredScore / 100) * WEIGHTS.SKILLS_REQUIRED;
  const preferredSkillsPoints = (skillsMatch.preferredScore / 100) * WEIGHTS.SKILLS_PREFERRED;
  
  breakdown.skillsRequired = Math.round(requiredSkillsPoints);
  breakdown.skillsPreferred = Math.round(preferredSkillsPoints);
  totalScore += requiredSkillsPoints + preferredSkillsPoints;

  // 2. Experience match (20 points)
  const experienceMatch = calculateExperienceMatch(
    candidate?.yearsExperience,
    job?.minExperience,
    job?.maxExperience
  );
  const experiencePoints = (experienceMatch.score / 100) * WEIGHTS.EXPERIENCE_MATCH;
  breakdown.experience = Math.round(experiencePoints);
  totalScore += experiencePoints;

  // 3. Qualification match (15 points)
  const candidateQualifications = candidate?.qualifications || [];
  const requiredQualifications = job?.requiredQualifications || [];
  let qualificationScore = 100;
  
  if (requiredQualifications.length > 0) {
    const matched = requiredQualifications.filter(rq =>
      candidateQualifications.some(cq =>
        cq.toLowerCase().includes(rq.toLowerCase()) || rq.toLowerCase().includes(cq.toLowerCase())
      )
    );
    qualificationScore = (matched.length / requiredQualifications.length) * 100;
  }
  
  const qualificationPoints = (qualificationScore / 100) * WEIGHTS.QUALIFICATION_MATCH;
  breakdown.qualifications = Math.round(qualificationPoints);
  totalScore += qualificationPoints;

  // 4. Cultural signals (10 points)
  const culturalResult = await calculateCulturalSignals(candidate);
  const culturalPoints = (culturalResult.score / 100) * WEIGHTS.CULTURAL_SIGNALS;
  breakdown.cultural = Math.round(culturalPoints);
  totalScore += culturalPoints;

  // 5. Availability (5 points)
  let availabilityScore = 100;
  const appData: any = application || {};
  const startDate = appData?.availableFrom ? new Date(appData.availableFrom) : null;
  const preferredStart = job?.startDate ? new Date(job.startDate) : new Date();
  
  if (startDate && startDate > preferredStart) {
    const daysDiff = Math.ceil((startDate.getTime() - preferredStart.getTime()) / (1000 * 60 * 60 * 24));
    availabilityScore = Math.max(0, 100 - (daysDiff * 2));
  }
  
  const availabilityPoints = (availabilityScore / 100) * WEIGHTS.AVAILABILITY;
  breakdown.availability = Math.round(availabilityPoints);
  totalScore += availabilityPoints;

  // Detect red flags
  const redFlags = detectRedFlags(candidate, job, application);

  // Build readiness tier
  const roundedScore = Math.round(totalScore);
  let tier = 'NOT_READY';
  if (roundedScore >= 80) tier = 'EXCELLENT';
  else if (roundedScore >= 65) tier = 'GOOD';
  else if (roundedScore >= 50) tier = 'POTENTIAL';
  else if (roundedScore >= 35) tier = 'DEVELOPING';

  return {
    score: roundedScore,
    tier,
    breakdown,
    skillsAnalysis: {
      matchedRequired: skillsMatch.matchedRequired,
      matchedPreferred: skillsMatch.matchedPreferred,
      missingRequired: skillsMatch.missingRequired
    },
    greenFlags: culturalResult.signals,
    redFlags,
    recommendations: generateRecommendations(skillsMatch, experienceMatch, redFlags)
  };
}

/**
 * Generate recommendations for the employer
 */
function generateRecommendations(skillsMatch, experienceMatch, redFlags) {
  const recommendations = [];

  if (skillsMatch.missingRequired.length > 0 && skillsMatch.missingRequired.length <= 2) {
    recommendations.push({
      type: 'training',
      message: `Consider if candidate can develop ${skillsMatch.missingRequired.join(', ')} skills through training`
    });
  }

  if (experienceMatch.isOverqualified) {
    recommendations.push({
      type: 'interview',
      message: 'Discuss career goals to understand interest in this role level'
    });
  }

  if (redFlags.some(f => f.id === 'location_mismatch')) {
    recommendations.push({
      type: 'discussion',
      message: 'Clarify relocation willingness or remote work arrangements'
    });
  }

  if (redFlags.some(f => f.id === 'salary_mismatch')) {
    recommendations.push({
      type: 'negotiation',
      message: 'Discuss total compensation package including benefits and growth opportunities'
    });
  }

  return recommendations;
}

/**
 * Rank all applicants for a job
 * @param {string} jobId - Job ID
 * @param {object} options - Filtering and sorting options
 * @returns {Promise<Array>} Ranked applicants with scores
 */
async function rankApplicantsForJob(jobId, options: any = {}) {
  const { 
    minScore = 0, 
    tier = null, 
    includeWithdrawn = false,
    limit = 50 
  } = options;

  // Get job with requirements
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      requiredSkills: true,
      preferredSkills: true
    }
  });

  if (!job) {
    throw new Error('Job not found');
  }

  // Get all applications
  const statusFilter = includeWithdrawn
    ? {}
    : { NOT: { status: 'WITHDRAWN' } };

  const applications = await prisma.jobApplication.findMany({
    where: {
      jobId,
      ...statusFilter
    },
    include: {
      user: {
        include: {
          profile: true,
          skills: true
        }
      }
    }
  });

  // Score each applicant
  const scoredApplicants = await Promise.all(
    applications.map(async (app) => {
      const candidate = {
        ...app.user?.profile,
        userId: app.userId,
        skills: app.user?.skills || [],
        yearsExperience: app.user?.profile?.yearsExperience,
        qualifications: app.user?.profile?.qualifications || [],
        location: app.user?.profile?.location,
        expectedSalary: app.expectedSalary,
        verified: app.user?.profile?.verified
      };

      const matchResult = await calculateCandidateScore(candidate, job, app);

      return {
        applicationId: app.id,
        userId: app.userId,
        appliedAt: app.createdAt,
        status: app.status,
        candidate: {
          id: app.userId,
          name: app.user?.profile?.name || app.user?.email?.split('@')[0],
          email: app.user?.email,
          avatar: app.user?.profile?.avatar,
          location: app.user?.profile?.location,
          yearsExperience: app.user?.profile?.yearsExperience
        },
        ...matchResult
      };
    })
  );

  // Filter and sort
  let filtered = scoredApplicants.filter(a => a.score >= minScore);
  
  if (tier) {
    filtered = filtered.filter(a => a.tier === tier);
  }

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  return filtered.slice(0, limit);
}

/**
 * Get quick stats for job applicants
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} Applicant statistics
 */
async function getApplicantStats(jobId) {
  const ranked = await rankApplicantsForJob(jobId, { minScore: 0, limit: 1000 });

  const stats = {
    total: ranked.length,
    byTier: {
      EXCELLENT: ranked.filter(a => a.tier === 'EXCELLENT').length,
      GOOD: ranked.filter(a => a.tier === 'GOOD').length,
      POTENTIAL: ranked.filter(a => a.tier === 'POTENTIAL').length,
      DEVELOPING: ranked.filter(a => a.tier === 'DEVELOPING').length,
      NOT_READY: ranked.filter(a => a.tier === 'NOT_READY').length
    },
    averageScore: ranked.length > 0
      ? Math.round(ranked.reduce((sum, a) => sum + a.score, 0) / ranked.length)
      : 0,
    withRedFlags: ranked.filter(a => a.redFlags.length > 0).length,
    withGreenFlags: ranked.filter(a => a.greenFlags.length > 0).length,
    topCandidate: ranked[0] || null
  };

  return stats;
}

/**
 * Compare two candidates side by side
 * @param {string} jobId - Job ID
 * @param {string} candidateId1 - First candidate user ID
 * @param {string} candidateId2 - Second candidate user ID
 * @returns {Promise<object>} Side-by-side comparison
 */
async function compareCandidates(jobId, candidateId1, candidateId2) {
  const ranked = await rankApplicantsForJob(jobId, { minScore: 0, limit: 1000 });
  
  const candidate1 = ranked.find(a => a.userId === candidateId1);
  const candidate2 = ranked.find(a => a.userId === candidateId2);

  if (!candidate1 || !candidate2) {
    throw new Error('One or both candidates not found');
  }

  return {
    candidate1,
    candidate2,
    winner: candidate1.score > candidate2.score ? 'candidate1' :
            candidate2.score > candidate1.score ? 'candidate2' : 'tie',
    scoreDifference: Math.abs(candidate1.score - candidate2.score),
    comparison: {
      skillsRequired: {
        candidate1: candidate1.breakdown.skillsRequired,
        candidate2: candidate2.breakdown.skillsRequired,
        winner: candidate1.breakdown.skillsRequired >= candidate2.breakdown.skillsRequired ? 'candidate1' : 'candidate2'
      },
      experience: {
        candidate1: candidate1.breakdown.experience,
        candidate2: candidate2.breakdown.experience,
        winner: candidate1.breakdown.experience >= candidate2.breakdown.experience ? 'candidate1' : 'candidate2'
      },
      cultural: {
        candidate1: candidate1.breakdown.cultural,
        candidate2: candidate2.breakdown.cultural,
        winner: candidate1.breakdown.cultural >= candidate2.breakdown.cultural ? 'candidate1' : 'candidate2'
      }
    }
  };
}

export {
  calculateCandidateScore,
  calculateSkillsMatch,
  calculateExperienceMatch,
  calculateCulturalSignals,
  detectRedFlags,
  rankApplicantsForJob,
  getApplicantStats,
  compareCandidates,
  RED_FLAG_TYPES,
  GREEN_FLAG_TYPES,
  WEIGHTS
};
