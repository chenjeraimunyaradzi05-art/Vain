/**
 * Job Recommendation Engine
 * 
 * AI-powered job matching based on user profile, skills, and preferences.
 * Uses weighted scoring to rank job opportunities.
 */

/**
 * Scoring weights for different matching factors
 */
export const SCORING_WEIGHTS = {
  skillMatch: 0.35,        // How well user skills match job requirements
  experienceMatch: 0.20,   // Experience level alignment
  locationMatch: 0.15,     // Geographic proximity
  industryMatch: 0.10,     // Industry/sector preference
  cultureMatch: 0.10,      // Cultural fit (Indigenous-friendly employers)
  salaryMatch: 0.05,       // Salary expectations alignment
  recency: 0.05,           // How recently the job was posted
};

/**
 * Calculate skill match score
 * @param {string[]} userSkills - User's skills
 * @param {string[]} jobSkills - Required job skills
 * @returns {number} Score 0-1
 */
export function calculateSkillMatch(userSkills, jobSkills) {
  if (!userSkills?.length || !jobSkills?.length) {
    return 0.5; // Neutral if no data
  }

  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase().trim());

  // Exact matches
  const exactMatches = normalizedJobSkills.filter(skill => 
    normalizedUserSkills.includes(skill)
  ).length;

  // Partial/related matches (simple substring check)
  const partialMatches = normalizedJobSkills.filter(jobSkill =>
    !normalizedUserSkills.includes(jobSkill) &&
    normalizedUserSkills.some(userSkill => 
      jobSkill.includes(userSkill) || userSkill.includes(jobSkill)
    )
  ).length;

  const totalRequired = normalizedJobSkills.length;
  const matchScore = (exactMatches + partialMatches * 0.5) / totalRequired;

  return Math.min(matchScore, 1);
}

/**
 * Calculate experience match score
 * @param {number} userYears - User's years of experience
 * @param {string} jobLevel - Job experience level
 * @returns {number} Score 0-1
 */
export function calculateExperienceMatch(userYears, jobLevel) {
  const levelRanges = {
    'entry': { min: 0, max: 2 },
    'junior': { min: 0, max: 3 },
    'mid': { min: 2, max: 5 },
    'mid-level': { min: 2, max: 5 },
    'senior': { min: 5, max: 10 },
    'lead': { min: 7, max: 15 },
    'principal': { min: 10, max: 20 },
    'executive': { min: 10, max: 30 },
  };

  const range = levelRanges[jobLevel?.toLowerCase()] || { min: 0, max: 100 };
  
  if (userYears >= range.min && userYears <= range.max) {
    return 1;
  } else if (userYears < range.min) {
    // Under-qualified penalty
    return Math.max(0, 1 - (range.min - userYears) * 0.2);
  } else {
    // Over-qualified (slight penalty)
    return Math.max(0.7, 1 - (userYears - range.max) * 0.05);
  }
}

/**
 * Calculate location match score
 * @param {string} userLocation - User's location
 * @param {string} jobLocation - Job location
 * @param {boolean} remoteOk - Whether job allows remote
 * @param {boolean} userWantsRemote - User prefers remote
 * @returns {number} Score 0-1
 */
