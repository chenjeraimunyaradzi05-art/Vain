/**
 * Gamification & Achievement System Service
 * 
 * Provides badges, points, levels, and rewards to encourage platform engagement.
 * 
 * Features:
 * - Achievement badges for milestones
 * - Points system for activities
 * - Level progression
 * - Leaderboards
 * - Streaks tracking
 * - Challenges and quests
 * - Rewards redemption
 */

import { prisma as prismaClient } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

const prisma = prismaClient as any;

// Types
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  pointsRequired?: number;
  condition: AchievementCondition;
  isSecret: boolean;
  createdAt: Date;
}

export type AchievementCategory = 
  | 'PROFILE'
  | 'CAREER'
  | 'MENTORSHIP'
  | 'COMMUNITY'
  | 'CULTURAL'
  | 'LEARNING'
  | 'NETWORKING'
  | 'VOLUNTEER'
  | 'ENGAGEMENT';

export interface AchievementCondition {
  type: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  useriId: string;
  achievementId: string;
  achievement: Achievement;
  earnedAt: Date;
  progress: number;
  isComplete: boolean;
}

export interface PointsActivity {
  action: PointsAction;
  points: number;
  description: string;
  cooldown?: number; // Minimum seconds between earning
  dailyLimit?: number;
}

export type PointsAction =
  | 'PROFILE_COMPLETE'
  | 'FIRST_APPLICATION'
  | 'APPLICATION_SUBMITTED'
  | 'INTERVIEW_SCHEDULED'
  | 'JOB_OFFER_RECEIVED'
  | 'MENTOR_SESSION_COMPLETED'
  | 'MENTOR_SESSION_HOSTED'
  | 'CONNECTION_MADE'
  | 'POST_CREATED'
  | 'POST_LIKED'
  | 'COMMENT_ADDED'
  | 'EVENT_ATTENDED'
  | 'CULTURAL_EVENT_ATTENDED'
  | 'VOLUNTEER_HOUR_LOGGED'
  | 'LANGUAGE_LESSON_COMPLETED'
  | 'REFERRAL_SIGNUP'
  | 'REFERRAL_HIRED'
  | 'DAILY_LOGIN'
  | 'WEEKLY_STREAK'
  | 'MONTHLY_STREAK';

export interface UserLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  icon: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  points: number;
  level: number;
  achievementCount: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL';
  action: PointsAction;
  target: number;
  reward: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  challenge: Challenge;
  progress: number;
  isComplete: boolean;
  completedAt?: Date;
}

