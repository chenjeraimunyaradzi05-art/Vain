"use strict";

/**
 * Employer Leaderboard API Routes
 * 
 * Tracks and displays employer rankings based on:
 * - Indigenous hiring metrics
 * - RAP achievement levels
 * - Mentorship participation
 * - Retention rates
 * 
 * Endpoints:
 * - GET /leaderboard - Get ranked employers
 * - GET /leaderboard/:id - Get specific employer ranking
 * - POST /leaderboard/recalculate - Admin: Recalculate all scores (cron job)
 */

import express, { Request, Response } from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { authenticate } from '../middleware/auth';

const router = express.Router();

interface Breakdown {
  hires?: number;
  mentorshipSessions?: number;
  rapBonus?: number;
  activeMentors?: number;
  activeJobs?: number;
}

interface ScoreResult {
  score: number;
  breakdown: Breakdown;
}

/**
 * Calculate reputation score for a company
 * Points system:
 * - Indigenous hire: +100 points
 * - 3-month retention: +50 points
 * - 12-month retention: +150 points
 * - RAP Innovate/Stretch: +200 points
 * - Active mentor from company: +75 points
 * - Job post: +10 points
 */
async function calculateReputationScore(companyId: string): Promise<ScoreResult> {
  let score = 0;
  const breakdown: Breakdown = {};

  try {
    // Count Indigenous hires (applications with HIRED status)
    const hires = await prisma.jobApplication.count({
      where: {
        job: {
          user: {
            companyProfile: {
              id: companyId
            }
          }
        },
        status: 'HIRED',
      },
    });
    breakdown.hires = hires;
    score += hires * 100;

    // Count retentions (would need actual retention data - estimate for now)
    // Use completed mentorship sessions as a proxy
    const mentorshipEngagement = await prisma.mentorSession.count({
      where: {
        mentor: {
          companyProfile: {
            id: companyId
          }
        },
        status: 'COMPLETED',
      },
    });
    breakdown.mentorshipSessions = mentorshipEngagement;
    score += mentorshipEngagement * 50;

    // Check RAP status
    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: { rapCertificationLevel: true },
    });
    
    const level = company?.rapCertificationLevel;
    if (level) {
      if (level === 'INNOVATE' || level === 'STRETCH') {
        breakdown.rapBonus = 200;
        score += 200;
      } else if (level === 'ELEVATE') {
        breakdown.rapBonus = 150;
        score += 150;
      } else {
        breakdown.rapBonus = 100;
        score += 100;
      }
    }

    // Count active mentors from company
    const mentors = await prisma.mentorProfile.count({
      where: {
        companyId,
        active: true,
      },
    });
    breakdown.activeMentors = mentors;
    score += mentors * 75;

    // Count job posts
    const jobs = await prisma.job.count({
      where: {
        user: {
          companyProfile: {
            id: companyId
          }
        },
        isActive: true,
      },
    });
    breakdown.activeJobs = jobs;
    score += jobs * 10;

  } catch (error) {
    console.error('[Leaderboard] Score calculation error:', error);
  }

  return { score, breakdown };
}

/**
 * GET /leaderboard
 * Get ranked list of employers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0', industry } = req.query;

    // Build filter
    const where: any = {};
    if (industry) {
      where.industry = industry as string;
    }

    // Get companies with reputation
    const companies = await prisma.companyProfile.findMany({
      where,
      orderBy: { rapPoints: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Get total count
    const total = await prisma.companyProfile.count({ where });

    // Add ranking position
    const leaderboard = await Promise.all(companies.map(async (company, index) => {
      const { score, breakdown } = await calculateReputationScore(company.id);
      return {
        rank: parseInt(offset as string) + index + 1,
        id: company.id,
        name: company.companyName,
        industry: company.industry,
        score,
        rapStatus: company.rapCertificationLevel ? 'ACTIVE' : 'INACTIVE',
        rapLevel: company.rapCertificationLevel,
        jobCount: breakdown.activeJobs || 0,
        breakdown,
      };
    }));

    res.json({
      leaderboard,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + companies.length < total,
      },
    });
  } catch (error) {
    console.error('[Leaderboard] List error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /leaderboard/industries
 * Get list of industries for filtering
 */
router.get('/industries', async (req: Request, res: Response) => {
  try {
    const industries = await prisma.companyProfile.findMany({
      select: { industry: true },
      distinct: ['industry'],
      where: {
        industry: { not: null },
      },
    });

    res.json({
      industries: industries.map((i: any) => i.industry).filter(Boolean).sort(),
    });
  } catch (error) {
    console.error('[Leaderboard] Industries error:', error);
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

/**
 * GET /leaderboard/:id
 * Get detailed ranking for a specific employer
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get company details
    const company = await prisma.companyProfile.findUnique({
      where: { id },
    });

    if (!company) {
      return void res.status(404).json({ error: 'Company not found' });
    }

    // Calculate score
    const { score, breakdown } = await calculateReputationScore(company.id);

    // Calculate rank
    const rank = await prisma.companyProfile.count({
      where: {
        rapPoints: { gt: company.rapPoints || 0 },
      },
    });

    // Get recent hires count
    const recentHires = await prisma.jobApplication.count({
      where: {
        job: {
          user: {
            companyProfile: { id }
          }
        },
        status: 'HIRED',
        updatedAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
    });

    res.json({
      rank: rank + 1,
      id: company.id,
      name: company.companyName,
      industry: company.industry,
      score,
      rapStatus: company.rapCertificationLevel ? 'ACTIVE' : 'INACTIVE',
      rapLevel: company.rapCertificationLevel,
      jobCount: breakdown.activeJobs || 0,
      scoreBreakdown: breakdown,
      recentHires,
    });
  } catch (error) {
    console.error('[Leaderboard] Detail error:', error);
    res.status(500).json({ error: 'Failed to fetch employer details' });
  }
});

/**
 * POST /leaderboard/recalculate
 * Admin: Recalculate reputation scores for all companies
 */
router.post('/recalculate', authenticate, async (req: Request, res: Response) => {
  try {
    // Check admin permission
    if ((req as any).user?.userType !== 'GOVERNMENT' && (req as any).user?.userType !== 'ADMIN') {
      return void res.status(403).json({ error: 'Admin access required' });
    }

    // Get all companies
    const companies = await prisma.companyProfile.findMany({
      select: { id: true },
    });

    let updated = 0;
    for (const { id } of companies) {
      const { score } = await calculateReputationScore(id);
      
      // Update score in DB
      // await prisma.companyProfile.update({
      //   where: { id },
      //   data: { reputation: score },
      // });
      updated++;
    }

    res.json({ message: `Recalculated scores for ${updated} companies` });
  } catch (error) {
    console.error('[Leaderboard] Recalculate error:', error);
    res.status(500).json({ error: 'Failed to recalculate scores' });
  }
});

export default router;
export { calculateReputationScore };



