// @ts-nocheck
/**
 * Job Recommendations Route
 * 
 * Provides personalized job recommendations based on user profile.
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import { getRecommendations, calculateRecommendationScore } from '../lib/jobRecommendations';
import { parsePagination, apiResponse, paginationMeta } from '../lib/apiVersion';
import { prisma as prismaClient } from '../db';

const prisma = prismaClient as any;

const router = express.Router();

/**
 * GET /recommendations
 * 
 * Get personalized job recommendations for the authenticated user.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * - minScore: Minimum match score 0-1 (default: 0.3)
 */
router.get('/', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = parsePagination(req.query);
  const minScore = parseFloat(req.query.minScore) || 0.3;

  try {

    const result = await getRecommendations(prisma, userId, {
      page,
      limit: Math.min(limit, 50),
      minScore,
    });

    // Format response
    const jobs = result.jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: {
        id: job.company?.id,
        name: job.company?.name || job.companyName,
        hasRAP: job.company?.hasRAP,
        isIndigenousOwned: job.company?.isIndigenousOwned,
      },
      location: job.location,
      remote: job.remote,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      type: job.type,
      experienceLevel: job.experienceLevel,
      createdAt: job.createdAt,
      matchScore: job.recommendationScore.total,
      matchLevel: job.recommendationScore.match,
      matchBreakdown: job.recommendationScore.breakdown,
    }));

    res.json(apiResponse(jobs, {
      meta: paginationMeta(page, limit, result.total).pagination,
    }));
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * GET /recommendations/:jobId/score
 * 
 * Get the recommendation score for a specific job.
 */
router.get('/:jobId/score', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { jobId } = req.params;

  try {
    const { prisma } = require('../db');

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        preferences: true,
      },
    });

    if (!user) {
      return void res.status(404).json({ error: 'User not found' });
    }

    // Get job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
      },
    });

    if (!job) {
      return void res.status(404).json({ error: 'Job not found' });
    }

    // Build user profile
    const userProfile = {
      skills: user.skills?.map(s => s.name) || [],
      yearsExperience: user.yearsExperience || 0,
      location: user.location,
      preferredIndustries: user.preferences?.industries || [],
      isIndigenous: user.isAboriginalOrTorresStraitIslander,
      minSalary: user.preferences?.minSalary,
      prefersRemote: user.preferences?.remoteOnly,
    };

    // Calculate score
    const score = calculateRecommendationScore(userProfile, {
      ...job,
      requiredSkills: job.skills || [],
      employer: job.company,
    });

    res.json({
      jobId,
      score: score.total,
      match: score.match,
      breakdown: score.breakdown,
      tips: generateMatchTips(score.breakdown),
    });
  } catch (error) {
    console.error('[Recommendations] Score error:', error);
    res.status(500).json({ error: 'Failed to calculate score' });
  }
});

/**
 * POST /recommendations/feedback
 * 
 * Submit feedback on a recommendation (helps improve matching).
 */
