import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

const router = express.Router();
const prismaAny = prisma as unknown as { impactMetric?: any };

// GET /analytics/overview - platform-wide metrics (admin only)
router.get('/overview', authenticate, async (req, res) => {
    try {
        const [
            totalMembers,
            totalCompanies,
            totalMentors,
            totalJobs,
            totalApplications,
            hiredCount,
            activeJobs,
        ] = await Promise.all([
            prisma.user.count({ where: { userType: 'MEMBER' } }),
            prisma.user.count({ where: { userType: 'COMPANY' } }),
            prisma.user.count({ where: { userType: 'MENTOR' } }),
            prisma.job.count(),
            prisma.jobApplication.count(),
            prisma.jobApplication.count({ where: { status: 'HIRED' } }),
            prisma.job.count({ where: { isActive: true } }),
        ]);

        const placementRate = totalApplications > 0
            ? Math.round((hiredCount / totalApplications) * 100)
            : 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [recentApplications, recentJobs, recentMembers] = await Promise.all([
            prisma.jobApplication.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            prisma.job.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            prisma.user.count({ where: { userType: 'MEMBER', createdAt: { gte: thirtyDaysAgo } } }),
        ]);

        res.json({
            overview: {
                totalMembers,
                totalCompanies,
                totalMentors,
                totalJobs,
                activeJobs,
                totalApplications,
                hiredCount,
                placementRate,
            },
            recent30Days: {
                applications: recentApplications,
                jobs: recentJobs,
                newMembers: recentMembers,
            },
        });
    } catch (err) {
        console.error('analytics overview error', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// GET /analytics/outcomes - outcome tracking metrics (for grant reporting)
router.get('/outcomes', authenticate, async (req, res) => {
    try {
        const outcomes = await prisma.placementOutcome.groupBy({
            by: ['milestone'],
            _count: { id: true },
        });

        const milestoneStats: Record<string, number> = {};
        for (const o of outcomes) {
            milestoneStats[o.milestone] = o._count.id;
        }

        const hired = milestoneStats['HIRED'] || 0;
        const month1 = milestoneStats['MONTH_1'] || 0;
        const month3 = milestoneStats['MONTH_3'] || 0;
        const month6 = milestoneStats['MONTH_6'] || 0;
        const month12 = milestoneStats['MONTH_12'] || 0;

        const retentionRates = {
            month1: hired > 0 ? Math.round((month1 / hired) * 100) : 0,
            month3: hired > 0 ? Math.round((month3 / hired) * 100) : 0,
            month6: hired > 0 ? Math.round((month6 / hired) * 100) : 0,
            month12: hired > 0 ? Math.round((month12 / hired) * 100) : 0,
        };

        res.json({
            milestones: milestoneStats,
            retentionRates,
            totalHired: hired,
        });
    } catch (err) {
        console.error('analytics outcomes error', err);
        res.status(500).json({ error: 'Failed to fetch outcomes' });
    }
});

// GET /analytics/company - company-specific metrics
router.get('/company', authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
        const jobs = await prisma.job.findMany({
            where: { userId },
            select: { id: true },
        });

        const jobIds = jobs.map((j) => j.id);

        if (jobIds.length === 0) {
            return void res.json({
                totalJobs: 0,
                activeJobs: 0,
                totalApplications: 0,
                applicationsByStatus: {},
                hiredCount: 0,
                avgTimeToHire: null,
            });
        }

        const [totalJobs, activeJobs, applications] = await Promise.all([
            prisma.job.count({ where: { userId } }),
            prisma.job.count({ where: { userId, isActive: true } }),
            prisma.jobApplication.findMany({
                where: { jobId: { in: jobIds } },
                select: { status: true, createdAt: true, updatedAt: true },
            }),
        ]);

        const applicationsByStatus: Record<string, number> = {};
        for (const app of applications) {
            applicationsByStatus[app.status] = (applicationsByStatus[app.status] || 0) + 1;
        }

        const hiredCount = applicationsByStatus['HIRED'] || 0;

        res.json({
            totalJobs,
            activeJobs,
            totalApplications: applications.length,
            applicationsByStatus,
            hiredCount,
        });
    } catch (err) {
        console.error('company analytics error', err);
        res.status(500).json({ error: 'Failed to fetch company analytics' });
    }
});

// GET /analytics/member - member-specific metrics
router.get('/member', authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
        const [applications, profile] = await Promise.all([
            prisma.jobApplication.findMany({
                where: { userId },
                include: { job: { select: { title: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            prisma.memberProfile.findUnique({ where: { userId } }),
        ]);

        const applicationsByStatus: Record<string, number> = {};
        for (const app of applications) {
            applicationsByStatus[app.status] = (applicationsByStatus[app.status] || 0) + 1;
        }

        res.json({
            totalApplications: applications.length,
            applicationsByStatus,
            profileCompletion: profile?.profileCompletionPercent || 0,
            profileViews: profile?.profileViews || 0,
            recentApplications: applications.slice(0, 5).map((a) => ({
                id: a.id,
                jobTitle: a.job.title,
                status: a.status,
                appliedAt: a.createdAt,
            })),
        });
    } catch (err) {
        console.error('member analytics error', err);
        res.status(500).json({ error: 'Failed to fetch member analytics' });
    }
});

// GET /analytics/impact - lightweight impact metrics for authenticated users
router.get('/impact', authenticate, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 20), 50);

        if (!prismaAny.impactMetric) {
            return void res.json({ metrics: [] });
        }

        const metrics = await prismaAny.impactMetric.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        res.json({ metrics });
    } catch (err) {
        console.error('analytics impact error', err);
        res.status(500).json({ error: 'Failed to fetch impact metrics' });
    }
});

// POST /analytics/outcomes/:appId - record an outcome milestone
router.post('/outcomes/:appId', authenticate, async (req, res) => {
    const { appId } = req.params;
    const { milestone, notes } = req.body;
    const userId = (req as any).user?.id;

    const validMilestones = [
        'HIRED', 'WEEK_1', 'MONTH_1', 'MONTH_3', 'MONTH_6', 'MONTH_12',
        'PROMOTED', 'TRAINING_COMPLETE', 'EXITED',
    ];

    if (!milestone || !validMilestones.includes(milestone)) {
        return void res.status(400).json({ error: 'Invalid milestone' });
    }

    try {
        const application = await prisma.jobApplication.findUnique({
            where: { id: appId },
            include: { job: true },
        });

        if (!application) {
            return void res.status(404).json({ error: 'Application not found' });
        }

        // Only the company owner can record outcomes
        if (application.job.userId !== userId) {
            return void res.status(403).json({ error: 'Not authorized' });
        }

        const existingOutcome = await prisma.placementOutcome.findFirst({
            where: { applicationId: appId, milestone },
        });

        let outcome;
        if (existingOutcome) {
            outcome = await prisma.placementOutcome.update({
                where: { id: existingOutcome.id },
                data: { notes, verifiedBy: userId, achievedAt: new Date() },
            });
        } else {
            outcome = await prisma.placementOutcome.create({
                data: { applicationId: appId, milestone, notes, verifiedBy: userId },
            });
        }

        if (milestone === 'HIRED') {
            await prisma.jobApplication.update({
                where: { id: appId },
                data: { status: 'HIRED' },
            });
        }

        res.json({ outcome });
    } catch (err) {
        console.error('record outcome error', err);
        res.status(500).json({ error: 'Failed to record outcome' });
    }
});

// GET /analytics/admin/cohorts - cohort segmentation summaries (admin only)
router.get('/admin/cohorts', authenticate, async (req, res) => {
    const user = (req as any).user;
    const isAdmin = (user && (user.userType === 'GOVERNMENT' || user.userType === 'ADMIN')) ||
        (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY);

    if (!isAdmin) {
        return void res.status(403).json({ error: 'Not authorized' });
    }

    const countBy = (rows: any[], keyFn: (r: any) => any, unknownLabel: string) => {
        const out: Record<string, number> = {};
        for (const r of rows) {
            const raw = keyFn(r);
            const key = (raw && String(raw).trim()) || unknownLabel;
            out[key] = (out[key] || 0) + 1;
        }
        return out;
    };

    try {
        const [memberProfiles, companyProfiles] = await Promise.all([
            prisma.memberProfile.findMany({ select: { mobNation: true } }),
            prisma.companyProfile.findMany({ select: { industry: true, state: true } }),
        ]);

        const membersByMobNation = countBy(memberProfiles, (p) => p.mobNation, 'Unknown');
        const companiesByIndustry = countBy(companyProfiles, (p) => p.industry, 'Unknown');
        const companiesByState = countBy(companyProfiles, (p) => p.state, 'Unknown');

        res.json({
            membersByMobNation,
            companiesByIndustry,
            companiesByState,
            totals: {
                memberProfiles: memberProfiles.length,
                companyProfiles: companyProfiles.length,
            },
        });
    } catch (err) {
        console.error('cohort analytics error', err);
        res.status(500).json({ error: 'Failed to fetch cohort analytics' });
    }
});

// POST /analytics/events - track custom user events
router.post('/events', authenticate, async (req, res) => {
    try {
        const { eventName, eventType, properties, sessionId, deviceInfo, location } = req.body;
        const userId = (req as any).user?.id;

        if (!eventName || !eventType || !sessionId) {
            return void res.status(400).json({ error: 'Missing required fields: eventName, eventType, sessionId' });
        }

        const analyticsService = AnalyticsService.getInstance();
        
        await analyticsService.track({
            userId,
            sessionId,
            eventType,
            eventName,
            properties: properties || {},
            timestamp: new Date(),
            deviceInfo,
            location
        });

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('analytics tracking error', err);
        res.status(500).json({ error: 'Failed to track event' });
    }
});

export default router;


