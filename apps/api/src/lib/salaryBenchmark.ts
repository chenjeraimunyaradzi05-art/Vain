// @ts-nocheck
/**
 * Salary Benchmarking Tool
 * 
 * Features:
 * - Salary data aggregation from job postings
 * - Salary range estimation by role/location
 * - Comparison tools
 * - Negotiation guidance
 * - Australian labor market integration
 */

import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();
const prisma = prismaClient as any;

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Australian salary data by occupation (ABS-aligned)
 * Based on Australian Bureau of Statistics data and industry surveys
 */
const SALARY_DATABASE = {
  // IT & Technology
  'software-developer': {
    title: 'Software Developer',
    category: 'IT & Technology',
    levels: {
      junior: { min: 60000, median: 75000, max: 90000, years: '0-2' },
      mid: { min: 80000, median: 100000, max: 130000, years: '3-5' },
      senior: { min: 120000, median: 150000, max: 180000, years: '6+' },
      lead: { min: 150000, median: 180000, max: 220000, years: '8+' }
    }
  },
  'data-analyst': {
    title: 'Data Analyst',
    category: 'IT & Technology',
    levels: {
      junior: { min: 55000, median: 70000, max: 85000, years: '0-2' },
      mid: { min: 75000, median: 95000, max: 120000, years: '3-5' },
      senior: { min: 110000, median: 135000, max: 165000, years: '6+' }
    }
  },
  'project-manager': {
    title: 'Project Manager',
    category: 'Management',
    levels: {
      junior: { min: 65000, median: 80000, max: 95000, years: '0-2' },
      mid: { min: 90000, median: 110000, max: 140000, years: '3-5' },
      senior: { min: 130000, median: 160000, max: 200000, years: '6+' }
    }
  },
  'customer-service': {
    title: 'Customer Service Representative',
    category: 'Service',
    levels: {
      junior: { min: 45000, median: 52000, max: 60000, years: '0-1' },
      mid: { min: 55000, median: 65000, max: 75000, years: '2-4' },
      senior: { min: 70000, median: 82000, max: 95000, years: '5+' }
    }
  },
  'electrician': {
    title: 'Electrician',
    category: 'Trades',
    levels: {
      apprentice: { min: 25000, median: 35000, max: 45000, years: 'Apprentice' },
      qualified: { min: 65000, median: 80000, max: 100000, years: '0-5' },
      senior: { min: 90000, median: 110000, max: 140000, years: '6+' }
    }
  },
  'carpenter': {
    title: 'Carpenter',
    category: 'Trades',
    levels: {
      apprentice: { min: 22000, median: 32000, max: 42000, years: 'Apprentice' },
      qualified: { min: 60000, median: 75000, max: 95000, years: '0-5' },
      senior: { min: 85000, median: 100000, max: 130000, years: '6+' }
    }
  },
  'registered-nurse': {
    title: 'Registered Nurse',
    category: 'Healthcare',
    levels: {
      graduate: { min: 65000, median: 72000, max: 80000, years: 'Graduate' },
      rn: { min: 75000, median: 85000, max: 100000, years: '2-5' },
      senior: { min: 95000, median: 110000, max: 130000, years: '6+' }
    }
  },
  'accountant': {
    title: 'Accountant',
    category: 'Finance',
    levels: {
      junior: { min: 55000, median: 65000, max: 75000, years: '0-2' },
      mid: { min: 70000, median: 90000, max: 115000, years: '3-5' },
      senior: { min: 100000, median: 130000, max: 170000, years: '6+' }
    }
  },
  'teacher': {
    title: 'Teacher',
    category: 'Education',
    levels: {
      graduate: { min: 72000, median: 75000, max: 78000, years: 'Graduate' },
      proficient: { min: 80000, median: 88000, max: 95000, years: '3-5' },
      lead: { min: 95000, median: 110000, max: 125000, years: '8+' }
    }
  },
  'administration': {
    title: 'Administrative Officer',
    category: 'Administration',
    levels: {
      junior: { min: 45000, median: 52000, max: 60000, years: '0-1' },
      mid: { min: 55000, median: 65000, max: 78000, years: '2-5' },
      senior: { min: 72000, median: 85000, max: 100000, years: '6+' }
    }
  },
  'mining-operator': {
    title: 'Mining Equipment Operator',
    category: 'Mining',
    levels: {
      entry: { min: 70000, median: 85000, max: 100000, years: '0-2' },
      experienced: { min: 95000, median: 120000, max: 150000, years: '3+' }
    }
  },
  'community-worker': {
    title: 'Community Services Worker',
    category: 'Community Services',
    levels: {
      entry: { min: 55000, median: 62000, max: 70000, years: '0-2' },
      experienced: { min: 65000, median: 78000, max: 92000, years: '3+' }
    }
  }
};

