// @ts-nocheck
'use strict';

/**
 * Course Recommendation Engine
 * Step 36: Skills-gap based course recommendations
 * 
 * Provides:
 * - Skills gap analysis integration
 * - Career goal-based recommendations
 * - Learning path generation
 * - Job-required skills matching
 * - Completion predictions
 */

const { prisma } = require('../db');
const logger = require('./logger');
const skillsGap = require('./skillsGap');
const semanticSearch = require('./semanticSearch');

/**
 * Weight constants for course scoring
 */
const WEIGHTS = {
  SKILLS_GAP: 40,      // Addresses skill gaps
  CAREER_GOAL: 25,     // Aligns with career goals
  JOB_MATCH: 20,       // Required for target job
  POPULARITY: 10,      // Enrollment/ratings
  COMPLETION_TIME: 5   // Fits available time
};

/**
 * Get personalized course recommendations
 * @param {string} userId - User ID
 * @param {object} options - Recommendation options
 */
async function getRecommendations(userId, options = {}) {
  const {
    limit = 10,
    includeEnrolled = false,
    targetJobId = null,
    careerGoalId = null,
    maxDuration = null, // in weeks
    priceMax = null
  } = options;

  try {
    // Get user profile and skills
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        profile: true,
        enrollments: { select: { courseId: true } }
      }
    });

    if (!user) {
      return { recommendations: [], error: 'User not found' };
    }

    const enrolledCourseIds = user.enrollments.map(e => e.courseId);
    const userSkills = user.skills.map(s => ({
      id: s.skillId,
      name: s.skill.name,
      level: s.level
    }));

    // Get career goals if any
    const careerGoal = careerGoalId 
      ? await prisma.careerGoal.findFirst({
          where: { id: careerGoalId, userId }
        })
      : await prisma.careerGoal.findFirst({
          where: { userId, status: 'active' },
          orderBy: { createdAt: 'desc' }
        });

    // Get target job skills if specified
    let targetJobSkills = [];
    if (targetJobId) {
      const job = await prisma.job.findUnique({
        where: { id: targetJobId },
        include: { 
          skills: { include: { skill: true } } 
        }
      });
      if (job) {
        targetJobSkills = job.skills.map(s => ({
          id: s.skillId,
          name: s.skill.name,
          required: s.isRequired,
          level: s.minLevel
        }));
      }
    }

    // Analyze skill gaps
    let skillGaps = [];
    if (targetJobId) {
      const gapAnalysis = await skillsGap.analyzeSkillGap({
        prisma,
        userId,
        jobId: targetJobId
      });
      skillGaps = [
        ...gapAnalysis.missingSkills.map(s => ({ ...s, severity: 'missing' })),
        ...gapAnalysis.underqualifiedSkills.map(s => ({ ...s, severity: 'underqualified' }))
      ];
    }

    // Get all active courses
    const whereClause = { isActive: true };
    if (!includeEnrolled && enrolledCourseIds.length > 0) {
      whereClause.id = { notIn: enrolledCourseIds };
    }
    if (priceMax !== null) {
      whereClause.OR = [
        { priceInCents: { lte: priceMax } },
        { priceInCents: null }
      ];
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        skills: { include: { skill: true } },
        _count: { select: { enrollments: true } }
      },
      take: 100
    });

    // Score each course
    const scoredCourses = courses.map(course => {
      const score = calculateCourseScore(course, {
        userSkills,
        skillGaps,
        targetJobSkills,
        careerGoal,
        maxDuration
      });

      return {
        course,
        ...score
      };
    });

    // Sort by total score and take top results
    const recommendations = scoredCourses
      .filter(c => c.totalScore > 20)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map(r => ({
        id: r.course.id,
        title: r.course.title,
        description: r.course.description,
        category: r.course.category,
        provider: r.course.providerName,
        duration: r.course.duration,
        price: r.course.priceInCents 
          ? `$${(r.course.priceInCents / 100).toFixed(2)}`
          : 'Free',
        isOnline: r.course.isOnline,
        enrollmentCount: r.course._count.enrollments,
        score: r.totalScore,
        matchReasons: r.reasons,
        skillsAddressed: r.skillsAddressed,
        completionPrediction: r.completionPrediction
      }));

    return {
      recommendations,
      userProfile: {
        currentSkillCount: userSkills.length,
        skillGapCount: skillGaps.length,
        careerGoal: careerGoal?.title || null
      },
      filters: { targetJobId, careerGoalId, maxDuration, priceMax }
    };
  } catch (error) {
    logger.error('Course recommendation error', { userId, error: error.message });
    return { recommendations: [], error: error.message };
  }
}

