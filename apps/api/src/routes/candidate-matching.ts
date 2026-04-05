// @ts-nocheck
/**
 * Candidate Matching API Routes
 * 
 * AI-powered candidate ranking and comparison for employers
 * 
 * Endpoints:
 * - GET /candidate-matching/jobs/:jobId/ranked - Get ranked applicants
 * - GET /candidate-matching/jobs/:jobId/stats - Get applicant statistics
 * - GET /candidate-matching/jobs/:jobId/compare - Compare two candidates
 * - GET /candidate-matching/jobs/:jobId/applicants/:userId/score - Get single candidate score
 * - POST /candidate-matching/jobs/:jobId/shortlist - Add to shortlist based on AI ranking
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import {
  rankApplicantsForJob,
  getApplicantStats,
  compareCandidates,
  calculateCandidateScore,
  RED_FLAG_TYPES,
  GREEN_FLAG_TYPES
} from '../lib/candidateMatching';

const router = express.Router();

/**
 * Middleware to verify job ownership
 */
async function verifyJobOwner(req, res, next) {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { userId: true, companyId: true }
    });

    if (!job) {
      return void res.status(404).json({ error: 'Job not found' });
    }

    // Check if user owns the job or is admin of the company
    if (job.userId !== userId) {
      // Check company admin
      const company = await prisma.companyProfile.findFirst({
        where: {
          id: job.companyId,
          OR: [
            { userId },
            { admins: { some: { userId } } }
          ]
        }
      });

      if (!company) {
        return void res.status(403).json({ error: 'Not authorized to view applicants for this job' });
      }
    }

    req.job = job;
    next();
  } catch (err) {
    console.error('Job ownership verification error:', err);
    res.status(500).json({ error: 'Failed to verify job access' });
  }
}

/**
 * GET /candidate-matching/jobs/:jobId/ranked
 * Get AI-ranked list of applicants for a job
 */
router.get('/jobs/:jobId/ranked', authenticateJWT, verifyJobOwner, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { 
      minScore = 0, 
      tier = null, 
      includeWithdrawn = false,
      limit = 50 
    } = req.query;

    const ranked = await rankApplicantsForJob(jobId, {
      minScore: Number(minScore),
      tier: tier || null,
      includeWithdrawn: includeWithdrawn === 'true',
      limit: Number(limit)
    });

    res.json({
      jobId,
      totalRanked: ranked.length,
      applicants: ranked,
      rankedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Rank applicants error:', err);
    res.status(500).json({ error: 'Failed to rank applicants' });
  }
});

/**
 * GET /candidate-matching/jobs/:jobId/stats
 * Get applicant statistics for a job
 */
router.get('/jobs/:jobId/stats', authenticateJWT, verifyJobOwner, async (req, res) => {
  try {
    const { jobId } = req.params;
    const stats = await getApplicantStats(jobId);

    res.json({
      jobId,
      stats,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Applicant stats error:', err);
    res.status(500).json({ error: 'Failed to get applicant statistics' });
  }
});

/**
 * GET /candidate-matching/jobs/:jobId/compare
 * Compare two candidates side by side
 */
router.get('/jobs/:jobId/compare', authenticateJWT, verifyJobOwner, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { candidate1, candidate2 } = req.query;

    if (!candidate1 || !candidate2) {
      return void res.status(400).json({ 
        error: 'Missing required query parameters: candidate1 and candidate2' 
      });
    }

    const comparison = await compareCandidates(jobId, candidate1, candidate2);

    res.json({
      jobId,
      comparison,
      comparedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Compare candidates error:', err);
    if (err.message.includes('not found')) {
      return void res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to compare candidates' });
  }
});

/**
 * GET /candidate-matching/jobs/:jobId/applicants/:userId/score
 * Get detailed score for a single applicant
 */
router.get('/jobs/:jobId/applicants/:userId/score', authenticateJWT, verifyJobOwner, async (req, res) => {
  try {
    const { jobId, userId } = req.params;

    // Get job with requirements
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requiredSkills: true,
        preferredSkills: true
      }
    });

    // Get application and candidate
    const application = await prisma.jobApplication.findFirst({
      where: { jobId, userId },
      include: {
        user: {
          include: {
            profile: true,
            skills: true
          }
        }
      }
    });

    if (!application) {
      return void res.status(404).json({ error: 'Application not found' });
    }

    const candidate = {
      ...application.user?.profile,
      userId: application.userId,
      skills: application.user?.skills || [],
      yearsExperience: application.user?.profile?.yearsExperience,
      qualifications: application.user?.profile?.qualifications || [],
      location: application.user?.profile?.location,
      expectedSalary: application.expectedSalary,
      verified: application.user?.profile?.verified
    };

    const matchResult = await calculateCandidateScore(candidate, job, application);

    res.json({
      applicationId: application.id,
      userId,
      appliedAt: application.createdAt,
      status: application.status,
      candidate: {
        name: application.user?.profile?.name || application.user?.email?.split('@')[0],
        email: application.user?.email,
        avatar: application.user?.profile?.avatar,
        location: application.user?.profile?.location,
        yearsExperience: application.user?.profile?.yearsExperience
      },
      ...matchResult
    });
  } catch (err) {
    console.error('Get candidate score error:', err);
    res.status(500).json({ error: 'Failed to get candidate score' });
  }
});

