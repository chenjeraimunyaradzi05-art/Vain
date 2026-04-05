// @ts-nocheck
/**
 * Career Progression Tracker
 * 
 * Features:
 * - Career timeline visualization
 * - Role changes and promotions tracking
 * - Goal setting and tracking
 * - Milestone celebrations
 * - Progression analytics
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prismaClient = new PrismaClient();
const prisma = prismaClient as any;

// ============================================================================
// CONFIGURATION
// ============================================================================

const MILESTONE_TYPES = {
  FIRST_JOB: { id: 'first-job', label: 'First Job', icon: '🎉', category: 'career' },
  PROMOTION: { id: 'promotion', label: 'Promotion', icon: '⬆️', category: 'career' },
  NEW_ROLE: { id: 'new-role', label: 'New Role', icon: '🔄', category: 'career' },
  NEW_COMPANY: { id: 'new-company', label: 'New Company', icon: '🏢', category: 'career' },
  SALARY_INCREASE: { id: 'salary-increase', label: 'Salary Increase', icon: '💰', category: 'career' },
  CERTIFICATION: { id: 'certification', label: 'Certification', icon: '📜', category: 'learning' },
  COURSE_COMPLETE: { id: 'course-complete', label: 'Course Completed', icon: '🎓', category: 'learning' },
  SKILL_VERIFIED: { id: 'skill-verified', label: 'Skill Verified', icon: '✅', category: 'skills' },
  MENTORSHIP_STARTED: { id: 'mentorship-started', label: 'Started Mentorship', icon: '🤝', category: 'mentorship' },
  MENTORSHIP_COMPLETE: { id: 'mentorship-complete', label: 'Mentorship Complete', icon: '🏆', category: 'mentorship' },
  YEARS_EXPERIENCE: { id: 'years-experience', label: 'Experience Milestone', icon: '⭐', category: 'career' },
  PROJECT_SUCCESS: { id: 'project-success', label: 'Project Success', icon: '🚀', category: 'achievement' },
  LEADERSHIP_ROLE: { id: 'leadership-role', label: 'Leadership Role', icon: '👑', category: 'career' },
  FIRST_INTERVIEW: { id: 'first-interview', label: 'First Interview', icon: '💼', category: 'career' },
  JOB_OFFER: { id: 'job-offer', label: 'Job Offer Received', icon: '📝', category: 'career' }
};

const GOAL_CATEGORIES = {
  CAREER: { id: 'career', label: 'Career Advancement', icon: '📈' },
  SKILLS: { id: 'skills', label: 'Skill Development', icon: '💡' },
  EDUCATION: { id: 'education', label: 'Education & Learning', icon: '📚' },
  INCOME: { id: 'income', label: 'Income Goals', icon: '💵' },
  NETWORKING: { id: 'networking', label: 'Networking', icon: '🌐' },
  BALANCE: { id: 'balance', label: 'Work-Life Balance', icon: '⚖️' }
};

const GOAL_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  AT_RISK: 'at_risk',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// ============================================================================
// CAREER TIMELINE
// ============================================================================

/**
 * Get career timeline for a user
 */
export async function getCareerTimeline(userId, options = {}) {
  const { startDate, endDate, includeGoals = true, includeMilestones = true } = options;

  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // Get career entries
  const entries = await prisma.careerEntry.findMany({
    where: {
      userId,
      ...(startDate || endDate ? { startDate: dateFilter } : {})
    },
    orderBy: { startDate: 'desc' }
  });

  // Get milestones
  let milestones = [];
  if (includeMilestones) {
    milestones = await prisma.careerMilestone.findMany({
      where: {
        userId,
        ...(startDate || endDate ? { achievedAt: dateFilter } : {})
      },
      orderBy: { achievedAt: 'desc' }
    });
  }

  // Get goals
  let goals = [];
  if (includeGoals) {
    goals = await prisma.careerGoal.findMany({
      where: { userId },
      orderBy: { targetDate: 'asc' }
    });
  }

  // Build timeline
  const timeline = [];

  // Add career entries
  for (const entry of entries) {
    timeline.push({
      type: 'career_entry',
      date: entry.startDate,
      data: formatCareerEntry(entry)
    });

    if (entry.endDate) {
      timeline.push({
        type: 'career_exit',
        date: entry.endDate,
        data: {
          ...formatCareerEntry(entry),
          event: 'left position'
        }
      });
    }
  }

  // Add milestones
  for (const milestone of milestones) {
    timeline.push({
      type: 'milestone',
      date: milestone.achievedAt,
      data: formatMilestone(milestone)
    });
  }

  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate summary stats
  const summary = calculateCareerSummary(entries, milestones);

  return {
    timeline,
    goals: goals.map(formatGoal),
    summary,
    dateRange: {
      earliest: entries.length > 0 ? entries[entries.length - 1].startDate : null,
      latest: entries.length > 0 ? entries[0].startDate : null
    }
  };
}