/**
 * Calculate course score based on multiple factors
 */
function calculateCourseScore(course, context) {
  const { userSkills, skillGaps, targetJobSkills, careerGoal, maxDuration } = context;
  
  let totalScore = 0;
  const reasons = [];
  const skillsAddressed = [];

  // Get course skills
  const courseSkills = course.skills?.map(s => ({
    id: s.skillId,
    name: s.skill?.name
  })) || [];

  // 1. Skills Gap Score (40 points max)
  if (skillGaps.length > 0) {
    const addressedGaps = skillGaps.filter(gap =>
      courseSkills.some(cs => 
        cs.id === gap.skill?.id || 
        cs.name?.toLowerCase() === gap.skill?.name?.toLowerCase()
      )
    );

    if (addressedGaps.length > 0) {
      const gapScore = (addressedGaps.length / skillGaps.length) * WEIGHTS.SKILLS_GAP;
      totalScore += gapScore;
      
      skillsAddressed.push(...addressedGaps.map(g => g.skill?.name));
      reasons.push(`Addresses ${addressedGaps.length} skill gap${addressedGaps.length > 1 ? 's' : ''}`);
    }
  }

  // 2. Career Goal Score (25 points max)
  if (careerGoal?.targetRole) {
    const roleKeywords = careerGoal.targetRole.toLowerCase().split(/\s+/);
    const courseText = `${course.title} ${course.description} ${course.category}`.toLowerCase();
    
    const matchedKeywords = roleKeywords.filter(kw => courseText.includes(kw));
    if (matchedKeywords.length > 0) {
      const goalScore = (matchedKeywords.length / roleKeywords.length) * WEIGHTS.CAREER_GOAL;
      totalScore += goalScore;
      reasons.push(`Aligns with career goal: ${careerGoal.title}`);
    }
  }

  // 3. Job Match Score (20 points max)
  if (targetJobSkills.length > 0) {
    const matchedJobSkills = targetJobSkills.filter(js =>
      courseSkills.some(cs => 
        cs.id === js.id || 
        cs.name?.toLowerCase() === js.name?.toLowerCase()
      )
    );

    if (matchedJobSkills.length > 0) {
      const requiredMatches = matchedJobSkills.filter(s => s.required).length;
      const preferredMatches = matchedJobSkills.length - requiredMatches;
      
      const jobScore = (
        (requiredMatches / Math.max(1, targetJobSkills.filter(s => s.required).length)) * WEIGHTS.JOB_MATCH * 0.7 +
        (preferredMatches / Math.max(1, targetJobSkills.filter(s => !s.required).length)) * WEIGHTS.JOB_MATCH * 0.3
      );
      totalScore += jobScore;

      skillsAddressed.push(...matchedJobSkills.map(s => s.name));
      reasons.push(`Teaches ${matchedJobSkills.length} job-relevant skill${matchedJobSkills.length > 1 ? 's' : ''}`);
    }
  }

  // 4. Popularity Score (10 points max)
  const enrollmentCount = course._count?.enrollments || 0;
  const popularityScore = Math.min(WEIGHTS.POPULARITY, Math.log10(enrollmentCount + 1) * 3);
  totalScore += popularityScore;

  if (enrollmentCount > 100) {
    reasons.push('Highly popular course');
  }

  // 5. Duration Fit Score (5 points max)
  if (maxDuration) {
    const courseDurationWeeks = parseDurationToWeeks(course.duration);
    if (courseDurationWeeks && courseDurationWeeks <= maxDuration) {
      totalScore += WEIGHTS.COMPLETION_TIME;
      reasons.push('Fits your available time');
    }
  } else {
    totalScore += WEIGHTS.COMPLETION_TIME * 0.5; // Neutral score
  }

  // Calculate completion prediction
  const completionPrediction = predictCompletion(course, context);

  return {
    totalScore: Math.round(totalScore),
    reasons,
    skillsAddressed: [...new Set(skillsAddressed)],
    completionPrediction
  };
}