/**
 * POST /candidate-matching/jobs/:jobId/shortlist
 * Bulk add top-ranked candidates to shortlist
 */
router.post('/jobs/:jobId/shortlist', authenticateJWT, verifyJobOwner, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { 
      minScore = 70, 
      tier = 'EXCELLENT',
      maxCount = 10 
    } = req.body;

    // Get top candidates
    const ranked = await rankApplicantsForJob(jobId, {
      minScore: Number(minScore),
      tier,
      limit: Number(maxCount)
    });

    if (ranked.length === 0) {
      return void res.json({
        jobId,
        shortlisted: 0,
        message: 'No candidates meet the criteria'
      });
    }

    // Update application status to SHORTLISTED
    const applicationIds = ranked.map(r => r.applicationId);
    
    const updated = await prisma.jobApplication.updateMany({
      where: {
        id: { in: applicationIds },
        status: { notIn: ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED'] }
      },
      data: {
        status: 'SHORTLISTED',
        updatedAt: new Date()
      }
    });

    res.json({
      jobId,
      shortlisted: updated.count,
      candidates: ranked.map(r => ({
        userId: r.userId,
        name: r.candidate.name,
        score: r.score,
        tier: r.tier
      }))
    });
  } catch (err) {
    console.error('Bulk shortlist error:', err);
    res.status(500).json({ error: 'Failed to shortlist candidates' });
  }
});

/**
 * GET /candidate-matching/reference/flags
 * Get reference data for red and green flags
 */
router.get('/reference/flags', authenticateJWT, (req, res) => {
  res.json({
    redFlags: Object.values(RED_FLAG_TYPES),
    greenFlags: Object.values(GREEN_FLAG_TYPES)
  });
});

/**
 * GET /candidate-matching/jobs/:jobId/insights
 * Get AI insights about the applicant pool
 */
router.get('/jobs/:jobId/insights', authenticateJWT, verifyJobOwner, async (req, res) => {
  try {
    const { jobId } = req.params;
    const stats = await getApplicantStats(jobId);
    const ranked = await rankApplicantsForJob(jobId, { minScore: 0, limit: 100 });

    // Generate insights
    const insights: any[] = [];

    // Talent pool quality
    if (stats.byTier.EXCELLENT + stats.byTier.GOOD >= 5) {
      insights.push({
        type: 'positive',
        title: 'Strong Talent Pool',
        message: `You have ${stats.byTier.EXCELLENT + stats.byTier.GOOD} well-qualified candidates`
      });
    } else if (stats.total > 0 && stats.byTier.EXCELLENT + stats.byTier.GOOD < 3) {
      insights.push({
        type: 'suggestion',
        title: 'Consider Broadening Criteria',
        message: 'Few candidates meet all requirements. Consider which skills could be developed on the job.'
      });
    }

    // Common skill gaps
    const allMissingSkills = ranked.flatMap(r => r.skillsAnalysis?.missingRequired || []);
    const skillGapCounts: Record<string, number> = {};
    allMissingSkills.forEach(skill => {
      skillGapCounts[skill] = (skillGapCounts[skill] || 0) + 1;
    });

    const commonGaps = Object.entries(skillGapCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (commonGaps.length > 0) {
      insights.push({
        type: 'info',
        title: 'Common Skill Gaps',
        message: `Most applicants are missing: ${commonGaps.map(([skill]) => skill).join(', ')}`,
        data: commonGaps.map(([skill, count]) => ({ skill, count }))
      });
    }

    // Cultural fit insights
    const withMentorship = ranked.filter(r => 
      r.greenFlags?.some(f => f.id === 'mentorship_active')
    ).length;

    if (withMentorship > 0) {
      insights.push({
        type: 'positive',
        title: 'Mentorship-Engaged Candidates',
        message: `${withMentorship} applicant(s) are actively participating in mentorship programs`
      });
    }

    // Red flag summary
    if (stats.withRedFlags > stats.total * 0.5) {
      insights.push({
        type: 'warning',
        title: 'Review Required',
        message: `${stats.withRedFlags} applicants have potential concerns that may need discussion`
      });
    }

    res.json({
      jobId,
      stats,
      insights,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Get insights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;


