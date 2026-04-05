// @ts-nocheck
import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import { exportImpactMetrics } from '../lib/reportExport';

const router = express.Router();

function isAllowedUserType(req: any, allowed: string[]) {
  const t = req?.user?.userType;
  if (t && allowed.includes(t)) return true;
  return Boolean(process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY);
}

function requireUserType(allowed: string[]) {
  return (req: any, res: any, next: any) => {
    if (!isAllowedUserType(req, allowed)) return void res.status(403).json({ error: 'Not authorized' });
    return next();
  };
}

function safeModel(modelName: string) {
  const model = (prisma as any)?.[modelName];
  if (!model) return null;
  return model;
}

async function safeCount(modelName: string, args: any) {
  try {
    const model = safeModel(modelName);
    if (!model || typeof model.count !== 'function') return 0;
    return await model.count(args);
  } catch {
    return 0;
  }
}

// =============================================================================
// IMPACT METRICS
// =============================================================================

/**
 * GET /reporting/metrics - Get platform impact metrics
 */
router.get('/metrics', authenticate, async (req: any, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    // Government/institution reporting
    if (!isAllowedUserType(req, ['GOVERNMENT', 'ADMIN', 'INSTITUTION'])) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    // Calculate date range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      };
    } else if (period) {
      const now = new Date();
      const start = new Date();
      switch (period) {
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setMonth(now.getMonth() - 1);
      }
      dateFilter = { createdAt: { gte: start, lte: now } };
    }

    // Gather metrics
    const trainingWhere: any = { status: 'COMPLETED' };
    if (dateFilter?.createdAt?.gte || dateFilter?.createdAt?.lte) {
      trainingWhere.completedAt = {};
      if (dateFilter.createdAt.gte) trainingWhere.completedAt.gte = dateFilter.createdAt.gte;
      if (dateFilter.createdAt.lte) trainingWhere.completedAt.lte = dateFilter.createdAt.lte;
    }

    const [
      totalMembers,
      totalCompanies,
      totalJobs,
      totalApplications,
      hiredOutcomes,
      trainingCompletions,
      mentoringSessions,
    ] = await Promise.all([
      safeCount('user', { where: { userType: 'MEMBER', ...dateFilter } }),
      safeCount('user', { where: { userType: 'COMPANY' } }),
      safeCount('job', { where: dateFilter }),
      safeCount('jobApplication', { where: dateFilter }),
      // placementOutcome model is not present in the current Prisma schema; fall back to HIRED applications.
      safeCount('jobApplication', { where: { status: 'HIRED', ...dateFilter } }),
      safeCount('courseEnrolment', { where: trainingWhere }),
      safeCount('mentorSession', { where: { status: 'COMPLETED', ...dateFilter } }),
    ]);

    // Retention milestones require a dedicated outcomes table; return 0 in the fallback mode.
    const retentionOutcomes = 0;

    // Calculate rates
    const placementRate = totalApplications > 0 
      ? ((hiredOutcomes / totalApplications) * 100).toFixed(1)
      : 0;

    res.json({
      period: period || 'custom',
      dateRange: dateFilter.createdAt || null,
      metrics: {
        members: {
          total: totalMembers,
          label: 'Registered Members',
        },
        employers: {
          total: totalCompanies,
          label: 'Partner Employers',
        },
        jobs: {
          total: totalJobs,
          label: 'Jobs Posted',
        },
        applications: {
          total: totalApplications,
          label: 'Applications Submitted',
        },
        placements: {
          total: hiredOutcomes,
          rate: placementRate,
          label: 'Successful Placements',
        },
        retention: {
          total: retentionOutcomes,
          label: 'Retention Milestones',
        },
        training: {
          total: trainingCompletions,
          label: 'Training Completions',
        },
        mentoring: {
          total: mentoringSessions,
          label: 'Mentoring Sessions',
        },
      },
    });
  } catch (err) {
    console.error('Get metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /reporting/metrics/history - Get historical metrics
 */
router.get('/metrics/history', authenticate, async (req: any, res) => {
  try {
    if (!isAllowedUserType(req, ['GOVERNMENT', 'ADMIN', 'INSTITUTION'])) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const { metric, limit = 12 } = req.query;

    const metrics = await prisma.impactMetric.findMany({
      where: metric ? { metric: String(metric) } : {},
      orderBy: { recordedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ metrics });
  } catch (err) {
    console.error('Get metrics history error:', err);
    res.status(500).json({ error: 'Failed to fetch metrics history' });
  }
});

// =============================================================================
// RAP REPORTING
// =============================================================================

// =============================================================================
// CLOSING THE GAP (CTG) REPORTING
// =============================================================================

/**
 * GET /reporting/ctg - Closing the Gap alignment report (government/admin)
 * Query:
 * - period=month|quarter|year (optional)
 * - startDate/endDate (optional)
 */
router.get('/ctg', authenticate, requireUserType(['GOVERNMENT', 'ADMIN']), async (req: any, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    // Reuse the same date-range logic as /metrics but keep it local.
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      };
    } else if (period) {
      const now = new Date();
      const start = new Date();
      switch (String(period)) {
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setMonth(now.getMonth() - 1);
      }
      dateFilter = { createdAt: { gte: start, lte: now } };
    }

    const trainingWhere: any = { status: 'COMPLETED' };
    if (dateFilter?.createdAt?.gte || dateFilter?.createdAt?.lte) {
      trainingWhere.completedAt = {};
      if (dateFilter.createdAt.gte) trainingWhere.completedAt.gte = dateFilter.createdAt.gte;
      if (dateFilter.createdAt.lte) trainingWhere.completedAt.lte = dateFilter.createdAt.lte;
    }

    const [
      membersJoined,
      jobsPosted,
      applicationsSubmitted,
      hires,
      trainingCompleted,
    ] = await Promise.all([
      safeCount('user', { where: { userType: 'MEMBER', ...dateFilter } }),
      safeCount('job', { where: dateFilter }),
      safeCount('jobApplication', { where: dateFilter }),
      safeCount('jobApplication', { where: { status: 'HIRED', ...dateFilter } }),
      safeCount('courseEnrolment', { where: trainingWhere }),
    ]);

    // We don't currently have durable retention milestones in the schema (no PlacementOutcome model).
    const retention = {
      month3: 0,
      month6: 0,
      month12: 0,
      note: 'Retention milestones require an outcomes table; returning 0 in fallback mode.',
    };

    res.json({
      reportType: 'Closing the Gap Alignment Report',
      generatedAt: new Date().toISOString(),
      period: period || 'custom',
      dateRange: dateFilter.createdAt || null,
      kpis: {
        employment: {
          hires,
          jobsPosted,
          applicationsSubmitted,
        },
        education: {
          trainingCompleted,
        },
        participation: {
          membersJoined,
        },
        retention,
      },
      notes: [
        'This report summarizes platform activity aligned to employment and education outcomes.',
        'Retention KPIs will expand once retention milestones are stored in a dedicated outcomes table.',
      ],
    });
  } catch (err) {
    console.error('Generate CTG report error:', err);
    res.status(500).json({ error: 'Failed to generate Closing the Gap report' });
  }
});