// Achievements catalog
const ACHIEVEMENTS: Omit<Achievement, 'id' | 'createdAt'>[] = [
  // Profile achievements
  {
    code: 'PROFILE_PIONEER',
    name: 'Profile Pioneer',
    description: 'Complete your profile for the first time',
    category: 'PROFILE',
    icon: '👤',
    tier: 'BRONZE',
    condition: { type: 'PROFILE_COMPLETE', value: 1 },
    isSecret: false,
  },
  {
    code: 'IDENTITY_CONNECTED',
    name: 'Identity Connected',
    description: 'Add your Aboriginal or Torres Strait Islander identity to your profile',
    category: 'CULTURAL',
    icon: '🌏',
    tier: 'BRONZE',
    condition: { type: 'CULTURAL_IDENTITY_ADDED', value: 1 },
    isSecret: false,
  },
  
  // Career achievements
  {
    code: 'FIRST_STEP',
    name: 'First Step',
    description: 'Submit your first job application',
    category: 'CAREER',
    icon: '🎯',
    tier: 'BRONZE',
    condition: { type: 'APPLICATION_COUNT', value: 1 },
    isSecret: false,
  },
  {
    code: 'JOB_SEEKER',
    name: 'Active Job Seeker',
    description: 'Submit 10 job applications',
    category: 'CAREER',
    icon: '📝',
    tier: 'SILVER',
    condition: { type: 'APPLICATION_COUNT', value: 10 },
    isSecret: false,
  },
  {
    code: 'CAREER_CHAMPION',
    name: 'Career Champion',
    description: 'Receive a job offer',
    category: 'CAREER',
    icon: '🏆',
    tier: 'GOLD',
    condition: { type: 'JOB_OFFER_COUNT', value: 1 },
    isSecret: false,
  },
  {
    code: 'INTERVIEW_PRO',
    name: 'Interview Pro',
    description: 'Complete 5 interviews',
    category: 'CAREER',
    icon: '💼',
    tier: 'SILVER',
    condition: { type: 'INTERVIEW_COUNT', value: 5 },
    isSecret: false,
  },
  
  // Mentorship achievements
  {
    code: 'MENTEE_FIRST',
    name: 'Learning Journey Begins',
    description: 'Complete your first mentorship session',
    category: 'MENTORSHIP',
    icon: '🌱',
    tier: 'BRONZE',
    condition: { type: 'MENTEE_SESSION_COUNT', value: 1 },
    isSecret: false,
  },
  {
    code: 'DEDICATED_LEARNER',
    name: 'Dedicated Learner',
    description: 'Complete 10 mentorship sessions',
    category: 'MENTORSHIP',
    icon: '📚',
    tier: 'SILVER',
    condition: { type: 'MENTEE_SESSION_COUNT', value: 10 },
    isSecret: false,
  },
  {
    code: 'MENTOR_HERO',
    name: 'Mentor Hero',
    description: 'Host 25 mentorship sessions',
    category: 'MENTORSHIP',
    icon: '🦸',
    tier: 'GOLD',
    condition: { type: 'MENTOR_SESSION_COUNT', value: 25 },
    isSecret: false,
  },
  {
    code: 'MENTOR_LEGEND',
    name: 'Mentor Legend',
    description: 'Host 100 mentorship sessions',
    category: 'MENTORSHIP',
    icon: '👑',
    tier: 'PLATINUM',
    condition: { type: 'MENTOR_SESSION_COUNT', value: 100 },
    isSecret: false,
  },
  
  // Community achievements
  {
    code: 'SOCIAL_BUTTERFLY',
    name: 'Social Butterfly',
    description: 'Make 10 connections',
    category: 'NETWORKING',
    icon: '🦋',
    tier: 'BRONZE',
    condition: { type: 'CONNECTION_COUNT', value: 10 },
    isSecret: false,
  },
  {
    code: 'COMMUNITY_BUILDER',
    name: 'Community Builder',
    description: 'Make 50 connections',
    category: 'NETWORKING',
    icon: '🏗️',
    tier: 'SILVER',
    condition: { type: 'CONNECTION_COUNT', value: 50 },
    isSecret: false,
  },
  {
    code: 'CONVERSATION_STARTER',
    name: 'Conversation Starter',
    description: 'Create 5 posts',
    category: 'ENGAGEMENT',
    icon: '💬',
    tier: 'BRONZE',
    condition: { type: 'POST_COUNT', value: 5 },
    isSecret: false,
  },
  {
    code: 'VOICE_OF_COMMUNITY',
    name: 'Voice of Community',
    description: 'Create 25 posts',
    category: 'ENGAGEMENT',
    icon: '📢',
    tier: 'SILVER',
    condition: { type: 'POST_COUNT', value: 25 },
    isSecret: false,
  },
  
  // Cultural achievements
  {
    code: 'CULTURAL_EXPLORER',
    name: 'Cultural Explorer',
    description: 'Attend 3 cultural events',
    category: 'CULTURAL',
    icon: '🎭',
    tier: 'BRONZE',
    condition: { type: 'CULTURAL_EVENT_COUNT', value: 3 },
    isSecret: false,
  },
  {
    code: 'CULTURE_KEEPER',
    name: 'Culture Keeper',
    description: 'Attend 10 cultural events',
    category: 'CULTURAL',
    icon: '🌿',
    tier: 'SILVER',
    condition: { type: 'CULTURAL_EVENT_COUNT', value: 10 },
    isSecret: false,
  },
  {
    code: 'LANGUAGE_LEARNER',
    name: 'Language Learner',
    description: 'Complete 5 language lessons',
    category: 'LEARNING',
    icon: '🗣️',
    tier: 'BRONZE',
    condition: { type: 'LANGUAGE_LESSON_COUNT', value: 5 },
    isSecret: false,
  },
  
  // Volunteer achievements
  {
    code: 'HELPING_HAND',
    name: 'Helping Hand',
    description: 'Log 10 volunteer hours',
    category: 'VOLUNTEER',
    icon: '🤝',
    tier: 'BRONZE',
    condition: { type: 'VOLUNTEER_HOURS', value: 10 },
    isSecret: false,
  },
  {
    code: 'COMMUNITY_CHAMPION',
    name: 'Community Champion',
    description: 'Log 50 volunteer hours',
    category: 'VOLUNTEER',
    icon: '🏅',
    tier: 'SILVER',
    condition: { type: 'VOLUNTEER_HOURS', value: 50 },
    isSecret: false,
  },
  {
    code: 'VOLUNTEER_LEGEND',
    name: 'Volunteer Legend',
    description: 'Log 200 volunteer hours',
    category: 'VOLUNTEER',
    icon: '🌟',
    tier: 'GOLD',
    condition: { type: 'VOLUNTEER_HOURS', value: 200 },
    isSecret: false,
  },
  
  // Streak achievements
  {
    code: 'WEEK_WARRIOR',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    category: 'ENGAGEMENT',
    icon: '🔥',
    tier: 'BRONZE',
    condition: { type: 'LOGIN_STREAK', value: 7 },
    isSecret: false,
  },
  {
    code: 'MONTH_MASTER',
    name: 'Month Master',
    description: 'Maintain a 30-day login streak',
    category: 'ENGAGEMENT',
    icon: '⚡',
    tier: 'SILVER',
    condition: { type: 'LOGIN_STREAK', value: 30 },
    isSecret: false,
  },
  
  // Secret achievements
  {
    code: 'EARLY_BIRD',
    name: 'Early Bird',
    description: 'Log in before 6 AM',
    category: 'ENGAGEMENT',
    icon: '🌅',
    tier: 'BRONZE',
    condition: { type: 'EARLY_LOGIN', value: 1 },
    isSecret: true,
  },
  {
    code: 'NAIDOC_PARTICIPANT',
    name: 'NAIDOC Celebrant',
    description: 'Attend a NAIDOC Week event',
    category: 'CULTURAL',
    icon: '🎊',
    tier: 'GOLD',
    condition: { type: 'NAIDOC_EVENT', value: 1 },
    isSecret: true,
  },
];