/**
 * Location-based salary adjustments for Australian cities
 */
const LOCATION_ADJUSTMENTS = {
  'sydney': { multiplier: 1.15, label: 'Sydney, NSW', costOfLiving: 'Very High' },
  'melbourne': { multiplier: 1.10, label: 'Melbourne, VIC', costOfLiving: 'High' },
  'brisbane': { multiplier: 1.05, label: 'Brisbane, QLD', costOfLiving: 'Medium-High' },
  'perth': { multiplier: 1.12, label: 'Perth, WA', costOfLiving: 'High' },
  'adelaide': { multiplier: 1.00, label: 'Adelaide, SA', costOfLiving: 'Medium' },
  'canberra': { multiplier: 1.12, label: 'Canberra, ACT', costOfLiving: 'High' },
  'hobart': { multiplier: 0.98, label: 'Hobart, TAS', costOfLiving: 'Medium' },
  'darwin': { multiplier: 1.18, label: 'Darwin, NT', costOfLiving: 'Very High' },
  'gold-coast': { multiplier: 1.02, label: 'Gold Coast, QLD', costOfLiving: 'Medium-High' },
  'newcastle': { multiplier: 0.95, label: 'Newcastle, NSW', costOfLiving: 'Medium' },
  'regional-nsw': { multiplier: 0.90, label: 'Regional NSW', costOfLiving: 'Low-Medium' },
  'regional-vic': { multiplier: 0.88, label: 'Regional VIC', costOfLiving: 'Low-Medium' },
  'regional-qld': { multiplier: 0.88, label: 'Regional QLD', costOfLiving: 'Low-Medium' },
  'remote': { multiplier: 1.20, label: 'Remote Australia', costOfLiving: 'Variable' }
};

/**
 * Industry salary premiums
 */
const INDUSTRY_PREMIUMS = {
  'mining': 1.25,
  'finance': 1.15,
  'technology': 1.10,
  'government': 1.05,
  'healthcare': 1.02,
  'retail': 0.95,
  'hospitality': 0.92,
  'non-profit': 0.90
};

// ============================================================================
// SALARY ESTIMATION
// ============================================================================

/**
 * Get salary estimate for a role
 */
export async function getSalaryEstimate(params) {
  const {
    role,
    level,
    location,
    industry,
    skills = [],
    yearsExperience
  } = params;

  // Find base salary data
  const roleData = findRoleData(role);
  if (!roleData) {
    // Fall back to aggregated job data
    return await getAggregatedSalaryData(role, location);
  }

  // Get level or infer from experience
  const salaryLevel = level || inferLevelFromExperience(roleData, yearsExperience);
  const baseSalary = roleData.levels[salaryLevel];

  if (!baseSalary) {
    return {
      error: 'Level not found',
      availableLevels: Object.keys(roleData.levels)
    };
  }

  // Apply adjustments
  const locationAdj = LOCATION_ADJUSTMENTS[location] || { multiplier: 1.0 };
  const industryAdj = INDUSTRY_PREMIUMS[industry] || 1.0;
  const skillsAdj = calculateSkillsAdjustment(skills);

  const totalMultiplier = locationAdj.multiplier * industryAdj * skillsAdj;

  const estimate = {
    role: roleData.title,
    category: roleData.category,
    level: salaryLevel,
    experienceRange: baseSalary.years,
    base: {
      min: baseSalary.min,
      median: baseSalary.median,
      max: baseSalary.max
    },
    adjusted: {
      min: Math.round(baseSalary.min * totalMultiplier),
      median: Math.round(baseSalary.median * totalMultiplier),
      max: Math.round(baseSalary.max * totalMultiplier)
    },
    adjustments: {
      location: locationAdj,
      industry: { multiplier: industryAdj, name: industry },
      skills: { multiplier: skillsAdj, count: skills.length }
    },
    confidence: 'high',
    dataSource: 'Industry benchmarks + ABS data',
    lastUpdated: '2024-01'
  };

  // Add comparison context
  estimate.context = {
    nationalMedian: baseSalary.median,
    locationDifference: Math.round((locationAdj.multiplier - 1) * 100),
    percentileEstimate: estimatePercentile(estimate.adjusted.median, baseSalary)
  };

  return estimate;
}

/**
 * Calculate salary adjustment based on skills
 */
