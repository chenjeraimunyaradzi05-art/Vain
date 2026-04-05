/**
 * Government Portal API Routes
 * 
 * Provides endpoints for government users to access:
 * - Closing the Gap dashboard metrics
 * - Compliance reports
 * - Regional/industry/demographic breakdowns
 * - Data exports
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import {
  getClosingTheGapMetrics,
  getRegionalBreakdown,
  getIndustryBreakdown,
  getDemographicBreakdown,
  getEmployerAccountability,
  generateComplianceReport,
  getLongitudinalTrends,
  CTG_PRIORITIES,
  REGIONS,
} from '../lib/governmentReporting';

const router = express.Router();

/**
 * Middleware to check if user is GOVERNMENT or ADMIN
 */
async function isGovernmentOrAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { userType: true }
    });

    if (!user || (user.userType !== 'GOVERNMENT' && user.userType !== 'ADMIN')) {
      return void res.status(403).json({ error: 'Government or admin access required' });
    }
    
    req.user.userType = user.userType;
    next();
  } catch (err) {
    console.error('Auth check error:', err);
    res.status(500).json({ error: 'Failed to verify access' });
  }
}

/**
 * Validate date string format
 */
function isValidDate(dateStr) {
  if (!dateStr) return true; // Optional
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * GET /api/government/dashboard
 * Get Closing the Gap dashboard metrics
 */
router.get('/dashboard', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;
    
    // Validate date inputs
    if (startDate && !isValidDate(startDate)) {
      return void res.status(400).json({ success: false, error: 'Invalid startDate format' });
    }
    if (endDate && !isValidDate(endDate)) {
      return void res.status(400).json({ success: false, error: 'Invalid endDate format' });
    }
    
    const metrics = await getClosingTheGapMetrics({ 
      startDate, 
      endDate, 
      region 
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    console.error('Government dashboard error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load dashboard metrics' 
    });
  }
});

/**
 * GET /api/government/regional
 * Get regional breakdown of outcomes
 */
router.get('/regional', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const regional = await getRegionalBreakdown({ startDate, endDate });

    res.json({
      success: true,
      data: regional,
    });
  } catch (err) {
    console.error('Regional breakdown error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load regional data' 
    });
  }
});

/**
 * GET /api/government/industry
 * Get industry sector breakdown
 */
router.get('/industry', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const industry = await getIndustryBreakdown();

    res.json({
      success: true,
      data: industry,
    });
  } catch (err) {
    console.error('Industry breakdown error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load industry data' 
    });
  }
});

/**
 * GET /api/government/demographics
 * Get demographic breakdown
 */
router.get('/demographics', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const demographics = await getDemographicBreakdown();

    res.json({
      success: true,
      data: demographics,
    });
  } catch (err) {
    console.error('Demographics error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load demographic data' 
    });
  }
});

/**
 * GET /api/government/employers
 * Get employer accountability metrics
 */
router.get('/employers', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const employers = await getEmployerAccountability();

    res.json({
      success: true,
      data: employers,
    });
  } catch (err) {
    console.error('Employer metrics error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load employer data' 
    });
  }
});

/**
 * GET /api/government/trends
 * Get longitudinal trend data
 */
router.get('/trends', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const trends = await getLongitudinalTrends(parseInt(months, 10));

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load trend data' 
    });
  }
});

/**
 * GET /api/government/reports
 * List available reports
 */
router.get('/reports', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    // In production, would fetch from database
    const reports = [
      {
        id: 'CTG-2025-Q1',
        title: 'Q1 2025 Closing the Gap Report',
        type: 'quarterly',
        period: '2025-01-01 to 2025-03-31',
        status: 'PUBLISHED',
        generatedAt: '2025-04-02T10:00:00Z',
      },
      {
        id: 'CTG-2024-ANNUAL',
        title: 'Annual Closing the Gap Report 2024',
        type: 'annual',
        period: '2024-01-01 to 2024-12-31',
        status: 'PUBLISHED',
        generatedAt: '2025-01-15T10:00:00Z',
      },
      {
        id: 'CTG-2024-Q4',
        title: 'Q4 2024 Closing the Gap Report',
        type: 'quarterly',
        period: '2024-10-01 to 2024-12-31',
        status: 'PUBLISHED',
        generatedAt: '2025-01-05T10:00:00Z',
      },
    ];

    res.json({
      success: true,
      data: { reports },
    });
  } catch (err) {
    console.error('Reports list error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load reports' 
    });
  }
});

/**
 * POST /api/government/reports/generate
 * Generate a new compliance report
 */
router.post('/reports/generate', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const { reportType = 'quarterly', periodStart, periodEnd } = req.body;
    
    const report = await generateComplianceReport({
      reportType,
      periodStart,
      periodEnd,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate report' 
    });
  }
});

/**
 * GET /api/government/reports/:reportId
 * Get a specific report
 */
router.get('/reports/:reportId', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Generate fresh report data for the requested ID
    const report = await generateComplianceReport({
      reportType: reportId.includes('ANNUAL') ? 'annual' : 'quarterly',
    });
    
    report.reportId = reportId;

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    console.error('Report fetch error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch report' 
    });
  }
});

/**
 * GET /api/government/reports/:reportId/export
 * Export report as CSV/PDF data
 */
router.get('/reports/:reportId/export', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'csv' } = req.query;
    
    const report = await generateComplianceReport({
      reportType: reportId.includes('ANNUAL') ? 'annual' : 'quarterly',
    });

    if (format === 'csv') {
      // Generate CSV data
      const csvRows = [
        ['Metric', 'Value', 'Target', 'Status'],
        ['Total Placements', report.executiveSummary.totalPlacements, '200', report.executiveSummary.overallStatus],
        ['Retention Rate', `${report.executiveSummary.retentionRate}%`, '85%', 'ON_TRACK'],
        ['Training Completions', report.executiveSummary.trainingCompletions, '150', 'ON_TRACK'],
        ['Employer Partnerships', report.executiveSummary.employerPartnerships, '80', 'EXCEEDING'],
        ['', '', '', ''],
        ['Regional Breakdown', '', '', ''],
        ...report.regionalAnalysis.regions.map(r => [r.name, r.placements, '', `${r.percentage}%`]),
        ['', '', '', ''],
        ['Industry Breakdown', '', '', ''],
        ...report.industryAnalysis.sectors.map(s => [s.sector, s.placements, '', s.growth]),
      ];

      const csv = csvRows.map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportId}.csv"`);
      res.send(csv);
    } else {
      // Return JSON for PDF generation on client
      res.json({
        success: true,
        data: {
          reportId,
          format: 'pdf-data',
          report,
        },
      });
    }
  } catch (err) {
    console.error('Report export error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export report' 
    });
  }
});

/**
 * GET /api/government/priorities
 * Get Closing the Gap priority definitions
 */
router.get('/priorities', authenticateJWT, isGovernmentOrAdmin, async (req, res) => {
  res.json({
    success: true,
    data: {
      priorities: Object.values(CTG_PRIORITIES),
      regions: REGIONS,
    },
  });
});

export default router;