// Points configuration
const POINTS_CONFIG: Record<PointsAction, PointsActivity> = {
  PROFILE_COMPLETE: { action: 'PROFILE_COMPLETE', points: 100, description: 'Complete your profile' },
  FIRST_APPLICATION: { action: 'FIRST_APPLICATION', points: 50, description: 'Submit your first application' },
  APPLICATION_SUBMITTED: { action: 'APPLICATION_SUBMITTED', points: 10, description: 'Submit a job application', dailyLimit: 5 },
  INTERVIEW_SCHEDULED: { action: 'INTERVIEW_SCHEDULED', points: 25, description: 'Schedule an interview' },
  JOB_OFFER_RECEIVED: { action: 'JOB_OFFER_RECEIVED', points: 200, description: 'Receive a job offer' },
  MENTOR_SESSION_COMPLETED: { action: 'MENTOR_SESSION_COMPLETED', points: 30, description: 'Complete a mentorship session' },
  MENTOR_SESSION_HOSTED: { action: 'MENTOR_SESSION_HOSTED', points: 40, description: 'Host a mentorship session' },
  CONNECTION_MADE: { action: 'CONNECTION_MADE', points: 5, description: 'Make a new connection', dailyLimit: 10 },
  POST_CREATED: { action: 'POST_CREATED', points: 10, description: 'Create a post', dailyLimit: 3 },
  POST_LIKED: { action: 'POST_LIKED', points: 1, description: 'Like a post', dailyLimit: 20 },
  COMMENT_ADDED: { action: 'COMMENT_ADDED', points: 5, description: 'Add a comment', dailyLimit: 10 },
  EVENT_ATTENDED: { action: 'EVENT_ATTENDED', points: 15, description: 'Attend an event' },
  CULTURAL_EVENT_ATTENDED: { action: 'CULTURAL_EVENT_ATTENDED', points: 25, description: 'Attend a cultural event' },
  VOLUNTEER_HOUR_LOGGED: { action: 'VOLUNTEER_HOUR_LOGGED', points: 10, description: 'Log a volunteer hour' },
  LANGUAGE_LESSON_COMPLETED: { action: 'LANGUAGE_LESSON_COMPLETED', points: 20, description: 'Complete a language lesson' },
  REFERRAL_SIGNUP: { action: 'REFERRAL_SIGNUP', points: 50, description: 'Refer a new member who signs up' },
  REFERRAL_HIRED: { action: 'REFERRAL_HIRED', points: 500, description: 'Refer someone who gets hired' },
  DAILY_LOGIN: { action: 'DAILY_LOGIN', points: 5, description: 'Daily login bonus', cooldown: 86400 },
  WEEKLY_STREAK: { action: 'WEEKLY_STREAK', points: 50, description: 'Complete a week-long streak' },
  MONTHLY_STREAK: { action: 'MONTHLY_STREAK', points: 200, description: 'Complete a month-long streak' },
};