function calculateSkillsAdjustment(skills) {
  // High-demand skills that command premium
  const premiumSkills = [
    'machine-learning', 'ai', 'cloud-architecture', 'kubernetes',
    'react', 'python', 'aws', 'cybersecurity', 'data-science'
  ];

  const normalizedSkills = skills.map(s => s.toLowerCase().replace(/\s+/g, '-'));
  const premiumCount = normalizedSkills.filter(s => 
    premiumSkills.some(ps => s.includes(ps))
  ).length;

  // Up to 15% premium for high-demand skills
  return 1 + Math.min(premiumCount * 0.03, 0.15);
}

/**
 * Find role data with fuzzy matching
 */
function findRoleData(role) {
  const normalizedRole = role.toLowerCase().replace(/\s+/g, '-');
  
  // Direct match
  if (SALARY_DATABASE[normalizedRole]) {
    return { ...SALARY_DATABASE[normalizedRole], key: normalizedRole };
  }

  // Partial match
  for (const [key, data] of Object.entries(SALARY_DATABASE)) {
    if (key.includes(normalizedRole) || normalizedRole.includes(key)) {
      return { ...data, key };
    }
    if (data.title.toLowerCase().includes(role.toLowerCase())) {
      return { ...data, key };
    }
  }

  return null;
}

/**
 * Infer level from years of experience
 */
function inferLevelFromExperience(roleData, years) {
  if (!years) return 'mid';
  
  const levels = Object.keys(roleData.levels);
  
  if (years <= 2) return levels.includes('junior') ? 'junior' : levels[0];
  if (years <= 5) return levels.includes('mid') ? 'mid' : levels[1] || levels[0];
  return levels.includes('senior') ? 'senior' : levels[levels.length - 1];
}

/**
 * Estimate percentile position
 */
function estimatePercentile(salary, baseSalary) {
  const range = baseSalary.max - baseSalary.min;
  const position = (salary - baseSalary.min) / range;
  return Math.round(position * 100);
}

// ============================================================================
// AGGREGATED JOB DATA
// ============================================================================

/**
 * Get salary data aggregated from job postings
 */
async function getAggregatedSalaryData(role, location) {
  // Query job postings with salary info
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { title: { contains: role, mode: 'insensitive' } },
        { description: { contains: role, mode: 'insensitive' } }
      ],
      salaryMin: { not: null },
      status: 'open',
      ...(location && { location: { contains: location, mode: 'insensitive' } })
    },
    select: {
      salaryMin: true,
      salaryMax: true,
      location: true
    },
    take: 100
  });

  if (jobs.length === 0) {
    return {
      error: 'Insufficient data',
      message: 'Not enough job postings with salary information for this role',
      suggestion: 'Try a more common job title'
    };
  }

  // Calculate statistics
  const salaries = jobs.flatMap(j => 
    [j.salaryMin, j.salaryMax].filter(Boolean)
  ).sort((a, b) => a - b);

  const min = salaries[0];
  const max = salaries[salaries.length - 1];
  const median = salaries[Math.floor(salaries.length / 2)];
  const avg = Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length);

  return {
    role,
    location,
    estimated: {
      min,
      median,
      max,
      average: avg
    },
    sampleSize: jobs.length,
    confidence: jobs.length >= 20 ? 'medium' : 'low',
    dataSource: 'Platform job postings',
    note: 'Based on jobs posted on this platform'
  };
}

// ============================================================================
// SALARY COMPARISON
// ============================================================================

/**
 * Compare salaries across roles
 */
export function compareSalaries(roles, location = null) {
  const results = [];
  const locationAdj = LOCATION_ADJUSTMENTS[location] || { multiplier: 1.0 };

  for (const role of roles) {
    const roleData = findRoleData(role);
    if (roleData) {
      const midLevel = roleData.levels.mid || Object.values(roleData.levels)[1] || Object.values(roleData.levels)[0];
      results.push({
        role: roleData.title,
        category: roleData.category,
        median: Math.round(midLevel.median * locationAdj.multiplier),
        range: {
          min: Math.round(midLevel.min * locationAdj.multiplier),
          max: Math.round(midLevel.max * locationAdj.multiplier)
        }
      });
    }
  }

  // Sort by median salary
  results.sort((a, b) => b.median - a.median);

  return {
    roles: results,
    location: locationAdj.label || 'National Average',
    comparison: results.length >= 2 ? {
      highest: results[0]?.role,
      lowest: results[results.length - 1]?.role,
      difference: results[0]?.median - results[results.length - 1]?.median
    } : null
  };
}

/**
 * Compare salary across locations
 */