export function calculateLocationMatch(userLocation, jobLocation, remoteOk, userWantsRemote) {
  // Remote job and user wants remote = perfect match
  if (remoteOk && userWantsRemote) {
    return 1;
  }

  // No location data
  if (!userLocation || !jobLocation) {
    return 0.5;
  }

  const normalizedUser = userLocation.toLowerCase().trim();
  const normalizedJob = jobLocation.toLowerCase().trim();

  // Exact city/state match
  if (normalizedUser === normalizedJob) {
    return 1;
  }

  // Same state/region
  const australianStates = ['nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'nt', 'act'];
  for (const state of australianStates) {
    if (normalizedUser.includes(state) && normalizedJob.includes(state)) {
      return 0.8;
    }
  }

  // Same country (Australia)
  if (normalizedUser.includes('australia') || normalizedJob.includes('australia')) {
    return 0.5;
  }

  // Remote available as fallback
  if (remoteOk) {
    return 0.7;
  }

  return 0.3;
}

/**
 * Calculate industry match score
 * @param {string[]} userIndustries - User's preferred industries
 * @param {string} jobIndustry - Job's industry
 * @returns {number} Score 0-1
 */
export function calculateIndustryMatch(userIndustries, jobIndustry) {
  if (!userIndustries?.length || !jobIndustry) {
    return 0.5;
  }

  const normalizedJob = jobIndustry.toLowerCase();
  const normalizedUser = userIndustries.map(i => i.toLowerCase());

  if (normalizedUser.includes(normalizedJob)) {
    return 1;
  }

  // Check for related industries
  const relatedIndustries = {
    'technology': ['software', 'it', 'tech', 'digital'],
    'healthcare': ['health', 'medical', 'nursing', 'hospital'],
    'education': ['teaching', 'training', 'academic'],
    'finance': ['banking', 'accounting', 'insurance'],
    'construction': ['building', 'trades', 'engineering'],
    'hospitality': ['tourism', 'hotel', 'restaurant'],
    'retail': ['sales', 'customer service'],
  };

  for (const [key, related] of Object.entries(relatedIndustries)) {
    if (normalizedUser.includes(key) && related.some(r => normalizedJob.includes(r))) {
      return 0.7;
    }
  }

  return 0.3;
}

/**
 * Calculate cultural fit score
 * Indigenous-friendly employers score higher for Aboriginal/Torres Strait Islander candidates
 * @param {boolean} isIndigenous - User identifies as Indigenous
 * @param {object} employer - Employer data
 * @returns {number} Score 0-1
 */
export function calculateCultureMatch(isIndigenous, employer) {
  if (!isIndigenous) {
    return 0.7; // Neutral for non-Indigenous users
  }

  let score = 0.5; // Base score

  // RAP (Reconciliation Action Plan) bonus
  if (employer?.hasRAP) {
    score += 0.2;
  }

  // Indigenous employment targets
  if (employer?.indigenousEmploymentTarget) {
    score += 0.15;
  }

  // Indigenous-owned business
  if (employer?.isIndigenousOwned) {
    score += 0.15;
  }

  // Cultural leave policy
  if (employer?.culturalLeavePolicy) {
    score += 0.1;
  }

  return Math.min(score, 1);
}

/**
 * Calculate salary match score
 * @param {number} userMinSalary - User's minimum salary expectation
 * @param {number} jobMinSalary - Job's minimum salary
 * @param {number} jobMaxSalary - Job's maximum salary
 * @returns {number} Score 0-1
 */
export function calculateSalaryMatch(userMinSalary, jobMinSalary, jobMaxSalary) {
  if (!userMinSalary || (!jobMinSalary && !jobMaxSalary)) {
    return 0.5; // Neutral if no data
  }

  const jobMax = jobMaxSalary || jobMinSalary * 1.3;
  const jobMin = jobMinSalary || jobMaxSalary * 0.7;

  if (userMinSalary <= jobMax) {
    if (userMinSalary <= jobMin) {
      return 1; // Job pays more than expected
    }
    return 0.8; // Within range
  }

  // Job pays less than expected
  const gap = (userMinSalary - jobMax) / userMinSalary;
  return Math.max(0, 1 - gap * 2);
}

/**
 * Calculate recency score
 * @param {Date} postedDate - When the job was posted
 * @returns {number} Score 0-1
 */
export function calculateRecencyScore(postedDate) {
  if (!postedDate) return 0.5;

  const now = Date.now();
  const posted = new Date(postedDate).getTime();
  const daysAgo = (now - posted) / (1000 * 60 * 60 * 24);

  if (daysAgo <= 1) return 1;
  if (daysAgo <= 7) return 0.9;
  if (daysAgo <= 14) return 0.7;
  if (daysAgo <= 30) return 0.5;
  if (daysAgo <= 60) return 0.3;
  return 0.1;
}

/**
 * Calculate overall recommendation score for a job
 * @param {object} userProfile - User profile data
 * @param {object} job - Job data
 * @returns {object} Score breakdown
 */
export function calculateRecommendationScore(userProfile, job) {
  const scores = {
    skillMatch: calculateSkillMatch(
      userProfile.skills,
      job.requiredSkills
    ),
    experienceMatch: calculateExperienceMatch(
      userProfile.yearsExperience,
      job.experienceLevel
    ),
    locationMatch: calculateLocationMatch(
      userProfile.location,
      job.location,
      job.remote,
      userProfile.prefersRemote
    ),
    industryMatch: calculateIndustryMatch(
      userProfile.preferredIndustries,
      job.industry
    ),
    cultureMatch: calculateCultureMatch(
      userProfile.isIndigenous,
      job.employer
    ),
    salaryMatch: calculateSalaryMatch(
      userProfile.minSalary,
      job.salaryMin,
      job.salaryMax
    ),
    recency: calculateRecencyScore(job.createdAt),
  };

  // Calculate weighted total
  const total = Object.entries(scores).reduce((sum, [key, value]) => {
    return sum + (value * SCORING_WEIGHTS[key]);
  }, 0);

  return {
    total: Math.round(total * 100) / 100,
    breakdown: scores,
    match: total >= 0.7 ? 'high' : total >= 0.5 ? 'medium' : 'low',
  };
}

/**
 * Get job recommendations for a user
 * @param {object} prisma - Prisma client
 * @param {string} userId - User ID
 * @param {object} options - Options
 * @returns {Promise<object[]>} Recommended jobs
 */
export async function getRecommendations(prisma, userId, options: any = {}) {
  const { limit = 20, page = 1, minScore = 0.3 } = options;

  // Get user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: true,
      preferences: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Build user profile for matching
  const userProfile = {
    skills: user.skills?.map(s => s.name) || [],
    yearsExperience: user.yearsExperience || 0,
    location: user.location,
    preferredIndustries: user.preferences?.industries || [],
    isIndigenous: user.isAboriginalOrTorresStraitIslander,
    minSalary: user.preferences?.minSalary,
    prefersRemote: user.preferences?.remoteOnly,
  };

  // Get active jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: 'active',
      expiresAt: { gt: new Date() },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          hasRAP: true,
          indigenousEmploymentTarget: true,
          isIndigenousOwned: true,
          culturalLeavePolicy: true,
        },
      },
    },
    take: 100, // Get more than needed for filtering
  });

  // Score and rank jobs
  const scoredJobs = jobs.map(job => {
    const score = calculateRecommendationScore(userProfile, {
      ...job,
      requiredSkills: job.skills || [],
      employer: job.company,
    });

    return {
      ...job,
      recommendationScore: score,
    };
  });

  // Filter by minimum score and sort
  const recommendations = scoredJobs
    .filter(j => j.recommendationScore.total >= minScore)
    .sort((a, b) => b.recommendationScore.total - a.recommendationScore.total);

  // Paginate
  const start = (page - 1) * limit;
  const paginatedResults = recommendations.slice(start, start + limit);

  return {
    jobs: paginatedResults,
    total: recommendations.length,
    page,
    limit,
    hasMore: start + limit < recommendations.length,
  };
}



export {};