// Level configuration
const LEVELS: UserLevel[] = [
  { level: 1, name: 'Newcomer', minPoints: 0, maxPoints: 99, benefits: ['Basic profile'], icon: '🌱' },
  { level: 2, name: 'Explorer', minPoints: 100, maxPoints: 299, benefits: ['Custom profile banner'], icon: '🌿' },
  { level: 3, name: 'Contributor', minPoints: 300, maxPoints: 599, benefits: ['Priority job matching'], icon: '🌳' },
  { level: 4, name: 'Achiever', minPoints: 600, maxPoints: 999, benefits: ['Featured in community'], icon: '🌲' },
  { level: 5, name: 'Champion', minPoints: 1000, maxPoints: 1999, benefits: ['Mentor badge access'], icon: '⭐' },
  { level: 6, name: 'Leader', minPoints: 2000, maxPoints: 3499, benefits: ['Create community groups'], icon: '🌟' },
  { level: 7, name: 'Trailblazer', minPoints: 3500, maxPoints: 5499, benefits: ['Early access to features'], icon: '💫' },
  { level: 8, name: 'Elder in Training', minPoints: 5500, maxPoints: 7999, benefits: ['VIP event access'], icon: '🔥' },
  { level: 9, name: 'Community Elder', minPoints: 8000, maxPoints: 11999, benefits: ['Exclusive networking'], icon: '🏆' },
  { level: 10, name: 'Legendary', minPoints: 12000, maxPoints: Infinity, benefits: ['All platform benefits'], icon: '👑' },
];

class GamificationService {
  private static instance: GamificationService;
  private cachePrefix = 'gamification:';
  private cacheTTL = 300; // 5 minutes

  static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  /**
   * Award points to a user for an action
   */
  async awardPoints(userId: string, action: PointsAction, metadata?: Record<string, any>): Promise<{
    pointsAwarded: number;
    totalPoints: number;
    levelUp?: { oldLevel: number; newLevel: number };
    newAchievements: Achievement[];
  }> {
    try {
      const config = POINTS_CONFIG[action];
      if (!config) {
        throw new Error(`Invalid points action: ${action}`);
      }

      // Check daily limit
      if (config.dailyLimit) {
        const today = new Date().toISOString().split('T')[0];
        const todayCount = await this.getDailyActionCount(userId, action, today);
        if (todayCount >= config.dailyLimit) {
          return { pointsAwarded: 0, totalPoints: await this.getUserPoints(userId), newAchievements: [] };
        }
      }

      // Check cooldown
      if (config.cooldown) {
        const lastAction = await this.getLastActionTime(userId, action);
        if (lastAction) {
          const elapsed = (Date.now() - lastAction.getTime()) / 1000;
          if (elapsed < config.cooldown) {
            return { pointsAwarded: 0, totalPoints: await this.getUserPoints(userId), newAchievements: [] };
          }
        }
      }

      // Record the action
      await prisma.pointsActivity.create({
        data: {
          userId,
          action,
          points: config.points,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });

      // Update user's total points
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          totalPoints: { increment: config.points },
        },
      });

      const oldLevel = this.getLevelForPoints((user.totalPoints || 0) - config.points);
      const newLevel = this.getLevelForPoints(user.totalPoints || 0);

      // Check for new achievements
      const newAchievements = await this.checkAndAwardAchievements(userId);

      // Clear caches
      await this.invalidateUserCache(userId);

      logger.info('Points awarded', { userId, action, points: config.points });