/**
 * Add a career entry (job, role, position)
 */
export async function addCareerEntry(userId, entryData) {
  const entry = await prisma.careerEntry.create({
    data: {
      userId,
      title: entryData.title,
      company: entryData.company,
      department: entryData.department,
      location: entryData.location,
      employmentType: entryData.employmentType, // full-time, part-time, contract, etc.
      startDate: new Date(entryData.startDate),
      endDate: entryData.endDate ? new Date(entryData.endDate) : null,
      isCurrent: entryData.isCurrent ?? !entryData.endDate,
      salary: entryData.salary,
      responsibilities: entryData.responsibilities || [],
      achievements: entryData.achievements || [],
      skills: entryData.skills || [],
      reportingTo: entryData.reportingTo,
      teamSize: entryData.teamSize,
      notes: entryData.notes
    }
  });

  // Check for automatic milestones
  await checkAndCreateMilestones(userId, entry);

  return formatCareerEntry(entry);
}

/**
 * Update a career entry
 */
export async function updateCareerEntry(userId, entryId, updates) {
  const entry = await prisma.careerEntry.findFirst({
    where: { id: entryId, userId }
  });

  if (!entry) {
    throw new Error('Career entry not found');
  }

  const updated = await prisma.careerEntry.update({
    where: { id: entryId },
    data: {
      title: updates.title ?? entry.title,
      company: updates.company ?? entry.company,
      department: updates.department ?? entry.department,
      location: updates.location ?? entry.location,
      employmentType: updates.employmentType ?? entry.employmentType,
      startDate: updates.startDate ? new Date(updates.startDate) : entry.startDate,
      endDate: updates.endDate ? new Date(updates.endDate) : updates.endDate === null ? null : entry.endDate,
      isCurrent: updates.isCurrent ?? entry.isCurrent,
      salary: updates.salary ?? entry.salary,
      responsibilities: updates.responsibilities ?? entry.responsibilities,
      achievements: updates.achievements ?? entry.achievements,
      skills: updates.skills ?? entry.skills,
      reportingTo: updates.reportingTo ?? entry.reportingTo,
      teamSize: updates.teamSize ?? entry.teamSize,
      notes: updates.notes ?? entry.notes,
      updatedAt: new Date()
    }
  });

  return formatCareerEntry(updated);
}

/**
 * Delete a career entry
 */
export async function deleteCareerEntry(userId, entryId) {
  const entry = await prisma.careerEntry.findFirst({
    where: { id: entryId, userId }
  });

  if (!entry) {
    throw new Error('Career entry not found');
  }

  await prisma.careerEntry.delete({ where: { id: entryId } });

  return { deleted: true };
}

// ============================================================================
// MILESTONES
// ============================================================================

/**
 * Get user's milestones
 */
export async function getMilestones(userId, category = null) {
  const where = { userId };
  if (category) where.category = category;

  const milestones = await prisma.careerMilestone.findMany({
    where,
    orderBy: { achievedAt: 'desc' }
  });

  return milestones.map(formatMilestone);
}

/**
 * Add a milestone manually
 */