/**
 * Parse duration string to weeks
 */
function parseDurationToWeeks(duration) {
  if (!duration) return null;
  
  const lower = duration.toLowerCase();
  
  // Match patterns like "4 weeks", "2 months", "6 hours"
  const weekMatch = lower.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1]);
  
  const monthMatch = lower.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1]) * 4;
  
  const hourMatch = lower.match(/(\d+)\s*hour/);
  if (hourMatch) return Math.ceil(parseInt(hourMatch[1]) / 10); // Assume 10 hrs/week
  
  const dayMatch = lower.match(/(\d+)\s*day/);
  if (dayMatch) return Math.ceil(parseInt(dayMatch[1]) / 5); // 5 days = 1 week
  
  return null;
}

/**
 * Predict completion likelihood
 */
function predictCompletion(course, context) {
  let likelihood = 70; // Base likelihood
  const factors = [];

  // Check if user has completed similar courses
  const userSkillNames = context.userSkills.map(s => s.name?.toLowerCase());
  const courseCategory = course.category?.toLowerCase();

  if (userSkillNames.some(s => courseCategory?.includes(s))) {
    likelihood += 10;
    factors.push('You have related skills');
  }

  // Online courses are often easier to complete
  if (course.isOnline) {
    likelihood += 5;
    factors.push('Flexible online format');
  }

  // Shorter courses have higher completion
  const weeks = parseDurationToWeeks(course.duration);
  if (weeks && weeks <= 4) {
    likelihood += 10;
    factors.push('Short duration');
  } else if (weeks && weeks > 12) {
    likelihood -= 10;
    factors.push('Extended commitment required');
  }

  return {
    percentage: Math.min(95, Math.max(30, likelihood)),
    factors
  };
}

/**
 * Generate learning path for a career goal
 * @param {string} userId - User ID
 * @param {string} targetRole - Target job role
 */