      return {
        pointsAwarded: config.points,
        totalPoints: user.totalPoints || 0,
        levelUp: oldLevel.level < newLevel.level ? { oldLevel: oldLevel.level, newLevel: newLevel.level } : undefined,
        newAchievements,
      };
    } catch (error: any) {
      logger.error('Failed to award points', { error: error.message, userId, action });
      throw error;
    }
  }

  /**
   * Get user's total points
   */
  async getUserPoints(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });
    return user?.totalPoints || 0;
  }

  /**
   * Get user's current level
   */
  getLevelForPoints(points: number): UserLevel {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (points >= LEVELS[i].minPoints) {
        return LEVELS[i];
      }
    }
    return LEVELS[0];
  }

  /**
   * Get user's gamification profile
   */
  async getUserGamificationProfile(userId: string): Promise<{
    points: number;
    level: UserLevel;
    achievements: UserAchievement[];
    rank: number;
    streak: { current: number; longest: number };
    nextLevelProgress: number;
  }> {
    try {
      const cacheKey = `${this.cachePrefix}profile:${userId}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      const [user, achievements, rank, streak] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { totalPoints: true },
        }),
        this.getUserAchievements(userId),
        this.getUserRank(userId),
        this.getUserStreak(userId),
      ]);

      const points = user?.totalPoints || 0;
      const level = this.getLevelForPoints(points);
      const nextLevel = LEVELS.find(l => l.level === level.level + 1);
      const nextLevelProgress = nextLevel 
        ? ((points - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100
        : 100;

      const profile = {
        points,
        level,
        achievements,
        rank,
        streak,
        nextLevelProgress: Math.min(nextLevelProgress, 100),
      };

      await redisCache.set(cacheKey, JSON.stringify(profile), this.cacheTTL);
      return profile;
    } catch (error: any) {
      logger.error('Failed to get gamification profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { earnedAt: 'desc' },
      });

      return userAchievements as unknown as UserAchievement[];
    } catch (error: any) {
      logger.error('Failed to get user achievements', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Check and award any newly earned achievements
   */
  async checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
    try {
      const newAchievements: Achievement[] = [];
      const existingIds = await this.getUserAchievementIds(userId);
      const stats = await this.getUserStats(userId);

      for (const achievement of ACHIEVEMENTS) {
        // Skip if already earned
        if (existingIds.includes(achievement.code)) continue;

        // Check condition
        const isEarned = this.checkAchievementCondition(achievement.condition, stats);
        
        if (isEarned) {
          // Award achievement
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementCode: achievement.code,
              progress: 100,
              isComplete: true,
            },
          });

          newAchievements.push(achievement as Achievement);
          logger.info('Achievement earned', { userId, achievement: achievement.code });
        }
      }

      return newAchievements;
    } catch (error: any) {
      logger.error('Failed to check achievements', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Get user's achievement IDs
   */
  private async getUserAchievementIds(userId: string): Promise<string[]> {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementCode: true },
    });
    return achievements.map(a => a.achievementCode);
  }

  /**
   * Get user statistics for achievement checking
   */
  private async getUserStats(userId: string): Promise<Record<string, number>> {
    const [
      applicationCount,
      interviewCount,
      connectionCount,
      postCount,
      menteeSessionCount,
      mentorSessionCount,
      culturalEventCount,
      volunteerHours,
    ] = await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: 'INTERVIEW' } }),
      prisma.connection.count({ where: { userId, status: 'ACCEPTED' } }),
      prisma.post.count({ where: { authorId: userId } }),
      prisma.mentorSession.count({ where: { menteeId: userId, status: 'COMPLETED' } }),
      prisma.mentorSession.count({ where: { mentorId: userId, status: 'COMPLETED' } }),
      prisma.eventRsvp.count({ where: { userId, status: 'GOING' } }),
      prisma.initiativeVolunteer.aggregate({
        where: { userId },
        _sum: { hoursContributed: true },
      }),
    ]);

    return {
      APPLICATION_COUNT: applicationCount,
      INTERVIEW_COUNT: interviewCount,
      CONNECTION_COUNT: connectionCount,
      POST_COUNT: postCount,
      MENTEE_SESSION_COUNT: menteeSessionCount,
      MENTOR_SESSION_COUNT: mentorSessionCount,
      CULTURAL_EVENT_COUNT: culturalEventCount,
      VOLUNTEER_HOURS: volunteerHours._sum.hoursContributed || 0,
    };
  }

  /**
   * Check if achievement condition is met
   */
  private checkAchievementCondition(condition: AchievementCondition, stats: Record<string, number>): boolean {
    const statValue = stats[condition.type] || 0;
    return statValue >= condition.value;
  }

  /**
   * Get user's rank on leaderboard
   */
  async getUserRank(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true },
      });

      if (!user) return 0;

      const rank = await prisma.user.count({
        where: {
          totalPoints: { gt: user.totalPoints || 0 },
        },
      });

      return rank + 1;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(options: { limit?: number; offset?: number; timeframe?: 'all' | 'month' | 'week' } = {}): Promise<LeaderboardEntry[]> {
    const { limit = 20, offset = 0 } = options;

    try {
      const users = await prisma.user.findMany({
        where: { totalPoints: { gt: 0 } },
        orderBy: { totalPoints: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          totalPoints: true,
          _count: {
            select: { userAchievements: true },
          },
        },
      });

      return users.map((user, index) => ({
        rank: offset + index + 1,
        userId: user.id,
        userName: user.name || 'Anonymous',
        userAvatar: user.avatarUrl || undefined,
        points: user.totalPoints || 0,
        level: this.getLevelForPoints(user.totalPoints || 0).level,
        achievementCount: user._count.userAchievements,
      }));
    } catch (error: any) {
      logger.error('Failed to get leaderboard', { error: error.message });
      return [];
    }
  }

  /**
   * Get user's login streak
   */
  async getUserStreak(userId: string): Promise<{ current: number; longest: number }> {
    try {
      const streak = await prisma.userStreak.findUnique({
        where: { userId },
      });

      return {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0,
      };
    } catch (error) {
      return { current: 0, longest: 0 };
    }
  }

  /**
   * Update login streak
   */
  async updateLoginStreak(userId: string): Promise<{ current: number; streakIncreased: boolean; milestoneReached?: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let streak = await prisma.userStreak.findUnique({
        where: { userId },
      });

      if (!streak) {
        streak = await prisma.userStreak.create({
          data: {
            userId,
            currentStreak: 1,
            longestStreak: 1,
            lastLoginDate: new Date(),
          },
        });
        return { current: 1, streakIncreased: true };
      }

      const lastLogin = streak.lastLoginDate?.toISOString().split('T')[0];
      
      if (lastLogin === today) {
        // Already logged in today
        return { current: streak.currentStreak, streakIncreased: false };
      }

      let newStreak = 1;
      let streakIncreased = true;

      if (lastLogin === yesterday) {
        // Consecutive day
        newStreak = streak.currentStreak + 1;
      } else {
        // Streak broken
        streakIncreased = false;
      }

      const longestStreak = Math.max(streak.longestStreak, newStreak);

      await prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak,
          lastLoginDate: new Date(),
        },
      });

      // Check for streak milestones
      let milestoneReached: number | undefined;
      if ([7, 30, 60, 90, 180, 365].includes(newStreak)) {
        milestoneReached = newStreak;
      }

      // Award streak points
      if (newStreak === 7) {
        await this.awardPoints(userId, 'WEEKLY_STREAK');
      } else if (newStreak === 30) {
        await this.awardPoints(userId, 'MONTHLY_STREAK');
      }

      return { current: newStreak, streakIncreased, milestoneReached };
    } catch (error: any) {
      logger.error('Failed to update login streak', { error: error.message, userId });
      return { current: 0, streakIncreased: false };
    }
  }

  /**
   * Get all available achievements
   */
  getAllAchievements(): Omit<Achievement, 'id' | 'createdAt'>[] {
    return ACHIEVEMENTS.filter(a => !a.isSecret);
  }

  /**
   * Get all levels
   */
  getAllLevels(): UserLevel[] {
    return LEVELS;
  }

  /**
   * Get daily action count
   */
  private async getDailyActionCount(userId: string, action: PointsAction, date: string): Promise<number> {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return prisma.pointsActivity.count({
      where: {
        userId,
        action,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });
  }

  /**
   * Get last action time
   */
  private async getLastActionTime(userId: string, action: PointsAction): Promise<Date | null> {
    const lastAction = await prisma.pointsActivity.findFirst({
      where: { userId, action },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return lastAction?.createdAt || null;
  }

  /**
   * Invalidate user cache
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    await redisCache.delete(`${this.cachePrefix}profile:${userId}`);
  }
}

// Export singleton instance
export const gamificationService = GamificationService.getInstance();

// Export class for testing
export { GamificationService, ACHIEVEMENTS, POINTS_CONFIG, LEVELS };
