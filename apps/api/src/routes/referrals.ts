/**
 * Referral System API Routes
 * 
 * Allows members to refer friends and earn credits when referrals:
 * - Sign up (small credit)
 * - Get hired (larger credit)
 * 
 * Endpoints:
 * - GET /referrals - Get user's referral info
 * - GET /referrals/code - Get/generate referral code
 * - POST /referrals/validate - Validate a referral code
 * - POST /referrals/apply - Apply referral code during signup
 * - GET /referrals/history - Get referral history
 * - POST /referrals/redeem - Redeem credits (future: for rewards)
 */

import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import authenticateJWT from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Credit amounts
const CREDITS = {
  SIGNUP: 25,      // When referral signs up
  HIRED: 100,      // When referral gets hired
  MENTOR_SESSION: 10, // When referral completes mentor session
};

/**
 * Generate a unique referral code
 * Format: NGURRA-XXXXXX (8 chars total for easy sharing)
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
  let code = 'NG-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * GET /referrals
 * Get current user's referral summary
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's referral code or create one
    let referralCode = await prisma.referralCode.findUnique({
      where: { userId },
    });

    if (!referralCode) {
      let code;
      let attempts = 0;
      do {
        code = generateReferralCode();
        attempts++;
      } while (
        attempts < 10 &&
        await prisma.referralCode.findUnique({ where: { code } })
      );

      referralCode = await prisma.referralCode.create({
        data: {
          userId,
          code,
        },
      });
    }

    // Get referral stats
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
    });

    const stats = {
      totalReferrals: referrals.length,
      signedUp: referrals.filter(r => r.status === 'SIGNED_UP' || r.status === 'HIRED').length,
      hired: referrals.filter(r => r.status === 'HIRED').length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
    };

    // Calculate total credits
    const totalCredits = referrals.reduce((sum, r) => sum + (r.creditsEarned || 0), 0);
    const redeemedCredits = referrals.reduce((sum, r) => sum + (r.creditsRedeemed || 0), 0);

    res.json({
      referralCode: referralCode.code,
      shareUrl: `${process.env.FRONTEND_URL || 'https://ngurrapathways.com.au'}/register?ref=${referralCode.code}`,
      stats,
      credits: {
        total: totalCredits,
        redeemed: redeemedCredits,
        available: totalCredits - redeemedCredits,
      },
    });
  } catch (error) {
    console.error('[Referrals] Get error:', error);
    res.status(500).json({ error: 'Failed to get referral info' });
  }
});

/**
 * GET /referrals/code
 * Get or generate user's referral code
 */
router.get('/code', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    let referralCode = await prisma.referralCode.findUnique({
      where: { userId },
    });

    if (!referralCode) {
      let code;
      let attempts = 0;
      do {
        code = generateReferralCode();
        attempts++;
      } while (
        attempts < 10 &&
        await prisma.referralCode.findUnique({ where: { code } })
      );

      referralCode = await prisma.referralCode.create({
        data: {
          userId,
          code,
        },
      });
    }

    res.json({
      code: referralCode.code,
      shareUrl: `${process.env.FRONTEND_URL || 'https://ngurrapathways.com.au'}/register?ref=${referralCode.code}`,
    });
  } catch (error) {
    console.error('[Referrals] Code error:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

/**
 * POST /referrals/validate
 * Validate a referral code (used during registration)
 */
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return void res.status(400).json({ error: 'Referral code required' });
    }

    const referralCode = await prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        // @ts-ignore
        user: {
          select: {
            id: true,
            email: true,
            memberProfile: {
              select: { firstName: true },
            },
          },
        },
      },
    });

    if (!referralCode) {
      return void res.status(404).json({ valid: false, error: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrerName: referralCode.user?.memberProfile?.firstName || 'A friend',
    });
  } catch (error) {
    console.error('[Referrals] Validate error:', error);
    res.status(500).json({ error: 'Failed to validate code' });
  }
});

/**
 * POST /referrals/apply
 * Apply a referral code after successful registration
 */
router.post('/apply', authenticateJWT, async (req, res) => {
  try {
    const { code } = req.body;
    const refereeId = req.user.id;

    if (!code) {
      return void res.status(400).json({ error: 'Referral code required' });
    }

    // Check if user already has a referrer
    const existingReferral = await prisma.referral.findFirst({
      where: { refereeId },
    });

    if (existingReferral) {
      return void res.status(400).json({ error: 'Referral code already applied' });
    }

    // Find the referral code
    const referralCode = await prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!referralCode) {
      return void res.status(404).json({ error: 'Invalid referral code' });
    }

    // Can't refer yourself
    if (referralCode.userId === refereeId) {
      return void res.status(400).json({ error: 'Cannot use your own referral code' });
    }

    // Create the referral record
    const referral = await prisma.referral.create({
      data: {
        referrerId: referralCode.userId,
        refereeId,
        referralCodeId: referralCode.id,
        status: 'SIGNED_UP',
        creditsEarned: CREDITS.SIGNUP,
      },
    });

    // Update referral code usage count
    await prisma.referralCode.update({
      where: { id: referralCode.id },
      data: { usageCount: { increment: 1 } },
    });

    res.json({
      success: true,
      message: 'Referral code applied successfully',
      creditsEarned: CREDITS.SIGNUP,
    });
  } catch (error) {
    console.error('[Referrals] Apply error:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
});

/**
 * GET /referrals/history
 * Get user's referral history
 */
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        referee: {
          select: {
            email: true,
            memberProfile: {
              select: { firstName: true },
            },
          },
        },
      },
    });

    const total = await prisma.referral.count({
      where: { referrerId: userId },
    });

    const history = referrals.map(r => ({
      id: r.id,
      // @ts-ignore
      refereeName: r.referee?.memberProfile?.firstName || 'Anonymous',
      status: r.status,
      creditsEarned: r.creditsEarned,
      createdAt: r.createdAt,
    }));

    res.json({
      history,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('[Referrals] History error:', error);
    res.status(500).json({ error: 'Failed to get referral history' });
  }
});

/**
 * Award credits when a referred user gets hired
 * Called internally from job application flow
 */
async function awardHireBonus(userId) {
  try {
    // Find referral where this user was the referee
    const referral = await prisma.referral.findFirst({
      where: {
        refereeId: userId,
        status: { not: 'HIRED' },
      },
    });

    if (!referral) return null;

    // Update referral with hire bonus
    const updated = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'HIRED',
        creditsEarned: { increment: CREDITS.HIRED },
        hiredAt: new Date(),
      },
    });

    console.log(`[Referrals] Awarded ${CREDITS.HIRED} credits to referrer for hire`);
    return updated;
  } catch (error) {
    console.error('[Referrals] Award hire bonus error:', error);
    return null;
  }
}

export default router;

export { awardHireBonus, CREDITS };