export async function addMilestone(userId, milestoneData) {
  const milestoneType = MILESTONE_TYPES[milestoneData.type?.toUpperCase()];
  
  const milestone = await prisma.careerMilestone.create({
    data: {
      userId,
      type: milestoneData.type,
      title: milestoneData.title || milestoneType?.label || 'Achievement',
      description: milestoneData.description,
      category: milestoneType?.category || milestoneData.category || 'career',
      achievedAt: milestoneData.achievedAt ? new Date(milestoneData.achievedAt) : new Date(),
      metadata: milestoneData.metadata || {},
      isCelebrated: false
    }
  });

  return formatMilestone(milestone);
}

/**
 * Mark milestone as celebrated (user has seen celebration)
 */
export async function celebrateMilestone(userId, milestoneId) {
  const milestone = await prisma.careerMilestone.findFirst({
    where: { id: milestoneId, userId }
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  await prisma.careerMilestone.update({
    where: { id: milestoneId },
    data: { 
      isCelebrated: true,
      celebratedAt: new Date()
    }
  });

  return { celebrated: true };
}

/**
 * Get uncelebrated milestones for celebration display
 */
export async function getUncelebratedMilestones(userId) {
  const milestones = await prisma.careerMilestone.findMany({
    where: {
      userId,
      isCelebrated: false,
      achievedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    orderBy: { achievedAt: 'desc' }
  });

  return milestones.map(m => ({
    ...formatMilestone(m),
    celebrationMessage: generateCelebrationMessage(m)
  }));
}

/**
 * Check and automatically create milestones based on career events
 */
async function checkAndCreateMilestones(userId, careerEntry) {
  const allEntries = await prisma.careerEntry.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' }
  });

  // First job milestone
  if (allEntries.length === 1) {
    await addMilestone(userId, {
      type: 'first-job',
      title: 'First Job',
      description: `Started first role as ${careerEntry.title} at ${careerEntry.company}`,
      achievedAt: careerEntry.startDate,
      metadata: { entryId: careerEntry.id }
    });
  }

  // New company milestone
  const previousCompanies = allEntries
    .filter(e => e.id !== careerEntry.id)
    .map(e => e.company?.toLowerCase());
  
  if (!previousCompanies.includes(careerEntry.company?.toLowerCase()) && allEntries.length > 1) {
    await addMilestone(userId, {
      type: 'new-company',
      title: 'New Company',
      description: `Joined ${careerEntry.company}`,
      achievedAt: careerEntry.startDate,
      metadata: { entryId: careerEntry.id, company: careerEntry.company }
    });
  }

  // Check for promotion (same company, higher-sounding title)
  const previousAtCompany = allEntries.find(e => 
    e.id !== careerEntry.id && 
    e.company?.toLowerCase() === careerEntry.company?.toLowerCase()
  );
  
  if (previousAtCompany) {
    const promotionKeywords = ['senior', 'lead', 'principal', 'manager', 'director', 'head', 'chief'];
    const hasPromotion = promotionKeywords.some(kw => 
      careerEntry.title?.toLowerCase().includes(kw) && 
      !previousAtCompany.title?.toLowerCase().includes(kw)
    );

    if (hasPromotion) {
      await addMilestone(userId, {
        type: 'promotion',
        title: 'Promotion',
        description: `Promoted to ${careerEntry.title} at ${careerEntry.company}`,
        achievedAt: careerEntry.startDate,
        metadata: { 
          entryId: careerEntry.id, 
          previousTitle: previousAtCompany.title,
          newTitle: careerEntry.title
        }
      });
    }
  }

  // Check experience milestones (1, 2, 5, 10 years)
  const experienceYears = calculateTotalExperience(allEntries);
  const experienceMilestones = [1, 2, 5, 10, 15, 20];
  
  for (const years of experienceMilestones) {
    if (experienceYears >= years) {
      const existing = await prisma.careerMilestone.findFirst({
        where: {
          userId,
          type: 'years-experience',
          metadata: { path: '$.years', equals: years }
        }
      });

      if (!existing) {
        await addMilestone(userId, {
          type: 'years-experience',
          title: `${years} Year${years > 1 ? 's' : ''} of Experience`,
          description: `Reached ${years} year${years > 1 ? 's' : ''} of professional experience`,
          metadata: { years }
        });
      }
    }
  }
}

function generateCelebrationMessage(milestone) {
  const messages = {
    'first-job': ['Congratulations on starting your career journey! 🚀', 'This is just the beginning of great things!'],
    'promotion': ['Amazing achievement! Your hard work paid off! 🎉', 'Well deserved promotion! Keep climbing!'],
    'new-company': ['Exciting new chapter! Best of luck! 🏢', 'New opportunities await! Great move!'],
    'certification': ['Knowledge is power! Great job! 📜', 'Another skill added to your arsenal!'],
    'years-experience': ['What a journey! Keep going! ⭐', 'Experience is the best teacher!']
  };

  const typeMessages = messages[milestone.type] || ['Great achievement! Keep up the amazing work!'];
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}

// ============================================================================
// GOALS
// ============================================================================

/**
 * Create a career goal
 */
export async function createGoal(userId, goalData) {
  const goal = await prisma.careerGoal.create({
    data: {
      userId,
      title: goalData.title,
      description: goalData.description,
      category: goalData.category || 'career',
      targetDate: goalData.targetDate ? new Date(goalData.targetDate) : null,
      status: GOAL_STATUS.NOT_STARTED,
      priority: goalData.priority || 'medium',
      metrics: goalData.metrics || [],
      milestones: goalData.milestones || [],
      progress: 0,
      reminders: goalData.reminders ?? true
    }
  });

  return formatGoal(goal);
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(userId, goalId, updates) {
  const goal = await prisma.careerGoal.findFirst({
    where: { id: goalId, userId }
  });

  if (!goal) {
    throw new Error('Goal not found');
  }

  const newProgress = updates.progress ?? goal.progress;
  let newStatus = updates.status ?? goal.status;

  // Auto-update status based on progress
  if (newProgress >= 100 && newStatus !== GOAL_STATUS.COMPLETED) {
    newStatus = GOAL_STATUS.COMPLETED;
  } else if (newProgress > 0 && newStatus === GOAL_STATUS.NOT_STARTED) {
    newStatus = GOAL_STATUS.IN_PROGRESS;
  }

  const updated = await prisma.careerGoal.update({
    where: { id: goalId },
    data: {
      title: updates.title ?? goal.title,
      description: updates.description ?? goal.description,
      category: updates.category ?? goal.category,
      targetDate: updates.targetDate ? new Date(updates.targetDate) : goal.targetDate,
      status: newStatus,
      priority: updates.priority ?? goal.priority,
      progress: newProgress,
      milestones: updates.milestones ?? goal.milestones,
      completedAt: newStatus === GOAL_STATUS.COMPLETED && !goal.completedAt ? new Date() : goal.completedAt,
      updatedAt: new Date()
    }
  });

  // Create milestone if goal completed
  if (newStatus === GOAL_STATUS.COMPLETED && goal.status !== GOAL_STATUS.COMPLETED) {
    await addMilestone(userId, {
      type: 'project-success',
      title: 'Goal Achieved',
      description: `Completed goal: ${goal.title}`,
      metadata: { goalId: goal.id }
    });
  }

  return formatGoal(updated);
}

/**
 * Get user's goals
 */
export async function getGoals(userId, options = {}) {
  const { status, category, includeCompleted = true } = options;

  const where = { userId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (!includeCompleted) {
    where.status = { not: GOAL_STATUS.COMPLETED };
  }

  const goals = await prisma.careerGoal.findMany({
    where,
    orderBy: [
      { status: 'asc' },
      { targetDate: 'asc' }
    ]
  });

  // Check for at-risk goals (past due or near deadline)
  const now = new Date();
  for (const goal of goals) {
    if (goal.status !== GOAL_STATUS.COMPLETED && goal.targetDate) {
      const daysUntilDue = Math.ceil((new Date(goal.targetDate) - now) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0 || (daysUntilDue < 7 && goal.progress < 75)) {
        await prisma.careerGoal.update({
          where: { id: goal.id },
          data: { status: GOAL_STATUS.AT_RISK }
        });
        goal.status = GOAL_STATUS.AT_RISK;
      }
    }
  }

  return goals.map(formatGoal);
}

/**
 * Delete a goal
 */
export async function deleteGoal(userId, goalId) {
  const goal = await prisma.careerGoal.findFirst({
    where: { id: goalId, userId }
  });

  if (!goal) {
    throw new Error('Goal not found');
  }

  await prisma.careerGoal.delete({ where: { id: goalId } });

  return { deleted: true };
}

/**
 * Get goal suggestions based on career data
 */
export async function getGoalSuggestions(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: true,
      careerEntries: { orderBy: { startDate: 'desc' }, take: 3 },
      careerGoals: { where: { status: { not: GOAL_STATUS.COMPLETED } } }
    }
  });

  const suggestions = [];

  // Skill development suggestions
  const trendingSkills = ['Python', 'Data Analysis', 'Project Management', 'Leadership'];
  const userSkillNames = user?.skills?.map(s => s.name.toLowerCase()) || [];
  
  for (const skill of trendingSkills) {
    if (!userSkillNames.includes(skill.toLowerCase())) {
      suggestions.push({
        category: 'skills',
        title: `Learn ${skill}`,
        description: `${skill} is a trending skill in your industry. Adding it could boost your career.`,
        priority: 'medium'
      });
    }
  }

  // Career advancement suggestions
  const currentRole = user?.careerEntries?.[0];
  if (currentRole) {
    const yearsInRole = currentRole.startDate 
      ? Math.floor((Date.now() - new Date(currentRole.startDate)) / (1000 * 60 * 60 * 24 * 365))
      : 0;
    
    if (yearsInRole >= 2) {
      suggestions.push({
        category: 'career',
        title: 'Seek Promotion or New Role',
        description: `You've been in your current role for ${yearsInRole} years. Consider discussing advancement opportunities.`,
        priority: 'high'
      });
    }
  }

  // Networking suggestions
  suggestions.push({
    category: 'networking',
    title: 'Expand Professional Network',
    description: 'Connect with 5 new professionals in your field this month.',
    priority: 'medium'
  });

  // Filter out existing goals
  const existingTitles = user?.careerGoals?.map(g => g.title.toLowerCase()) || [];
  return suggestions.filter(s => !existingTitles.includes(s.title.toLowerCase()));
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get career progression analytics
 */
export async function getProgressionAnalytics(userId) {
  const entries = await prisma.careerEntry.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' }
  });

  const milestones = await prisma.careerMilestone.findMany({
    where: { userId },
    orderBy: { achievedAt: 'asc' }
  });

  const goals = await prisma.careerGoal.findMany({
    where: { userId }
  });

  // Calculate metrics
  const totalExperience = calculateTotalExperience(entries);
  const companies = [...new Set(entries.map(e => e.company))];
  const roles = [...new Set(entries.map(e => e.title))];

  // Salary progression (if available)
  const salaryProgression = entries
    .filter(e => e.salary)
    .map(e => ({
      date: e.startDate,
      salary: e.salary,
      role: e.title,
      company: e.company
    }));

  // Skills acquired over time
  const skillsOverTime = entries.reduce((acc, entry) => {
    const date = entry.startDate.toISOString().split('T')[0];
    acc[date] = [...new Set([...(acc[date] || []), ...(entry.skills || [])])];
    return acc;
  }, {});

  // Goal completion rate
  const completedGoals = goals.filter(g => g.status === GOAL_STATUS.COMPLETED).length;
  const goalCompletionRate = goals.length > 0 
    ? Math.round((completedGoals / goals.length) * 100) 
    : 0;

  // Career velocity (changes per year)
  const careerYears = totalExperience || 1;
  const careerVelocity = entries.length / careerYears;

  // Milestone breakdown by category
  const milestonesByCategory = milestones.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

  return {
    overview: {
      totalExperience: `${totalExperience.toFixed(1)} years`,
      companiesWorkedFor: companies.length,
      rolesHeld: roles.length,
      milestonesAchieved: milestones.length,
      goalsCompleted: completedGoals,
      goalCompletionRate: `${goalCompletionRate}%`
    },
    salaryProgression,
    skillsOverTime,
    milestonesByCategory,
    careerVelocity: {
      value: careerVelocity.toFixed(2),
      interpretation: careerVelocity > 1 ? 'High mobility' : careerVelocity > 0.5 ? 'Moderate mobility' : 'Stable career'
    },
    companies,
    roles,
    insights: generateCareerInsights(entries, milestones, goals)
  };
}

