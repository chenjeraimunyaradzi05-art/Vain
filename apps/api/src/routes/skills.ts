import express from 'express';
import { prisma } from '../db';
import auth from '../middleware/auth';
import { analyzeSkillGap } from '../lib/skillsGap';

const router = express.Router();
const authenticate = auth.authenticate;

// =============================================================================
// SKILLS CATALOG
// =============================================================================

/**
 * GET /skills - List all skills (optionally filter by category)
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = '100' } = req.query as any;

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const skills = await prisma.skill.findMany({
      where,
      orderBy: { name: 'asc' },
      take: parseInt(limit as string),
    });

    res.json({ skills });
  } catch (err) {
    console.error('List skills error:', err);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

/**
 * GET /skills/categories - List all skill categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.skill.groupBy({
      by: ['category'],
      where: { isActive: true, category: { not: null } },
      _count: true,
    });

    res.json({
      categories: categories.map((c) => ({
        name: c.category,
        count: c._count,
      })),
    });
  } catch (err) {
    console.error('List skill categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// =============================================================================
// USER SKILLS
// =============================================================================

/**
 * GET /skills/user/me - Get current user's skills
 */
router.get('/user/me', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { skill: { name: 'asc' } },
    });

    res.json({ skills: userSkills });
  } catch (err) {
    console.error('Get user skills error:', err);
    res.status(500).json({ error: 'Failed to fetch user skills' });
  }
});

/**
 * POST /skills/user - Add skill to current user
 */
router.post('/user', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { skillId, level, yearsExp } = req.body;

    if (!skillId) {
      return void res.status(400).json({ error: 'skillId is required' });
    }

    const userSkill = await prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: {
        userId,
        skillId,
        level: level || 'beginner',
        yearsExp: yearsExp || null,
      },
      update: {
        level: level || undefined,
        yearsExp: yearsExp !== undefined ? yearsExp : undefined,
      },
      include: { skill: true },
    });

    res.json({ userSkill });
  } catch (err) {
    console.error('Add user skill error:', err);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

/**
 * DELETE /skills/user/:skillId - Remove skill from current user
 */
router.delete('/user/:skillId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { skillId } = req.params;

    await prisma.userSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });

    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete user skill error:', err);
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

// =============================================================================
// JOB SKILLS
// =============================================================================

/**
 * GET /skills/job/:jobId - Get skills required for a job
 */
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const jobSkills = await prisma.jobSkill.findMany({
      where: { jobId },
      include: { skill: true },
    });

    res.json({ skills: jobSkills });
  } catch (err) {
    console.error('Get job skills error:', err);
    res.status(500).json({ error: 'Failed to fetch job skills' });
  }
});

// =============================================================================
// SKILLS GAP ANALYSIS (Phase 2 Steps 176-200)
// =============================================================================

/**
 * GET /skills/gap-analysis/:jobId - Analyze skill gaps for a job
 */
router.get('/gap-analysis/:jobId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { jobId } = req.params;

    const result = await analyzeSkillGap({ prisma, userId, jobId });
    res.json(result);
  } catch (err) {
    console.error('Gap analysis error:', err);
    res.status(500).json({ error: 'Failed to perform gap analysis' });
  }
});

/**
 * POST /skills/gap-analysis/target-role - Analyze gaps for a target role
 */
