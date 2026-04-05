"use strict";

import express from 'express';
import { prisma } from '../db';
import authenticateJWT from '../middleware/auth';
import { 
  getCertificationStatus, 
  updateCertificationBadge, 
  checkCertificationEligibility 
} from '../lib/rap';
const router = express.Router();

// Helper: admin check
function isAdmin(req) {
  return (req.user && req.user.userType === 'GOVERNMENT') || (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY);
}

// Company overview: placements & retention
router.get('/company/overview', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const company = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) return void res.status(404).json({ error: 'Company profile not found' });

    const days = Math.max(1, Math.min(365, Number(req.query.days || 90)));
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    if (!prisma?.placementOutcome || typeof prisma.placementOutcome.count !== 'function') {
      return void res.json({ periodDays: days, placements: 0, month1RetentionPercent: 0 });
    }

    // Count HIRED placements (placement outcomes where application.job.userId == company.userId)
    const hiredCount = await prisma.placementOutcome.count({ where: { milestone: 'HIRED', achievedAt: { gte: start }, application: { job: { userId: company.userId } } } });

    // For retention, count placements that also have MONTH_1
    const month1Count = await prisma.placementOutcome.count({ where: { milestone: 'MONTH_1', application: { job: { userId: company.userId } }, achievedAt: { gte: start } } });

    const retentionRate = hiredCount === 0 ? 0 : Math.round((month1Count / hiredCount) * 10000) / 100; // percent with 2 decimals

    res.json({ periodDays: days, placements: hiredCount, month1RetentionPercent: retentionRate });
  } catch (err) {
    console.error('RAP company overview error:', err);
    res.status(500).json({ error: 'Failed to fetch RAP overview' });
  }
});

// Admin summary: placements per company and timeseries
router.get('/admin/placements-summary', async (req, res) => {
  try {
    if (!isAdmin(req)) return void res.status(403).json({ error: 'Not authorized' });

    const days = Math.max(1, Math.min(365, Number(req.query.days || 90)));
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    if (!prisma?.placementOutcome || typeof prisma.placementOutcome.findMany !== 'function') {
      const dayMap = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().split('T')[0];
        dayMap[key] = 0;
      }
      const timeseries = Object.entries(dayMap).map(([date, count]) => ({ date, count }));
      return void res.json({ total: 0, byCompany: {}, timeseries });
    }

    // Fetch outcomes HIRED in timeframe (limit to reasonable size)
    const outcomes = await prisma.placementOutcome.findMany({ where: { milestone: 'HIRED', achievedAt: { gte: start } }, include: { application: { include: { job: true } } }, take: 5000 });

    // Aggregate per company (by job.userId)
    const byCompany = {};
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    outcomes.forEach((o) => {
      const job = o.application?.job;
      const compUserId = job ? job.userId : 'unknown';
      byCompany[compUserId] = (byCompany[compUserId] || 0) + 1;
      const key = o.achievedAt.toISOString().split('T')[0];
      if (dayMap[key] !== undefined) dayMap[key]++;
    });

    const timeseries = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

    res.json({ total: outcomes.length, byCompany, timeseries });
  } catch (err) {
    console.error('RAP admin summary error:', err);
    res.status(500).json({ error: 'Failed to fetch placements summary' });
  }
});

// Get RAP certification status for current company
router.get('/certification', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const status = await getCertificationStatus(userId);
    res.json(status);
  } catch (err) {
    console.error('RAP certification status error:', err);
    res.status(500).json({ error: 'Failed to fetch certification status' });
  }
});

// Check eligibility for certification
router.get('/certification/eligibility', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const eligibility = await checkCertificationEligibility(userId);
    res.json(eligibility);
  } catch (err) {
    console.error('RAP certification eligibility error:', err);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// Recalculate and update certification badge
router.post('/certification/update', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const result = await updateCertificationBadge(userId);
    res.json(result);
  } catch (err) {
    console.error('RAP certification update error:', err);
    res.status(500).json({ error: 'Failed to update certification' });
  }
});

export default router;