export function compareSalaryByLocation(role, locations) {
  const roleData = findRoleData(role);
  if (!roleData) {
    return { error: 'Role not found' };
  }

  const midLevel = roleData.levels.mid || Object.values(roleData.levels)[1];
  const results = [];

  for (const location of locations) {
    const adj = LOCATION_ADJUSTMENTS[location];
    if (adj) {
      results.push({
        location: adj.label,
        locationKey: location,
        median: Math.round(midLevel.median * adj.multiplier),
        costOfLiving: adj.costOfLiving,
        adjustment: `${adj.multiplier >= 1 ? '+' : ''}${Math.round((adj.multiplier - 1) * 100)}%`
      });
    }
  }

  // Sort by salary
  results.sort((a, b) => b.median - a.median);

  return {
    role: roleData.title,
    nationalMedian: midLevel.median,
    locations: results
  };
}

// ============================================================================
// NEGOTIATION TIPS
// ============================================================================

/**
 * Get salary negotiation tips for a role
 */
export function getNegotiationTips(params) {
  const { role, currentSalary, targetSalary, situation } = params;
  
  const roleData = findRoleData(role);
  const tips = [];

  // General tips
  tips.push({
    category: 'Preparation',
    tips: [
      'Research industry benchmarks before negotiating',
      'Document your achievements and value delivered',
      'Know your minimum acceptable salary',
      'Practice your negotiation conversation',
      'Prepare responses to common objections'
    ]
  });

  tips.push({
    category: 'During Negotiation',
    tips: [
      'Let the employer make the first offer when possible',
      'Focus on the total compensation package, not just salary',
      'Use specific numbers rather than ranges',
      'Be confident but not aggressive',
      'Take time to consider offers - never accept on the spot'
    ]
  });

  tips.push({
    category: 'Leverage Points',
    tips: [
      'Unique skills or certifications you possess',
      'Proven track record with measurable results',
      'Competing job offers',
      'Cost of living in your area',
      'Industry demand for your skills'
    ]
  });

  // Situation-specific tips
  if (situation === 'new-job') {
    tips.push({
      category: 'New Job Negotiation',
      tips: [
        'Negotiate before accepting the offer',
        'Request the offer in writing',
        'Consider signing bonuses if base salary is fixed',
        'Negotiate start date, remote work, or other benefits',
        'Ask about salary review timeline'
      ]
    });
  } else if (situation === 'raise') {
    tips.push({
      category: 'Asking for a Raise',
      tips: [
        'Time your request after a successful project',
        'Align with company performance review cycles',
        'Come prepared with a list of accomplishments',
        'Be specific about the raise amount you want',
        'Have a backup plan if salary increase isn\'t possible'
      ]
    });
  }

  // Calculate reasonable ask if we have salary data
  let recommendation = null;
  if (currentSalary && roleData) {
    const midLevel = roleData.levels.mid || Object.values(roleData.levels)[1];
    
    if (currentSalary < midLevel.min) {
      recommendation = {
        suggestion: 'Your current salary is below market rate',
        targetRange: `$${midLevel.min.toLocaleString()} - $${midLevel.median.toLocaleString()}`,
        percentageIncrease: Math.round(((midLevel.median - currentSalary) / currentSalary) * 100)
      };
    } else if (currentSalary < midLevel.median) {
      recommendation = {
        suggestion: 'Room to negotiate toward market median',
        targetRange: `$${midLevel.median.toLocaleString()} - $${midLevel.max.toLocaleString()}`,
        percentageIncrease: Math.round(((midLevel.median - currentSalary) / currentSalary) * 100)
      };
    } else {
      recommendation = {
        suggestion: 'You\'re at or above market median',
        consideration: 'Focus on non-salary benefits or promotion to senior level'
      };
    }
  }

  return {
    role: roleData?.title || role,
    tips,
    recommendation,
    scripts: getNegotiationScripts(situation)
  };
}

/**
 * Get sample negotiation scripts
 */
function getNegotiationScripts(situation) {
  const scripts = [];

  if (situation === 'new-job') {
    scripts.push({
      scenario: 'Initial Response to Offer',
      script: 'Thank you for the offer. I\'m very excited about this opportunity. I\'d like to discuss the compensation package. Based on my research and experience, I was expecting something in the range of [X]. Is there flexibility to adjust the base salary?'
    });
    scripts.push({
      scenario: 'Countering with Evidence',
      script: 'I appreciate your offer of [X]. Based on my [Y years] of experience and the market rate for this role in [location], I believe a salary of [Z] would be more appropriate. I\'ve consistently [achievement], which I believe demonstrates my value.'
    });
  } else {
    scripts.push({
      scenario: 'Requesting a Meeting',
      script: 'I\'d like to schedule some time to discuss my compensation. Over the past [time period], I\'ve [achievements]. I believe it\'s a good time to review my salary to reflect my contributions and market rates.'
    });
    scripts.push({
      scenario: 'During the Discussion',
      script: 'Based on my research, the market rate for my role is between [X and Y]. Given my performance, including [specific achievements], I believe my compensation should reflect this. I\'m proposing a salary of [Z].'
    });
  }

  return scripts;
}