router.post('/gap-analysis/target-role', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { targetRole, targetSkills } = req.body || {};

    if (!targetRole) {
      return void res.status(400).json({ error: 'targetRole is required' });
    }

    // Get user's current skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillMap = new Map(userSkills.map(us => [us.skillId, us]));

    // If targetSkills provided, use those; otherwise find from similar jobs
    let requiredSkills: any[] = [];

    if (targetSkills && Array.isArray(targetSkills)) {
      requiredSkills = targetSkills.map((s: any) => ({
        skillId: s.skillId,
        skillName: s.name,
        requiredLevel: s.level || 'intermediate',
        isRequired: s.required !== false,
      }));
    } else {
      // Find skills from jobs with similar titles
      const similarJobs = await prisma.job.findMany({
        where: {
          title: { contains: targetRole, mode: 'insensitive' },
          isActive: true,
        },
        take: 10,
        select: { id: true },
      });

      if (similarJobs.length > 0) {
        const jobIds = similarJobs.map(j => j.id);
        const jobSkills = await prisma.jobSkill.findMany({
          where: { jobId: { in: jobIds } },
          include: { skill: true },
        });

        // Aggregate skills by frequency
        const skillFrequency = new Map<string, { skill: any; count: number; required: number }>();
        jobSkills.forEach(js => {
          const existing = skillFrequency.get(js.skillId) || { skill: js.skill, count: 0, required: 0 };
          existing.count++;
          if (js.isRequired) existing.required++;
          skillFrequency.set(js.skillId, existing);
        });

        requiredSkills = Array.from(skillFrequency.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(s => ({
            skillId: s.skill.id,
            skillName: s.skill.name,
            requiredLevel: s.required > s.count / 2 ? 'intermediate' : 'beginner',
            isRequired: s.required > s.count / 2,
            demandFrequency: s.count,
          }));
      }
    }

    // Analyze gaps
    const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
    const gaps: any[] = [];
    const matches: any[] = [];
    const exceeded: any[] = [];

    requiredSkills.forEach(required => {
      const userSkill = userSkillMap.get(required.skillId);

      if (!userSkill) {
        gaps.push({
          ...required,
          currentLevel: null,
          gapType: 'missing',
          priority: required.isRequired ? 'high' : 'medium',
        });
      } else {
        const userLevelIndex = levelOrder.indexOf(userSkill.level || 'beginner');
        const requiredLevelIndex = levelOrder.indexOf(required.requiredLevel);

        if (userLevelIndex < requiredLevelIndex) {
          gaps.push({
            ...required,
            currentLevel: userSkill.level,
            gapType: 'level-gap',
            levelsNeeded: requiredLevelIndex - userLevelIndex,
            priority: required.isRequired ? 'high' : 'medium',
          });
        } else if (userLevelIndex > requiredLevelIndex) {
          exceeded.push({
            ...required,
            currentLevel: userSkill.level,
          });
        } else {
          matches.push({
            ...required,
            currentLevel: userSkill.level,
          });
        }
      }
    });

    // Calculate readiness score
    const totalRequired = requiredSkills.filter(s => s.isRequired).length;
    const matchedRequired = [...matches, ...exceeded].filter(s => s.isRequired).length;
    const readinessScore = totalRequired > 0
      ? Math.round((matchedRequired / totalRequired) * 100)
      : 100;

    // Generate learning recommendations
    const learningRecommendations = gaps
      .sort((a, b) => (a.priority === 'high' ? -1 : 1))
      .slice(0, 5)
      .map(gap => ({
        skill: gap.skillName,
        recommendation: gap.gapType === 'missing'
          ? `Learn ${gap.skillName} fundamentals`
          : `Upgrade ${gap.skillName} from ${gap.currentLevel} to ${gap.requiredLevel}`,
        suggestedResources: [
          { type: 'course', name: `${gap.skillName} for Beginners`, provider: 'TAFE' },
          { type: 'practice', name: `${gap.skillName} projects`, provider: 'Self-paced' },
        ],
        estimatedTime: gap.gapType === 'missing' ? '2-3 months' : '1-2 months',
      }));

    res.json({
      targetRole,
      analysis: {
        totalSkillsAnalyzed: requiredSkills.length,
        matching: matches.length,
        gaps: gaps.length,
        exceeded: exceeded.length,
        readinessScore,
      },
      gaps: gaps.sort((a, b) => (a.isRequired ? -1 : 1)),
      matches,
      exceeded,
      learningRecommendations,
      estimatedTimeToReady: gaps.length === 0
        ? 'Ready now'
        : gaps.length <= 2
          ? '1-3 months'
          : gaps.length <= 5
            ? '3-6 months'
            : '6-12 months',
    });
  } catch (err) {
    console.error('Target role gap analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze target role' });
  }
});

/**
 * GET /skills/demand - Get skill demand insights
 */
router.get('/demand', async (req, res) => {
  try {
    const { limit = '20' } = req.query;

    // Get skill demand from recent job postings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const demandData = await prisma.jobSkill.groupBy({
      by: ['skillId'],
      where: {
        job: {
          createdAt: { gte: thirtyDaysAgo },
          isActive: true,
        },
      },
      _count: true,
      orderBy: { _count: { skillId: 'desc' } },
      take: parseInt(limit as string),
    });

    const skillIds = demandData.map(d => d.skillId);
    const skills = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
    });

    const skillMap = new Map(skills.map(s => [s.id, s]));

    const insights = demandData.map(d => ({
      skill: skillMap.get(d.skillId),
      demandCount: d._count,
      trend: 'stable', // Would calculate from historical data
    }));

    res.json({
      period: '30 days',
      insights,
      topCategories: [...new Set(skills.map(s => s.category).filter(Boolean))].slice(0, 5),
    });
  } catch (err) {
    console.error('Skill demand error:', err);
    res.status(500).json({ error: 'Failed to fetch demand data' });
  }
});

/**
 * GET /skills/salary-impact - Get salary impact of skills
 */
