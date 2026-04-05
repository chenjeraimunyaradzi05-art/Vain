/**
 * Referral Program Service
 * 
 * Manages member referrals with tracking, rewards, and analytics.
 * 
 * Features:
 * - Unique referral codes per user
 * - Referral tracking and conversion
 * - Multi-tier rewards (signup, hired, milestones)
 * - Referral leaderboard
 * - Campaign management
 * - Analytics and reporting
 */

import { prisma as prismaClient } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';
import { gamificationService } from './gamificationService';

const prisma = prismaClient as any;
import crypto from 'crypto';

// Types
export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  isActive: boolean;
  usageCount: number;
  maxUsages?: number;
  expiresAt?: Date;
  campaignId?: string;
  createdAt: Date;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCodeId: string;
  status: ReferralStatus;
  source?: string;
  metadata?: Record<string, any>;
  convertedAt?: Date;
  rewardPaidAt?: Date;
  createdAt: Date;
}

export type ReferralStatus = 
  | 'PENDING'       // User signed up but not verified
  | 'ACTIVE'        // User verified and active
  | 'HIRED'         // Referred user got a job
  | 'EXPIRED'       // Referral expired
  | 'INVALID';      // Invalid/fraudulent referral

export interface ReferralReward {
  id: string;
  referralId: string;
  userId: string;
  type: RewardType;
  amount: number;
  status: RewardStatus;
  paidAt?: Date;
  metadata?: Record<string, any>;
}

export type RewardType = 
  | 'SIGNUP_BONUS'           // When referred user signs up
  | 'ACTIVATION_BONUS'       // When referred user completes profile
  | 'HIRED_BONUS'            // When referred user gets hired
  | 'MILESTONE_BONUS'        // Milestone rewards (e.g., 10 referrals)
  | 'CAMPAIGN_BONUS';        // Special campaign bonuses

export type RewardStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface ReferralCampaign {
  id: string;
  name: string;
  description: string;
  code: string;
  multiplier: number;    // Bonus multiplier (e.g., 2x during campaign)
  bonusPoints: number;   // Extra points on top of normal rewards
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  targetAudience?: string[];
  maxParticipants?: number;
  currentParticipants: number;
  metadata?: Record<string, any>;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  hiredReferrals: number;
  totalPointsEarned: number;
  conversionRate: number;
  rank: number;
}

export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  referralCount: number;
  hiredCount: number;
  pointsEarned: number;
}

// Reward configuration
const REWARD_CONFIG = {
  SIGNUP_BONUS: 25,         // Points when someone signs up with code
  ACTIVATION_BONUS: 50,     // Points when they complete profile
  HIRED_BONUS: 500,         // Points when they get hired
  MILESTONES: [
    { count: 5, bonus: 100, name: 'Networker' },
    { count: 10, bonus: 250, name: 'Connector' },
    { count: 25, bonus: 500, name: 'Ambassador' },
    { count: 50, bonus: 1000, name: 'Champion' },
    { count: 100, bonus: 2500, name: 'Legend' },
  ],
};

class ReferralService {
  private static instance: ReferralService;
  private cachePrefix = 'referral:';
  private cacheTTL = 300;