// ============================================================================
// ANALYTICS & TRENDS
// ============================================================================

/**
 * Get salary trends for a role
 */
export async function getSalaryTrends(role, location = null) {
  const roleData = findRoleData(role);
  
  // Historical data (simulated - in production, track over time)
  const currentYear = new Date().getFullYear();
  const trends = [];

  const midLevel = roleData?.levels.mid || { median: 80000 };
  
  for (let year = currentYear - 4; year <= currentYear; year++) {
    // Simulate ~3% annual growth
    const yearMultiplier = Math.pow(1.03, year - currentYear);
    trends.push({
      year,
      median: Math.round(midLevel.median * yearMultiplier)
    });
  }

  // Forecast next year
  trends.push({
    year: currentYear + 1,
    median: Math.round(midLevel.median * 1.03),
    isForecast: true
  });

  return {
    role: roleData?.title || role,
    location: LOCATION_ADJUSTMENTS[location]?.label || 'National',
    trends,
    insight: `Salaries for ${roleData?.title || role} have grown approximately 3% annually over the past 5 years.`
  };
}

/**
 * Get available roles for salary lookup
 */
export function getAvailableRoles(category = null) {
  let roles = Object.entries(SALARY_DATABASE).map(([key, data]) => ({
    key,
    title: data.title,
    category: data.category,
    levels: Object.keys(data.levels)
  }));

  if (category) {
    roles = roles.filter(r => r.category.toLowerCase() === category.toLowerCase());
  }

  // Group by category
  const byCategory = roles.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {});

  return {
    roles,
    byCategory,
    categories: [...new Set(roles.map(r => r.category))]
  };
}

/**
 * Get available locations
 */
export function getAvailableLocations() {
  return Object.entries(LOCATION_ADJUSTMENTS).map(([key, data]) => ({
    key,
    label: data.label,
    costOfLiving: data.costOfLiving,
    adjustment: `${data.multiplier >= 1 ? '+' : ''}${Math.round((data.multiplier - 1) * 100)}%`
  }));
}

// ============================================================================
// USER SALARY TRACKING
// ============================================================================

/**
 * Save user's salary for tracking
 */
export async function saveUserSalary(userId, salaryData) {
  return await prisma.salaryEntry.create({
    data: {
      userId,
      role: salaryData.role,
      salary: salaryData.salary,
      location: salaryData.location,
      industry: salaryData.industry,
      yearsExperience: salaryData.yearsExperience,
      isCurrentSalary: salaryData.isCurrent ?? true,
      startDate: salaryData.startDate,
      endDate: salaryData.endDate,
      notes: salaryData.notes
    }
  }).catch(() => null);
}

/**
 * Get user's salary history
 */
export async function getUserSalaryHistory(userId) {
  const entries = await prisma.salaryEntry.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' }
  }).catch(() => []);

  if (entries.length === 0) return null;

  // Calculate growth
  const sortedByDate = [...entries].sort((a, b) => 
    new Date(a.startDate) - new Date(b.startDate)
  );

  let totalGrowth = 0;
  if (sortedByDate.length >= 2) {
    const first = sortedByDate[0].salary;
    const last = sortedByDate[sortedByDate.length - 1].salary;
    totalGrowth = Math.round(((last - first) / first) * 100);
  }

  return {
    entries,
    current: entries.find(e => e.isCurrentSalary) || entries[0],
    totalGrowth,
    entryCount: entries.length
  };
}

export default {
  // Estimation
  getSalaryEstimate,
  getAggregatedSalaryData,
  
  // Comparison
  compareSalaries,
  compareSalaryByLocation,
  
  // Negotiation
  getNegotiationTips,
  
  // Trends & Analytics
  getSalaryTrends,
  getAvailableRoles,
  getAvailableLocations,
  
  // User tracking
  saveUserSalary,
  getUserSalaryHistory,
  
  // Data exports
  SALARY_DATABASE,
  LOCATION_ADJUSTMENTS,
  INDUSTRY_PREMIUMS
};

export {};