/**
 * GET /reporting/rap - Generate RAP compliance report
 */
router.get('/rap', authenticate, async (req: any, res) => {
  try {
    // RAP reports are company-facing as well as government-facing
    if (!isAllowedUserType(req, ['GOVERNMENT', 'ADMIN', 'COMPANY'])) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const { year = new Date().getFullYear() } = req.query;
    
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);
    const dateFilter = { createdAt: { gte: startOfYear, lte: endOfYear } };

    const safeCount = async (modelName: string, args: any) => {
      try {
        const model = (prisma as any)?.[modelName];
        if (!model || typeof model.count !== 'function') return 0;
        return await model.count(args);
      } catch {
        return 0;
      }
    };

    const safeGroupByCount = async (modelName: string, args: any) => {
      try {
        const model = (prisma as any)?.[modelName];
        if (!model || typeof model.groupBy !== 'function') return [];
        return await model.groupBy(args);
      } catch {
        return [];
      }
    };

    // Gather RAP-specific metrics
    const [
      indigenousEmployers,
      verifiedElders,
      placementsByQuarter,
      retentionData,
      trainingData,
    ] = await Promise.all([
      // Indigenous-owned or RAP-certified employers
      safeCount('trustBadge', { where: { badgeType: { in: ['indigenous_owned', 'rap_certified'] } } }),
      // Verified elders
      safeCount('elderVerification', { where: { status: 'approved' } }),
      // Placements by quarter
      safeGroupByCount('placementOutcome', {
        by: ['milestone'],
        where: { milestone: 'HIRED', reachedAt: { gte: startOfYear, lte: endOfYear } },
        _count: true,
      }),
      // Retention milestones
      safeGroupByCount('placementOutcome', {
        by: ['milestone'],
        where: {
          milestone: { in: ['MONTH_1', 'MONTH_3', 'MONTH_6', 'MONTH_12'] },
          reachedAt: { gte: startOfYear, lte: endOfYear },
        },
        _count: true,
      }),
      // Training completions
      safeCount('courseEnrolment', { where: { status: 'COMPLETED', completedAt: { gte: startOfYear, lte: endOfYear } } }),
    ]);

    const report = {
      reportType: 'RAP Compliance Report',
      year: parseInt(year as string),
      generatedAt: new Date().toISOString(),
      summary: {
        indigenousOwnedEmployers: indigenousEmployers,
        verifiedCommunityElders: verifiedElders,
        totalPlacements: (placementsByQuarter as any[]).reduce((sum, p) => {
          const c = typeof p?._count === 'number' ? p._count : (p?._count?._all ?? 0);
          return sum + (Number.isFinite(c) ? c : 0);
        }, 0),
        trainingCompletions: trainingData,
      },
      retention: {
        month1: (() => {
          const hit = (retentionData as any[]).find((r) => r.milestone === 'MONTH_1');
          return (typeof hit?._count === 'number' ? hit._count : (hit?._count?._all ?? 0)) || 0;
        })(),
        month3: (() => {
          const hit = (retentionData as any[]).find((r) => r.milestone === 'MONTH_3');
          return (typeof hit?._count === 'number' ? hit._count : (hit?._count?._all ?? 0)) || 0;
        })(),
        month6: (() => {
          const hit = (retentionData as any[]).find((r) => r.milestone === 'MONTH_6');
          return (typeof hit?._count === 'number' ? hit._count : (hit?._count?._all ?? 0)) || 0;
        })(),
        month12: (() => {
          const hit = (retentionData as any[]).find((r) => r.milestone === 'MONTH_12');
          return (typeof hit?._count === 'number' ? hit._count : (hit?._count?._all ?? 0)) || 0;
        })(),
      },
      closingTheGap: {
        employmentTarget: 'In Progress',
        educationTarget: 'In Progress',
        notes: 'Aligned with Closing the Gap targets for employment and education outcomes',
      },
    };

    res.json(report);
  } catch (err) {
    console.error('Generate RAP report error:', err);
    res.status(500).json({ error: 'Failed to generate RAP report' });
  }
});