router.get('/salary-impact', async (req, res) => {
  try {
    const { skillId } = req.query;

    // Get jobs with and without the skill to compare salaries
    const jobsWithSkill = await prisma.job.findMany({
      where: {
        isActive: true,
        ...(skillId ? {
          jobSkills: { some: { skillId: String(skillId) } },
        } : {}),
        salaryLow: { not: null },
      },
      select: { salaryLow: true, salaryHigh: true },
      take: 100,
    });

    const salaries = jobsWithSkill.map(j => ({
      min: j.salaryLow || 0,
      max: j.salaryHigh || j.salaryLow || 0,
    }));

    const avgMin = salaries.length > 0
      ? Math.round(salaries.reduce((sum, s) => sum + s.min, 0) / salaries.length)
      : null;

    const avgMax = salaries.length > 0
      ? Math.round(salaries.reduce((sum, s) => sum + s.max, 0) / salaries.length)
      : null;

    res.json({
      skillId: skillId || 'all',
      sampleSize: salaries.length,
      salaryRange: {
        averageMin: avgMin,
        averageMax: avgMax,
        median: salaries.length > 0
          ? salaries.sort((a, b) => a.min - b.min)[Math.floor(salaries.length / 2)].min
          : null,
      },
      note: 'Salary data based on job listings. Actual salaries may vary.',
    });
  } catch (err) {
    console.error('Salary impact error:', err);
    res.status(500).json({ error: 'Failed to fetch salary impact' });
  }
});

/**
 * POST /skills/endorsements - Request skill endorsement
 */
router.post('/endorsements', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { skillId, endorserId, message } = req.body || {};

    if (!skillId || !endorserId) {
      return void res.status(400).json({ error: 'skillId and endorserId are required' });
    }

    // Check if user has the skill
    const userSkill = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });

    if (!userSkill) {
      return void res.status(400).json({ error: 'You must add this skill before requesting endorsements' });
    }

    // In a full implementation, would send notification to endorser
    res.json({
      status: 'pending',
      message: 'Endorsement request sent',
      endorsementRequest: {
        skillId,
        endorserId,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('Endorsement request error:', err);
    res.status(500).json({ error: 'Failed to request endorsement' });
  }
});

/**
 * GET /skills/transferable - Identify transferable skills
 */
router.get('/transferable', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { fromRole, toRole } = req.query;

    // Get user's skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    // Mock transferable skills mapping
    const transferableCategories = ['Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Time Management'];

    const transferable = userSkills
      .filter(us => transferableCategories.includes(us.skill.category || ''))
      .map(us => ({
        skill: us.skill,
        level: us.level,
        transferabilityScore: 'high',
        applicableTo: ['Most roles', 'Leadership positions', 'Client-facing roles'],
      }));

    const technical = userSkills
      .filter(us => !transferableCategories.includes(us.skill.category || ''))
      .map(us => ({
        skill: us.skill,
        level: us.level,
        transferabilityScore: 'varies',
        applicableTo: ['Related technical roles'],
      }));

    res.json({
      fromRole: fromRole || 'Current role',
      toRole: toRole || 'Target role',
      transferableSkills: transferable,
      technicalSkills: technical,
      summary: {
        totalSkills: userSkills.length,
        highlyTransferable: transferable.length,
        technical: technical.length,
      },
      recommendations: [
        'Highlight transferable skills when applying to new industries',
        'Consider how technical skills apply to adjacent roles',
        'Soft skills are valuable across all career transitions',
      ],
    });
  } catch (err) {
    console.error('Transferable skills error:', err);
    res.status(500).json({ error: 'Failed to identify transferable skills' });
  }
});

/**
 * GET /skills/recommendations - Get personalized skill recommendations
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    // Get user's current skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      select: { skillId: true, level: true },
    });

    const userSkillIds = userSkills.map((us) => us.skillId);

    // Find trending skills from recent job postings
    const trendingJobSkills = await prisma.jobSkill.groupBy({
      by: ['skillId'],
      where: {
        skillId: { notIn: userSkillIds.length > 0 ? userSkillIds : ['none'] },
      },
      _count: true,
      orderBy: { _count: { skillId: 'desc' } },
      take: 10,
    });

    const trendingSkillIds = trendingJobSkills.map((s) => s.skillId);
    const trendingSkills = await prisma.skill.findMany({
      where: { id: { in: trendingSkillIds } },
    });

    // Find skills that can be upgraded
    const upgradableSkills = userSkills
      .filter((us) => us.level !== 'expert')
      .slice(0, 5);

    res.json({
      trending: trendingSkills.map((s) => ({
        ...s,
        demandCount: trendingJobSkills.find((t) => t.skillId === s.id)?._count || 0,
      })),
      upgradable: upgradableSkills,
    });
  } catch (err) {
    console.error('Skill recommendations error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;


