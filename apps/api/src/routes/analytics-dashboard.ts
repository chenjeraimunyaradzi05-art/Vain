/**
 * Analytics Dashboard Routes
 * 
 * Provides role-gated analytics endpoints for admin and employer dashboards.
 */
import { Router } from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma as prismaClient } from '../db';

const prisma = prismaClient as any;
const router = Router();

// =============================================================================
// MIDDLEWARE
// =============================================================================

function requireAdmin(req, res, next) {
  const role = String(req.user?.role || req.user?.userType || '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin') {
    return void res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireEmployer(req, res, next) {
  const role = String(req.user?.role || req.user?.userType || '').toLowerCase();
  if (role !== 'employer' && role !== 'admin' && role !== 'super_admin') {
    return void res.status(403).json({ error: 'Employer access required' });
  }
  next();
}

// =============================================================================
// ADMIN DASHBOARD
// =============================================================================

/**
 * GET /analytics-dashboard/admin/overview
 * Platform-level KPIs for admin dashboard
 */
router.get('/admin/overview', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      usersThisMonth,
      usersLastMonth,
      totalJobs,
      activeJobs,
      totalApplications,
      applicationsThisMonth,
      totalPlacements,
      placementsThisMonth,
      totalMentorSessions,
      sessionsThisMonth,
      totalCompanies,
      companiesWithRAP,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.job.count(),
      prisma.job.count({ where: { status: 'APPROVED' } }),
      prisma.jobApplication.count(),
      prisma.jobApplication.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.jobApplication.count({ where: { status: 'HIRED' } }),
      prisma.jobApplication.count({ where: { status: 'HIRED', updatedAt: { gte: startOfMonth } } }),
      prisma.mentorSession.count().catch(() => 0),
      prisma.mentorSession.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0),
      prisma.companyProfile.count(),
      prisma.companyProfile.count({ where: { hasRAP: true } }).catch(() => 0),
    ]);

    // Calculate growth rates
    const userGrowth = usersLastMonth > 0 
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) 
      : 100;

    // Conversion funnel
    const conversionRate = totalApplications > 0 
      ? Math.round((totalPlacements / totalApplications) * 100) 
      : 0;

    res.json({
      users: {
        total: totalUsers,
        thisMonth: usersThisMonth,
        growth: userGrowth,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
      },
      applications: {
        total: totalApplications,
        thisMonth: applicationsThisMonth,
      },
      placements: {
        total: totalPlacements,
        thisMonth: placementsThisMonth,
        conversionRate,
      },
      mentorship: {
        totalSessions: totalMentorSessions,
        sessionsThisMonth,
      },
      companies: {
        total: totalCompanies,
        withRAP: companiesWithRAP,
        rapPercentage: totalCompanies > 0 
          ? Math.round((companiesWithRAP / totalCompanies) * 100) 
          : 0,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin analytics overview error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

/**
 * GET /analytics-dashboard/admin/user-retention
 * User retention cohort analysis
 */
router.get('/admin/user-retention', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const periods = [7, 14, 30, 60, 90]; // days
    
    const retentionData = await Promise.all(
      periods.map(async (days) => {
        const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(now.getTime() - (days - 7) * 24 * 60 * 60 * 1000);
        
        const usersInCohort = await prisma.user.count({
          where: { createdAt: { gte: periodStart, lt: periodEnd } },
        });
        
        const activeUsersInCohort = await prisma.user.count({
          where: {
            createdAt: { gte: periodStart, lt: periodEnd },
            lastLoginAt: { gte: periodEnd },
          },
        });
        
        return {
          cohort: `${days}d ago`,
          registered: usersInCohort,
          retained: activeUsersInCohort,
          rate: usersInCohort > 0 ? Math.round((activeUsersInCohort / usersInCohort) * 100) : 0,
        };
      })
    );

    res.json({ retentionData });
  } catch (err) {
    console.error('Admin retention analytics error:', err);
    res.status(500).json({ error: 'Failed to load retention data' });
  }
});

/**
 * GET /analytics-dashboard/admin/job-funnel
 * Job application funnel metrics
 */
router.get('/admin/job-funnel', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const [
      totalViews,
      totalApplications,
      inReview,
      interviewed,
      offered,
      hired,
      rejected,
    ] = await Promise.all([
      prisma.jobView.count().catch(() => 0),
      prisma.jobApplication.count(),
      prisma.jobApplication.count({ where: { status: 'IN_REVIEW' } }),
      prisma.jobApplication.count({ where: { status: 'INTERVIEWED' } }),
      prisma.jobApplication.count({ where: { status: 'OFFERED' } }),
      prisma.jobApplication.count({ where: { status: 'HIRED' } }),
      prisma.jobApplication.count({ where: { status: 'REJECTED' } }),
    ]);

    res.json({
      funnel: [
        { stage: 'Job Views', count: totalViews },
        { stage: 'Applications', count: totalApplications },
        { stage: 'In Review', count: inReview },
        { stage: 'Interviewed', count: interviewed },
        { stage: 'Offered', count: offered },
        { stage: 'Hired', count: hired },
      ],
      rejected,
      conversionRates: {
        viewToApply: totalViews > 0 ? Math.round((totalApplications / totalViews) * 100) : 0,
        applyToInterview: totalApplications > 0 ? Math.round((interviewed / totalApplications) * 100) : 0,
        interviewToOffer: interviewed > 0 ? Math.round((offered / interviewed) * 100) : 0,
        offerToHire: offered > 0 ? Math.round((hired / offered) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Admin job funnel analytics error:', err);
    res.status(500).json({ error: 'Failed to load job funnel data' });
  }
});

// =============================================================================
// EMPLOYER DASHBOARD
// =============================================================================

/**
 * GET /analytics-dashboard/employer/overview
 * Employer-specific metrics for their jobs and applications
 */
router.get('/employer/overview', authenticateJWT, requireEmployer, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get employer's company
    const companyProfile = await prisma.companyProfile.findFirst({
      where: { userId },
      select: { id: true, companyName: true },
    });

    if (!companyProfile) {
      return void res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyProfile.id;

    const [
      totalJobs,
      activeJobs,
      totalApplications,
      applicationsThisMonth,
      newApplications,
      inReview,
      interviewed,
      hired,
      avgTimeToHire,
    ] = await Promise.all([
      prisma.job.count({ where: { companyId } }),
      prisma.job.count({ where: { companyId, status: 'APPROVED' } }),
      prisma.jobApplication.count({ where: { job: { companyId } } }),
      prisma.jobApplication.count({ where: { job: { companyId }, createdAt: { gte: startOfMonth } } }),
      prisma.jobApplication.count({ where: { job: { companyId }, status: 'APPLIED' } }),
      prisma.jobApplication.count({ where: { job: { companyId }, status: 'IN_REVIEW' } }),
      prisma.jobApplication.count({ where: { job: { companyId }, status: 'INTERVIEWED' } }),
      prisma.jobApplication.count({ where: { job: { companyId }, status: 'HIRED' } }),
      // Calculate average time to hire (days)
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(DAY FROM (ja."updatedAt" - ja."createdAt"))) as avg_days
        FROM "JobApplication" ja
        JOIN "Job" j ON ja."jobId" = j.id
        WHERE j."companyId" = ${companyId}
        AND ja.status = 'HIRED'
      `.catch(() => [{ avg_days: null }]),
    ]);

    const avgDays = avgTimeToHire?.[0]?.avg_days 
      ? Math.round(avgTimeToHire[0].avg_days) 
      : null;

    res.json({
      company: {
        id: companyId,
        name: companyProfile.companyName,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
      },
      applications: {
        total: totalApplications,
        thisMonth: applicationsThisMonth,
        pipeline: {
          new: newApplications,
          inReview,
          interviewed,
          hired,
        },
      },
      metrics: {
        avgTimeToHire: avgDays,
        hireRate: totalApplications > 0 ? Math.round((hired / totalApplications) * 100) : 0,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Employer analytics overview error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

/**
 * GET /analytics-dashboard/employer/jobs/:jobId
 * Per-job analytics for employers
 */
router.get('/employer/jobs/:jobId', authenticateJWT, requireEmployer, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    // Verify job belongs to employer
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: { select: { userId: true, companyName: true } },
      },
    });

    if (!job) {
      return void res.status(404).json({ error: 'Job not found' });
    }

    if (job.company.userId !== userId && req.user.role !== 'admin') {
      return void res.status(403).json({ error: 'Access denied' });
    }

    const [
      totalViews,
      uniqueViews,
      totalApplications,
      statusBreakdown,
    ] = await Promise.all([
      prisma.jobView.count({ where: { jobId } }).catch(() => 0),
      prisma.jobView.groupBy({ by: ['userId'], where: { jobId } }).then(r => r.length).catch(() => 0),
      prisma.jobApplication.count({ where: { jobId } }),
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { jobId },
        _count: true,
      }),
    ]);

    res.json({
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        createdAt: job.createdAt,
      },
      views: {
        total: totalViews,
        unique: uniqueViews,
      },
      applications: {
        total: totalApplications,
        byStatus: statusBreakdown.map(s => ({ status: s.status, count: s._count })),
      },
      conversionRate: totalViews > 0 ? Math.round((totalApplications / totalViews) * 100) : 0,
    });
  } catch (err) {
    console.error('Employer job analytics error:', err);
    res.status(500).json({ error: 'Failed to load job analytics' });
  }
});

// =============================================================================
// MENTOR DASHBOARD (bonus)
// =============================================================================

/**
 * GET /analytics-dashboard/mentor/overview
 * Mentor-specific metrics
 */
router.get('/mentor/overview', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is a mentor
    const mentorProfile = await prisma.mentorProfile.findFirst({
      where: { userId },
      select: { id: true, verified: true },
    });

    if (!mentorProfile) {
      return void res.status(404).json({ error: 'Mentor profile not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSessions,
      sessionsThisMonth,
      completedSessions,
      upcomingSessions,
      totalMentees,
      avgRating,
    ] = await Promise.all([
      prisma.mentorSession.count({ where: { mentorId: userId } }).catch(() => 0),
      prisma.mentorSession.count({ 
        where: { mentorId: userId, createdAt: { gte: startOfMonth } } 
      }).catch(() => 0),
      prisma.mentorSession.count({ 
        where: { mentorId: userId, status: 'COMPLETED' } 
      }).catch(() => 0),
      prisma.mentorSession.count({ 
        where: { mentorId: userId, status: 'SCHEDULED', scheduledAt: { gte: now } } 
      }).catch(() => 0),
      prisma.mentorSession.groupBy({
        by: ['menteeId'],
        where: { mentorId: userId },
      }).then(r => r.length).catch(() => 0),
      prisma.mentorReview.aggregate({
        where: { mentorId: userId },
        _avg: { rating: true },
      }).catch(() => ({ _avg: { rating: null } })),
    ]);

    res.json({
      profile: {
        id: mentorProfile.id,
        verified: mentorProfile.verified,
      },
      sessions: {
        total: totalSessions,
        thisMonth: sessionsThisMonth,
        completed: completedSessions,
        upcoming: upcomingSessions,
      },
      mentees: totalMentees,
      rating: avgRating._avg?.rating ? Math.round(avgRating._avg.rating * 10) / 10 : null,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Mentor analytics overview error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;