async function generateLearningPath(userId, targetRole) {
  try {
    // Get user's current skills
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        enrollments: { 
          include: { course: true },
          where: { status: { not: 'DROPPED' } }
        }
      }
    });

    if (!user) {
      return { error: 'User not found' };
    }

    // Find jobs matching the target role
    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: targetRole, mode: 'insensitive' } },
          { description: { contains: targetRole, mode: 'insensitive' } }
        ]
      },
      include: {
        skills: { include: { skill: true } }
      },
      take: 10
    });

    // Aggregate required skills from matching jobs
    const requiredSkillsMap = new Map();
    jobs.forEach(job => {
      job.skills.forEach(js => {
        const key = js.skill?.name?.toLowerCase();
        if (key) {
          const existing = requiredSkillsMap.get(key);
          if (!existing || js.isRequired) {
            requiredSkillsMap.set(key, {
              name: js.skill.name,
              id: js.skillId,
              required: js.isRequired,
              frequency: (existing?.frequency || 0) + 1
            });
          }
        }
      });
    });

    // Get skills user doesn't have
    const userSkillNames = user.skills.map(s => s.skill?.name?.toLowerCase());
    const missingSkills = Array.from(requiredSkillsMap.values())
      .filter(s => !userSkillNames.includes(s.name.toLowerCase()))
      .sort((a, b) => b.frequency - a.frequency);

    // Find courses that teach missing skills
    const courseSkills = await prisma.courseSkill.findMany({
      where: {
        skill: {
          name: { in: missingSkills.map(s => s.name), mode: 'insensitive' }
        }
      },
      include: {
        skill: true,
        course: {
          include: { _count: { select: { enrollments: true } } }
        }
      }
    });

    // Group courses by skill and pick the best for each
    const skillToCourse = new Map();
    courseSkills.forEach(cs => {
      if (!cs.course.isActive) return;
      
      const skillName = cs.skill.name.toLowerCase();
      const existing = skillToCourse.get(skillName);
      
      if (!existing || (cs.course._count.enrollments > existing.course._count.enrollments)) {
        skillToCourse.set(skillName, cs);
      }
    });

    // Build learning path
    const path = missingSkills
      .slice(0, 6) // Limit to 6 skills
      .map((skill, index) => {
        const courseSkill = skillToCourse.get(skill.name.toLowerCase());
        return {
          step: index + 1,
          skill: skill.name,
          required: skill.required,
          demandLevel: skill.frequency > 5 ? 'High' : skill.frequency > 2 ? 'Medium' : 'Low',
          recommendedCourse: courseSkill ? {
            id: courseSkill.course.id,
            title: courseSkill.course.title,
            provider: courseSkill.course.providerName,
            duration: courseSkill.course.duration,
            enrollmentCount: courseSkill.course._count.enrollments
          } : null
        };
      });

    // Calculate total duration
    let totalWeeks = 0;
    path.forEach(step => {
      if (step.recommendedCourse?.duration) {
        const weeks = parseDurationToWeeks(step.recommendedCourse.duration);
        if (weeks) totalWeeks += weeks;
      }
    });

    return {
      targetRole,
      currentSkillCount: user.skills.length,
      missingSkillCount: missingSkills.length,
      learningPath: path,
      estimatedDuration: `${totalWeeks} weeks`,
      jobsAnalyzed: jobs.length
    };
  } catch (error) {
    logger.error('Learning path generation error', { userId, targetRole, error: error.message });
    return { error: error.message };
  }
}

/**
 * Get courses similar to one a user viewed/enrolled in
 * @param {string} courseId - Reference course ID
 * @param {number} limit - Max results
 */
async function getSimilarCourses(courseId, limit = 5) {
  // Use semantic search if available
  if (semanticSearch.isAvailable()) {
    const results = await semanticSearch.semanticSearch(
      '', // Empty query - we'll use the document itself
      'courses',
      { limit }
    );
    
    // Filter out the reference course
    return results.results?.filter(c => c.id !== courseId) || [];
  }

  // Fallback to skill-based similarity
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { skills: { include: { skill: true } } }
    });

    if (!course) return [];

    const courseSkillIds = course.skills.map(s => s.skillId);
    const category = course.category;

    // Find courses with overlapping skills or same category
    const similarCourses = await prisma.course.findMany({
      where: {
        id: { not: courseId },
        isActive: true,
        OR: [
          { skills: { some: { skillId: { in: courseSkillIds } } } },
          { category }
        ]
      },
      include: {
        skills: { include: { skill: true } },
        _count: { select: { enrollments: true } }
      },
      take: limit * 2
    });

    // Score by similarity
    return similarCourses
      .map(c => {
        const sharedSkills = c.skills.filter(s => courseSkillIds.includes(s.skillId)).length;
        const sameCategory = c.category === category ? 1 : 0;
        return {
          ...c,
          similarityScore: sharedSkills * 2 + sameCategory
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit)
      .map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        provider: c.providerName,
        duration: c.duration,
        enrollmentCount: c._count.enrollments
      }));
  } catch (error) {
    logger.error('Similar courses error', { courseId, error: error.message });
    return [];
  }
}