function calculateTotalExperience(entries) {
  let totalDays = 0;
  const now = new Date();

  for (const entry of entries) {
    const start = new Date(entry.startDate);
    const end = entry.endDate ? new Date(entry.endDate) : now;
    totalDays += (end - start) / (1000 * 60 * 60 * 24);
  }

  return totalDays / 365;
}

function calculateCareerSummary(entries, milestones) {
  const totalExperience = calculateTotalExperience(entries);
  const currentRole = entries.find(e => e.isCurrent);
  
  return {
    totalExperience: `${totalExperience.toFixed(1)} years`,
    currentRole: currentRole ? {
      title: currentRole.title,
      company: currentRole.company,
      duration: calculateDuration(currentRole.startDate)
    } : null,
    totalRoles: entries.length,
    totalMilestones: milestones.length,
    uniqueCompanies: [...new Set(entries.map(e => e.company))].length
  };
}

function calculateDuration(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  const months = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30));
  
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0 
    ? `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
    : `${years} year${years !== 1 ? 's' : ''}`;
}

function generateCareerInsights(entries, milestones, goals) {
  const insights = [];
  
  const experience = calculateTotalExperience(entries);
  
  if (experience < 2) {
    insights.push({
      type: 'tip',
      message: 'Early career focus: Build diverse skills and seek mentorship opportunities.'
    });
  } else if (experience < 5) {
    insights.push({
      type: 'tip',
      message: 'Consider specializing in an area you enjoy. This is a great time for certifications.'
    });
  } else {
    insights.push({
      type: 'tip',
      message: 'With your experience, consider leadership roles or becoming a mentor yourself.'
    });
  }

  const activeGoals = goals.filter(g => g.status === GOAL_STATUS.IN_PROGRESS);
  if (activeGoals.length === 0) {
    insights.push({
      type: 'action',
      message: 'Set some career goals to stay focused on your professional growth.'
    });
  }

  return insights;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCareerEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    company: entry.company,
    department: entry.department,
    location: entry.location,
    employmentType: entry.employmentType,
    startDate: entry.startDate,
    endDate: entry.endDate,
    isCurrent: entry.isCurrent,
    salary: entry.salary,
    responsibilities: entry.responsibilities,
    achievements: entry.achievements,
    skills: entry.skills,
    reportingTo: entry.reportingTo,
    teamSize: entry.teamSize,
    duration: calculateDuration(entry.startDate),
    createdAt: entry.createdAt
  };
}

function formatMilestone(milestone) {
  const type = MILESTONE_TYPES[milestone.type?.toUpperCase().replace(/-/g, '_')];
  
  return {
    id: milestone.id,
    type: milestone.type,
    title: milestone.title,
    description: milestone.description,
    category: milestone.category,
    icon: type?.icon || '🏆',
    achievedAt: milestone.achievedAt,
    isCelebrated: milestone.isCelebrated,
    metadata: milestone.metadata
  };
}

function formatGoal(goal) {
  const category = GOAL_CATEGORIES[goal.category?.toUpperCase()];
  const now = new Date();
  const daysUntilDue = goal.targetDate 
    ? Math.ceil((new Date(goal.targetDate) - now) / (1000 * 60 * 60 * 24))
    : null;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    categoryInfo: category,
    targetDate: goal.targetDate,
    daysUntilDue,
    status: goal.status,
    priority: goal.priority,
    progress: goal.progress,
    milestones: goal.milestones,
    completedAt: goal.completedAt,
    createdAt: goal.createdAt
  };
}

export default {
  // Timeline
  getCareerTimeline,
  addCareerEntry,
  updateCareerEntry,
  deleteCareerEntry,
  
  // Milestones
  getMilestones,
  addMilestone,
  celebrateMilestone,
  getUncelebratedMilestones,
  
  // Goals
  createGoal,
  updateGoalProgress,
  getGoals,
  deleteGoal,
  getGoalSuggestions,
  
  // Analytics
  getProgressionAnalytics,
  
  // Config
  MILESTONE_TYPES,
  GOAL_CATEGORIES,
  GOAL_STATUS
};

export {};