  static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }

  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userId: string, options?: { campaignId?: string; maxUsages?: number; expiresAt?: Date }): Promise<ReferralCode> {
    try {
      // Check if user already has an active code
      const existingCode = await prisma.referralCode.findFirst({
        where: {
          userId,
          isActive: true,
          campaignId: options?.campaignId || null,
        },
      });

      if (existingCode) {
        return existingCode as unknown as ReferralCode;
      }

      // Generate unique code
      const code = await this.generateUniqueCode(userId);

      const referralCode = await prisma.referralCode.create({
        data: {
          userId,
          code,
          isActive: true,
          usageCount: 0,
          maxUsages: options?.maxUsages,
          expiresAt: options?.expiresAt,
          campaignId: options?.campaignId,
        },
      });

      logger.info('Referral code generated', { userId, code });
      return referralCode as unknown as ReferralCode;
    } catch (error: any) {
      logger.error('Failed to generate referral code', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Generate unique code string
   */
  private async generateUniqueCode(userId: string): Promise<string> {
    // Get user's name or fallback
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Create code prefix from name (first 4 chars, uppercase, letters only)
    const namePrefix = (user?.name || 'USER')
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 4)
      .toUpperCase()
      .padEnd(4, 'X');

    // Add random suffix
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    const code = `${namePrefix}${randomSuffix}`;

    // Verify uniqueness
    const exists = await prisma.referralCode.findUnique({
      where: { code },
    });

    if (exists) {
      // Retry with different random suffix
      return this.generateUniqueCode(userId);
    }

    return code;
  }

  /**
   * Get user's referral code
   */
  async getUserReferralCode(userId: string): Promise<ReferralCode | null> {
    try {
      const code = await prisma.referralCode.findFirst({
        where: {
          userId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      return code as unknown as ReferralCode;
    } catch (error: any) {
      logger.error('Failed to get referral code', { error: error.message, userId });
      return null;
    }
  }

  /**
   * Validate a referral code
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string; campaign?: ReferralCampaign; error?: string }> {
    try {
      const referralCode = await prisma.referralCode.findUnique({
        where: { code: code.toUpperCase() },
        include: { campaign: true },
      });

      if (!referralCode) {
        return { valid: false, error: 'Invalid referral code' };
      }

      if (!referralCode.isActive) {
        return { valid: false, error: 'This referral code is no longer active' };
      }

      if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
        return { valid: false, error: 'This referral code has expired' };
      }

      if (referralCode.maxUsages && referralCode.usageCount >= referralCode.maxUsages) {
        return { valid: false, error: 'This referral code has reached its usage limit' };
      }

      return {
        valid: true,
        referrerId: referralCode.userId,
        campaign: referralCode.campaign as unknown as ReferralCampaign,
      };
    } catch (error: any) {
      logger.error('Failed to validate referral code', { error: error.message, code });
      return { valid: false, error: 'Error validating code' };
    }
  }

  /**
   * Process a referral when a new user signs up
   */
  async processSignupReferral(referredUserId: string, referralCode: string, source?: string): Promise<Referral | null> {
    try {
      const validation = await this.validateReferralCode(referralCode);
      if (!validation.valid || !validation.referrerId) {
        logger.warn('Invalid referral code used', { referralCode, referredUserId });
        return null;
      }

      // Prevent self-referral
      if (validation.referrerId === referredUserId) {
        logger.warn('Self-referral attempt blocked', { userId: referredUserId });
        return null;
      }

      // Check if user was already referred
      const existingReferral = await prisma.referral.findFirst({
        where: { referredId: referredUserId },
      });

      if (existingReferral) {
        logger.warn('User already has a referral', { referredUserId });
        return existingReferral as unknown as Referral;
      }

      // Get the referral code record
      const codeRecord = await prisma.referralCode.findUnique({
        where: { code: referralCode.toUpperCase() },
      });

      if (!codeRecord) {
        return null;
      }

      // Create referral
      const referral = await prisma.referral.create({
        data: {
          referrerId: validation.referrerId,
          referredId: referredUserId,
          referralCodeId: codeRecord.id,
          status: 'PENDING',
          source,
          metadata: validation.campaign ? { campaignId: validation.campaign.id } : undefined,
        },
      });

      // Increment usage count
      await prisma.referralCode.update({
        where: { id: codeRecord.id },
        data: { usageCount: { increment: 1 } },
      });

      // Award signup points to referrer
      const multiplier = validation.campaign?.multiplier || 1;
      const bonusPoints = validation.campaign?.bonusPoints || 0;
      const signupBonus = Math.floor(REWARD_CONFIG.SIGNUP_BONUS * multiplier) + bonusPoints;

      await this.createReward(referral.id, validation.referrerId, 'SIGNUP_BONUS', signupBonus);
      await gamificationService.awardPoints(validation.referrerId, 'REFERRAL_SIGNUP', { referredUserId });

      logger.info('Referral processed', { referrerId: validation.referrerId, referredUserId });
      return referral as unknown as Referral;
    } catch (error: any) {
      logger.error('Failed to process referral', { error: error.message, referredUserId, referralCode });
      return null;
    }
  }

  /**
   * Update referral status when referred user activates (completes profile)
   */
  async activateReferral(referredUserId: string): Promise<void> {
    try {
      const referral = await prisma.referral.findFirst({
        where: { referredId: referredUserId, status: 'PENDING' },
      });

      if (!referral) {
        return;
      }

      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'ACTIVE',
          convertedAt: new Date(),
        },
      });

      // Award activation bonus
      await this.createReward(referral.id, referral.referrerId, 'ACTIVATION_BONUS', REWARD_CONFIG.ACTIVATION_BONUS);

      // Check for milestones
      await this.checkMilestones(referral.referrerId);

      logger.info('Referral activated', { referralId: referral.id });
    } catch (error: any) {
      logger.error('Failed to activate referral', { error: error.message, referredUserId });
    }
  }

  /**
   * Update referral when referred user gets hired
   */
  async processHiredReferral(referredUserId: string): Promise<void> {
    try {
      const referral = await prisma.referral.findFirst({
        where: { referredId: referredUserId, status: { in: ['PENDING', 'ACTIVE'] } },
      });

      if (!referral) {
        return;
      }

      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'HIRED' },
      });

      // Award hired bonus (big reward!)
      await this.createReward(referral.id, referral.referrerId, 'HIRED_BONUS', REWARD_CONFIG.HIRED_BONUS);
      await gamificationService.awardPoints(referral.referrerId, 'REFERRAL_HIRED', { referredUserId });

      logger.info('Hired referral processed', { referralId: referral.id, referrerId: referral.referrerId });
    } catch (error: any) {
      logger.error('Failed to process hired referral', { error: error.message, referredUserId });
    }
  }

  /**
   * Create a reward record
   */
  private async createReward(referralId: string, userId: string, type: RewardType, amount: number): Promise<ReferralReward> {
    const reward = await prisma.referralReward.create({
      data: {
        referralId,
        userId,
        type,
        amount,
        status: 'APPROVED',
      },
    });

    return reward as unknown as ReferralReward;
  }

  /**
   * Check and award milestone bonuses
   */
  private async checkMilestones(userId: string): Promise<void> {
    try {
      const successfulCount = await prisma.referral.count({
        where: { referrerId: userId, status: { in: ['ACTIVE', 'HIRED'] } },
      });

      for (const milestone of REWARD_CONFIG.MILESTONES) {
        if (successfulCount >= milestone.count) {
          // Check if already awarded
          const alreadyAwarded = await prisma.referralReward.findFirst({
            where: {
              userId,
              type: 'MILESTONE_BONUS',
              metadata: { path: ['milestone'], equals: milestone.count },
            },
          });

          if (!alreadyAwarded) {
            await prisma.referralReward.create({
              data: {
                referralId: null as any, // Milestone not tied to specific referral
                userId,
                type: 'MILESTONE_BONUS',
                amount: milestone.bonus,
                status: 'APPROVED',
                metadata: { milestone: milestone.count, name: milestone.name },
              },
            });

            logger.info('Milestone awarded', { userId, milestone: milestone.name });
          }
        }
      }
    } catch (error: any) {
      logger.error('Failed to check milestones', { error: error.message, userId });
    }
  }

  /**
   * Get user's referral statistics
   */
  async getUserReferralStats(userId: string): Promise<ReferralStats> {
    try {
      const cacheKey = `${this.cachePrefix}stats:${userId}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      const [totalReferrals, successfulReferrals, pendingReferrals, hiredReferrals, rewards, rank] = await Promise.all([
        prisma.referral.count({ where: { referrerId: userId } }),
        prisma.referral.count({ where: { referrerId: userId, status: { in: ['ACTIVE', 'HIRED'] } } }),
        prisma.referral.count({ where: { referrerId: userId, status: 'PENDING' } }),
        prisma.referral.count({ where: { referrerId: userId, status: 'HIRED' } }),
        prisma.referralReward.aggregate({
          where: { userId, status: { in: ['APPROVED', 'PAID'] } },
          _sum: { amount: true },
        }),
        this.getUserReferralRank(userId),
      ]);

      const stats: ReferralStats = {
        totalReferrals,
        successfulReferrals,
        pendingReferrals,
        hiredReferrals,
        totalPointsEarned: rewards._sum.amount || 0,
        conversionRate: totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0,
        rank,
      };

      await redisCache.set(cacheKey, JSON.stringify(stats), this.cacheTTL);
      return stats;
    } catch (error: any) {
      logger.error('Failed to get referral stats', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user's referrals
   */
  async getUserReferrals(userId: string, options?: { status?: ReferralStatus; limit?: number; offset?: number }): Promise<{ referrals: Referral[]; total: number }> {
    try {
      const where = {
        referrerId: userId,
        ...(options?.status && { status: options.status }),
      };

      const [referrals, total] = await Promise.all([
        prisma.referral.findMany({
          where,
          include: {
            referredUser: {
              select: { id: true, name: true, avatarUrl: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: options?.limit || 20,
          skip: options?.offset || 0,
        }),
        prisma.referral.count({ where }),
      ]);

      return { referrals: referrals as unknown as Referral[], total };
    } catch (error: any) {
      logger.error('Failed to get user referrals', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get referral leaderboard
   */
  async getLeaderboard(options?: { limit?: number; offset?: number; timeframe?: 'all' | 'month' | 'week' }): Promise<ReferralLeaderboardEntry[]> {
    const { limit = 20, offset = 0, timeframe = 'all' } = options || {};

    try {
      let dateFilter = {};
      if (timeframe === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { gte: startOfMonth } };
      } else if (timeframe === 'week') {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { gte: startOfWeek } };
      }

      // Get referral counts grouped by referrer
      const referralCounts = await prisma.referral.groupBy({
        by: ['referrerId'],
        where: {
          status: { in: ['ACTIVE', 'HIRED'] },
          ...dateFilter,
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: limit,
        skip: offset,
      });

      // Get user details and hired counts
      const leaderboard: ReferralLeaderboardEntry[] = [];

      for (let i = 0; i < referralCounts.length; i++) {
        const entry = referralCounts[i];
        const [user, hiredCount, rewards] = await Promise.all([
          prisma.user.findUnique({
            where: { id: entry.referrerId },
            select: { id: true, name: true, avatarUrl: true },
          }),
          prisma.referral.count({
            where: { referrerId: entry.referrerId, status: 'HIRED', ...dateFilter },
          }),
          prisma.referralReward.aggregate({
            where: { userId: entry.referrerId, status: { in: ['APPROVED', 'PAID'] } },
            _sum: { amount: true },
          }),
        ]);

        if (user) {
          leaderboard.push({
            rank: offset + i + 1,
            userId: user.id,
            userName: user.name || 'Anonymous',
            userAvatar: user.avatarUrl || undefined,
            referralCount: entry._count.id,
            hiredCount,
            pointsEarned: rewards._sum.amount || 0,
          });
        }
      }

      return leaderboard;
    } catch (error: any) {
      logger.error('Failed to get referral leaderboard', { error: error.message });
      return [];
    }
  }

  /**
   * Get user's rank on referral leaderboard
   */
  private async getUserReferralRank(userId: string): Promise<number> {
    try {
      const userCount = await prisma.referral.count({
        where: { referrerId: userId, status: { in: ['ACTIVE', 'HIRED'] } },
      });

      const higherRanked = await prisma.referral.groupBy({
        by: ['referrerId'],
        where: { status: { in: ['ACTIVE', 'HIRED'] } },
        _count: { id: true },
        having: { id: { _count: { gt: userCount } } },
      });

      return higherRanked.length + 1;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<ReferralCampaign[]> {
    try {
      const now = new Date();
      const campaigns = await prisma.referralCampaign.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { endDate: 'asc' },
      });

      return campaigns as unknown as ReferralCampaign[];
    } catch (error: any) {
      logger.error('Failed to get active campaigns', { error: error.message });
      return [];
    }
  }

  /**
   * Create a referral campaign
   */
  async createCampaign(campaign: Omit<ReferralCampaign, 'id' | 'currentParticipants'>): Promise<ReferralCampaign> {
    try {
      const created = await prisma.referralCampaign.create({
        data: {
          name: campaign.name,
          description: campaign.description,
          code: campaign.code.toUpperCase(),
          multiplier: campaign.multiplier,
          bonusPoints: campaign.bonusPoints,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          isActive: campaign.isActive,
          targetAudience: campaign.targetAudience,
          maxParticipants: campaign.maxParticipants,
          currentParticipants: 0,
          metadata: campaign.metadata,
        },
      });

      logger.info('Referral campaign created', { campaignId: created.id, name: campaign.name });
      return created as unknown as ReferralCampaign;
    } catch (error: any) {
      logger.error('Failed to create campaign', { error: error.message });
      throw error;
    }
  }

  /**
   * Get referral share URL
   */
  getShareUrl(code: string): string {
    const baseUrl = process.env.WEB_URL || 'https://ngurra.app';
    return `${baseUrl}/join?ref=${code}`;
  }

  /**
   * Get referral share messages for different platforms
   */
  getShareMessages(code: string, userName: string): { platform: string; message: string }[] {
    const shareUrl = this.getShareUrl(code);
    const shortMessage = `Join Ngurra Pathways - Australia's Indigenous professional network! Use my referral code: ${code}`;
    const longMessage = `Hey! I'm inviting you to join Ngurra Pathways, Australia's leading platform connecting Indigenous professionals with meaningful career opportunities. Sign up with my referral code ${code} and we'll both earn rewards! ${shareUrl}`;

    return [
      {
        platform: 'twitter',
        message: `${shortMessage} ${shareUrl} #IndigenousCareers #FirstNationsJobs`,
      },
      {
        platform: 'facebook',
        message: longMessage,
      },
      {
        platform: 'linkedin',
        message: `I'm proud to be part of Ngurra Pathways, connecting Indigenous Australians with career opportunities. Join us: ${shareUrl}`,
      },
      {
        platform: 'email',
        message: `Subject: Join me on Ngurra Pathways!\n\n${longMessage}`,
      },
      {
        platform: 'sms',
        message: shortMessage,
      },
    ];
  }
}

// Export singleton instance
export const referralService = ReferralService.getInstance();

// Export class for testing
export { ReferralService, REWARD_CONFIG };