router.post('/feedback', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { jobId, feedback, reason } = req.body;

  if (!jobId || !feedback) {
    return void res.status(400).json({ 
      error: 'Missing required fields',
      required: ['jobId', 'feedback'],
    });
  }

  const validFeedback = ['interested', 'not_interested', 'applied', 'irrelevant'];
  if (!validFeedback.includes(feedback)) {
    return void res.status(400).json({
      error: 'Invalid feedback value',
      valid: validFeedback,
    });
  }

  try {
    const { prisma } = require('../db');

    await prisma.recommendationFeedback.create({
      data: {
        userId,
        jobId,
        feedback,
        reason,
      },
    });

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('[Recommendations] Feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

/**
 * Generate tips for improving match score
 */
function generateMatchTips(breakdown) {
  const tips = [];

  if (breakdown.skillMatch < 0.5) {
    tips.push({
      area: 'skills',
      tip: 'Add more skills to your profile to improve matching',
    });
  }

  if (breakdown.locationMatch < 0.5) {
    tips.push({
      area: 'location',
      tip: 'Consider enabling remote work preferences',
    });
  }

  if (breakdown.experienceMatch < 0.5) {
    tips.push({
      area: 'experience',
      tip: 'Update your years of experience in your profile',
    });
  }

  if (breakdown.industryMatch < 0.5) {
    tips.push({
      area: 'industry',
      tip: 'Add preferred industries to your profile settings',
    });
  }

  return tips;
}

// =============================================================================
// MENTOR RECOMMENDATIONS
// =============================================================================

/**
 * GET /recommendations/mentors
 * 
 * Get personalized mentor recommendations for the authenticated user.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 20)
 * - industry: Filter by industry
 * - skills: Comma-separated skills to match
 */
router.get('/mentors', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = parsePagination(req.query);
  const industry = req.query.industry ? String(req.query.industry) : undefined;
  const skillsFilter = req.query.skills 
    ? String(req.query.skills).split(',').map(s => s.trim().toLowerCase())
    : [];

  try {
    // Get user profile for matching
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        preferences: true,
      },
    });

    if (!user) {
      return void res.status(404).json({ error: 'User not found' });
    }

    // Build query for mentors
    const mentorWhere: any = {
      verified: true,
      user: {
        id: { not: userId }, // Exclude self
        status: 'ACTIVE',
      },
    };

    if (industry) {
      mentorWhere.industries = { has: industry };
    }

    // Fetch verified mentors
    const mentorProfiles = await prisma.mentorProfile.findMany({
      where: mentorWhere,
      take: Math.min(limit, 20) * 3, // Fetch extra for scoring
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            location: true,
            bio: true,
          },
        },
      },
    });

    // Calculate match scores
    const userSkills = user.skills?.map(s => s.name.toLowerCase()) || [];
    const userIndustries = user.preferences?.industries || [];

    const scoredMentors = mentorProfiles.map(mentor => {
      let score = 0;
      const breakdown: any = {};

      // Skill match (40% weight)
      const mentorSkills = (mentor.expertise || []).map((s: string) => s.toLowerCase());
      const skillOverlap = userSkills.filter(s => mentorSkills.includes(s)).length;
      const skillMatch = mentorSkills.length > 0 
        ? skillOverlap / Math.max(userSkills.length, mentorSkills.length) 
        : 0;
      breakdown.skillMatch = skillMatch;
      score += skillMatch * 0.4;

      // Industry match (30% weight)
      const mentorIndustries = mentor.industries || [];
      const industryOverlap = userIndustries.filter(i => mentorIndustries.includes(i)).length;
      const industryMatch = mentorIndustries.length > 0 
        ? industryOverlap / Math.max(userIndustries.length, mentorIndustries.length)
        : 0;
      breakdown.industryMatch = industryMatch;
      score += industryMatch * 0.3;

      // Experience bonus (15% weight)
      const experienceScore = Math.min((mentor.yearsExperience || 0) / 10, 1);
      breakdown.experienceScore = experienceScore;
      score += experienceScore * 0.15;

      // Rating bonus (15% weight)
      const ratingScore = mentor.rating ? mentor.rating / 5 : 0.5;
      breakdown.ratingScore = ratingScore;
      score += ratingScore * 0.15;

      // Filter by skills if specified
      if (skillsFilter.length > 0) {
        const hasMatchingSkill = skillsFilter.some(s => mentorSkills.includes(s));
        if (!hasMatchingSkill) {
          score = 0; // Exclude non-matching
        }
      }

      return {
        mentor: {
          id: mentor.id,
          userId: mentor.userId,
          firstName: mentor.user.firstName,
          lastName: mentor.user.lastName,
          avatar: mentor.user.avatar,
          location: mentor.user.location,
          bio: mentor.user.bio,
          expertise: mentor.expertise,
          industries: mentor.industries,
          yearsExperience: mentor.yearsExperience,
          rating: mentor.rating,
          totalSessions: mentor.totalSessions || 0,
          verified: mentor.verified,
        },
        matchScore: Math.round(score * 100),
        matchLevel: score >= 0.7 ? 'excellent' : score >= 0.5 ? 'good' : score >= 0.3 ? 'fair' : 'low',
        breakdown,
      };
    });

    // Sort by score and paginate
    const sorted = scoredMentors
      .filter(m => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    const startIdx = (page - 1) * limit;
    const paginated = sorted.slice(startIdx, startIdx + limit);

    res.json(apiResponse(paginated, {
      meta: paginationMeta(page, limit, sorted.length).pagination,
    }));
  } catch (error) {
    console.error('[Recommendations] Mentor error:', error);
    res.status(500).json({ error: 'Failed to get mentor recommendations' });
  }
});

/**
 * POST /recommendations/mentors/feedback
 * 
 * Submit feedback on a mentor recommendation.
 */
router.post('/mentors/feedback', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { mentorId, feedback, reason } = req.body;

  if (!mentorId || !feedback) {
    return void res.status(400).json({
      error: 'Missing required fields',
      required: ['mentorId', 'feedback'],
    });
  }

  const validFeedback = ['interested', 'not_interested', 'connected', 'irrelevant'];
  if (!validFeedback.includes(feedback)) {
    return void res.status(400).json({
      error: 'Invalid feedback value',
      valid: validFeedback,
    });
  }

  try {
    // Store feedback for improving recommendations
    await prisma.recommendationFeedback.create({
      data: {
        userId,
        mentorId,
        feedback,
        reason,
        type: 'mentor',
      },
    });

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('[Recommendations] Mentor feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

export default router;