// =============================================================================
// EXPORT ENDPOINTS
// =============================================================================

/**
 * GET /reporting/export - Export impact metrics in csv/xlsx/pdf
 * Query:
 * - format=csv|xlsx|pdf
 * - metric (optional)
 * - limit (optional)
 */
router.get('/export', authenticate, async (req: any, res) => {
  try {
    if (!isAllowedUserType(req, ['GOVERNMENT', 'ADMIN', 'INSTITUTION'])) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const { format = 'csv', metric, limit = 250 } = req.query;

    const metrics = await prisma.impactMetric.findMany({
      where: metric ? { metric: String(metric) } : {},
      orderBy: { recordedAt: 'desc' },
      take: Math.min(1000, Math.max(1, parseInt(limit as string))),
    });

    const exported = await exportImpactMetrics(String(format), metrics);
    const filename = `impact-metrics-${new Date().toISOString().split('T')[0]}.${exported.fileExt}`;

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return void res.send(exported.buffer);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    console.error('Export metrics error:', err);
    return void res.status(status).json({ error: err?.message || 'Failed to export report' });
  }
});

/**
 * GET /reporting/export/csv - Export metrics as CSV
 */
router.get('/export/csv', authenticate, async (req: any, res) => {
  try {
    if (!isAllowedUserType(req, ['GOVERNMENT', 'ADMIN', 'INSTITUTION'])) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const { reportType = 'metrics', startDate, endDate } = req.query;

    let data: any = [];
    let filename = 'gimbi-report.csv';

    if (reportType === 'placements') {
      filename = `placements-${new Date().toISOString().split('T')[0]}.csv`;

      // PlacementOutcome model is not in the current Prisma schema; export hired applications instead.
      const hiredWhere: any = { status: 'HIRED' };
      if (startDate && endDate) {
        hiredWhere.updatedAt = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
      }

      const apps = await prisma.jobApplication.findMany({
        where: hiredWhere,
        include: { job: { select: { title: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      });

      const header = 'Status,Date,Job Title\n';
      const rows = apps
        .map((a) => `"${a.status}","${a.updatedAt.toISOString()}","${a.job?.title || 'N/A'}"`)
        .join('\n');
      data = header + rows;
    } else if (reportType === 'training') {
      filename = `training-${new Date().toISOString().split('T')[0]}.csv`;
      
      const enrolments = await prisma.courseEnrolment.findMany({
        where: { status: 'COMPLETED' },
        include: {
          course: { select: { title: true, qualification: true } },
        },
        orderBy: { completedAt: 'desc' },
      });

      const header = 'Course,Qualification,Completed At\n';
      const rows = enrolments.map((e) =>
        `"${e.course?.title || 'N/A'}","${e.course?.qualification || 'N/A'}","${e.completedAt?.toISOString() || 'N/A'}"`
      ).join('\n');
      
      data = header + rows;
    } else {
      // General metrics
      filename = `metrics-${new Date().toISOString().split('T')[0]}.csv`;
      
      const metrics = await prisma.impactMetric.findMany({
          orderBy: [{ metric: 'asc' }, { recordedAt: 'desc' }],
      });

        const header = 'Metric,Period,Value,Recorded At,Metadata\n';
        const rows = metrics.map((m) => {
          const recordedAt = m.recordedAt ? new Date(m.recordedAt).toISOString() : '';
          const meta = m.metadata ? String(m.metadata).replace(/\r?\n/g, ' ') : '';
          return `"${m.metric}","${m.period}",${m.value},"${recordedAt}","${meta}"`;
        }).join('\n');
      
      data = header + rows;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * GET /reporting/export/pdf - Generate PDF report (placeholder - needs PDF library)
 */
router.get('/export/pdf', authenticate, async (req: any, res) => {
  try {
    if (!isAllowedUserType(req, ['GOVERNMENT', 'ADMIN', 'INSTITUTION'])) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    // Note: Full PDF generation would require a library like puppeteer or pdfkit
    // This returns JSON that can be rendered client-side or by a separate service
    
    const { reportType = 'rap', year = new Date().getFullYear() } = req.query;

    // For now, redirect to the JSON endpoint with a note
    res.json({
      message: 'PDF generation pending implementation',
      suggestion: 'Use /reporting/rap or /reporting/metrics endpoint and render client-side',
      reportType,
      year,
    });
  } catch (err) {
    console.error('Export PDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// =============================================================================
// ANALYTICS SYNC JOB
// =============================================================================

/**
 * POST /reporting/sync - Trigger metrics sync (cron/admin)
 */
router.post('/sync', authenticate, async (req: any, res) => {
  try {
    if (!isAllowedUserType(req, ['GOVERNMENT', 'ADMIN'])) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [placements, retention3m, trainingCompletions] = await Promise.all([
      safeCount('placementOutcome', { where: { milestone: 'HIRED' } }),
      safeCount('placementOutcome', { where: { milestone: 'MONTH_3' } }),
      safeCount('courseEnrolment', { where: { status: 'COMPLETED' } }),
    ]);

    const toRecord = [
      { metric: 'PLACEMENTS', value: placements },
      { metric: 'RETENTION_3M', value: retention3m },
      { metric: 'TRAINING_COMPLETION', value: trainingCompletions },
    ];

    const created = [];
    for (const m of toRecord) {
      // ImpactMetric has no uniqueness constraints; keep it append-only.
      const row = await prisma.impactMetric.create({
        data: {
          metric: m.metric,
          value: m.value,
          period: 'MONTHLY',
          metadata: JSON.stringify({ month }),
        },
      });
      created.push(row);
    }

    res.json({ synced: true, month, metrics: created });
  } catch (err) {
    console.error('Sync metrics error:', err);
    res.status(500).json({ error: 'Failed to sync metrics' });
  }
});

export default router;


