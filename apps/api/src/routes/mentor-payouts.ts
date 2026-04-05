// @ts-nocheck
"use strict";

/**
 * Mentor Payouts API Routes
 * 
 * Endpoints:
 * - POST /mentor-payouts/setup - Start Stripe Connect onboarding
 * - GET /mentor-payouts/status - Get payout account status
 * - GET /mentor-payouts/dashboard - Get link to Stripe dashboard
 * - GET /mentor-payouts/balance - Get current balance
 * - GET /mentor-payouts/history - Get transfer history
 * - POST /mentor-payouts/process-session - Process payment for completed session (admin)
 */

import express from 'express';
import { prisma } from '../db';
import authenticateJWT from '../middleware/auth';
import stripeConnect from '../lib/stripeConnect';

const router = express.Router();

// Helper: check if user is mentor
function isMentor(req) {
  return req.user?.userType === 'MENTOR';
}

// Helper: check if user is admin
function isAdmin(req) {
  return (
    req.user?.userType === 'GOVERNMENT' ||
    (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY)
  );
}

/**
 * POST /mentor-payouts/setup
 * Start Stripe Connect onboarding for a mentor
 */
router.post('/setup', authenticateJWT, async (req, res) => {
  try {
    if (!isMentor(req)) {
      return void res.status(403).json({ error: 'Only mentors can set up payouts' });
    }
    
    const userId = req.user.id;
    const { returnUrl, refreshUrl } = req.body;
    
    // Get mentor profile
    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    
    if (!mentor) {
      return void res.status(404).json({ error: 'Mentor profile not found' });
    }
    
    // Check if already has a Stripe account
    let stripeAccountId = mentor.stripeAccountId;
    
    if (!stripeAccountId) {
      // Create new Stripe Connect account
      const account = await stripeConnect.createConnectAccount({
        email: mentor.user.email,
        mentorId: userId,
        name: mentor.name,
      });
      
      stripeAccountId = account.id;
      
      // Save account ID to mentor profile
      await prisma.mentorProfile.update({
        where: { userId },
        data: { stripeAccountId: account.id },
      });
    }
    
    // Generate onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3002';
    const onboardingUrl = await stripeConnect.createOnboardingLink(
      stripeAccountId,
      returnUrl || `${baseUrl}/mentor/payouts?setup=complete`,
      refreshUrl || `${baseUrl}/mentor/payouts?setup=refresh`
    );
    
    res.json({
      success: true,
      accountId: stripeAccountId,
      onboardingUrl,
    });
  } catch (error) {
    console.error('[MentorPayouts] Setup error:', error);
    res.status(500).json({ error: 'Failed to set up payouts' });
  }
});

/**
 * GET /mentor-payouts/status
 * Get the status of a mentor's payout account
 */
router.get('/status', authenticateJWT, async (req, res) => {
  try {
    if (!isMentor(req)) {
      return void res.status(403).json({ error: 'Only mentors can view payout status' });
    }
    
    const userId = req.user.id;
    
    // Get mentor profile
    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId },
    });
    
    if (!mentor || !mentor.stripeAccountId) {
      return void res.json({
        connected: false,
        message: 'Payout account not set up',
      });
    }
    
    // Get account status from Stripe
    const status = await stripeConnect.getAccountStatus(mentor.stripeAccountId);
    
    res.json({
      connected: true,
      accountId: mentor.stripeAccountId,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      requirements: status.requirements,
    });
  } catch (error) {
    console.error('[MentorPayouts] Status error:', error);
    res.status(500).json({ error: 'Failed to get payout status' });
  }
});

/**
 * GET /mentor-payouts/dashboard
 * Get a link to the Stripe Express dashboard
 */
router.get('/dashboard', authenticateJWT, async (req, res) => {
  try {
    if (!isMentor(req)) {
      return void res.status(403).json({ error: 'Only mentors can access payout dashboard' });
    }
    
    const userId = req.user.id;
    
    // Get mentor profile
    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId },
    });
    
    if (!mentor || !mentor.stripeAccountId) {
      return void res.status(400).json({ error: 'Payout account not set up' });
    }
    
    // Generate dashboard link
    const dashboardUrl = await stripeConnect.createDashboardLink(mentor.stripeAccountId);
    
    res.json({
      success: true,
      dashboardUrl,
    });
  } catch (error) {
    console.error('[MentorPayouts] Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard link' });
  }
});

/**
 * GET /mentor-payouts/balance
 * Get mentor's current balance
 */
router.get('/balance', authenticateJWT, async (req, res) => {
  try {
    if (!isMentor(req)) {
      return void res.status(403).json({ error: 'Only mentors can view balance' });
    }
    
    const userId = req.user.id;
    
    // Get mentor profile
    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId },
    });
    
    if (!mentor || !mentor.stripeAccountId) {
      return void res.json({
        available: 0,
        pending: 0,
        currency: 'aud',
        message: 'Payout account not set up',
      });
    }
    
    // Get balance from Stripe
    const balance = await stripeConnect.getMentorBalance(mentor.stripeAccountId);
    
    // Get internal earnings summary
    const earnings = await prisma.mentorEarning.aggregate({
      where: { mentorId: userId },
      _sum: { amount: true },
      _count: { id: true },
    });
    
    res.json({
      stripeBalance: balance,
      platformEarnings: {
        total: earnings._sum.amount || 0,
        sessionCount: earnings._count.id || 0,
      },
    });
  } catch (error) {
    console.error('[MentorPayouts] Balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

/**
 * GET /mentor-payouts/history
 * Get transfer history
 */
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    if (!isMentor(req)) {
      return void res.status(403).json({ error: 'Only mentors can view history' });
    }
    
    const userId = req.user.id;
    const { limit = 20, page = 1 } = req.query;
    
    // Get mentor profile
    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId },
    });
    
    // Get internal earnings from database
    const [earnings, total] = await Promise.all([
      prisma.mentorEarning.findMany({
        where: { mentorId: userId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
      }),
      prisma.mentorEarning.count({
        where: { mentorId: userId },
      }),
    ]);
    
    // If connected to Stripe, also get Stripe transfers
    let stripeTransfers = null;
    if (mentor?.stripeAccountId) {
      stripeTransfers = await stripeConnect.getTransferHistory(
        mentor.stripeAccountId,
        parseInt(limit)
      );
    }
    
    res.json({
      earnings,
      stripeTransfers: stripeTransfers?.transfers || [],
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(limit),
        total,
      },
    });
  } catch (error) {
    console.error('[MentorPayouts] History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

/**
 * POST /mentor-payouts/process-session
 * Process payment for a completed mentorship session (admin only)
 */
router.post('/process-session', authenticateJWT, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return void res.status(403).json({ error: 'Admin access required' });
    }
    
    const { sessionId, customRateCents } = req.body;
    
    if (!sessionId) {
      return void res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Get session details
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          include: { mentorProfile: true },
        },
      },
    });
    
    if (!session) {
      return void res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.status !== 'COMPLETED') {
      return void res.status(400).json({ error: 'Session must be completed before payment' });
    }
    
    const mentorProfile = session.mentor.mentorProfile;
    if (!mentorProfile?.stripeAccountId) {
      return void res.status(400).json({ error: 'Mentor has not set up payout account' });
    }
    
    // Process payment
    const result = await stripeConnect.processSessionPayment({
      sessionId,
      mentorAccountId: mentorProfile.stripeAccountId,
      sessionRateCents: customRateCents,
    });
    
    // Record earning in database
    await prisma.mentorEarning.create({
      data: {
        mentorId: session.mentorId,
        amount: result.breakdown.mentorPayout / 100, // Store as dollars
        status: 'paid',
        metadata: JSON.stringify({
          sessionId,
          transferId: result.id,
          breakdown: result.breakdown,
        }),
      },
    });
    
    res.json({
      success: true,
      transfer: result,
    });
  } catch (error) {
    console.error('[MentorPayouts] Process session error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

/**
 * GET /mentor-payouts/rates
 * Get current session rates and fee structure
 */
router.get('/rates', (req, res) => {
  const breakdown = stripeConnect.calculatePayout();
  
  res.json({
    sessionRateDollars: breakdown.sessionRate / 100,
    sessionRateCents: breakdown.sessionRate,
    platformFeePercent: breakdown.platformFeePercent,
    mentorPayoutDollars: breakdown.mentorPayout / 100,
    mentorPayoutCents: breakdown.mentorPayout,
    currency: breakdown.currency,
  });
});

export default router;


export {};


