/**
 * User Analytics Routes
 * 
 * Provides personal analytics and activity tracking for users
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, authorize } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Validation schemas
const timeframeSchema = z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d');

/**
 * GET /v1/user-analytics/overview
 * Get user's personal analytics overview
 */
router.get('/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.userType;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timeframe = timeframeSchema.parse(req.query.timeframe);
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get user-specific metrics based on user type
    let metrics: any = {};

    if (userType === 'MEMBER') {
      // Job seeker metrics
      const [
        totalApplications,
        applicationsInTimeframe,
        savedJobs,
        savedJobsInTimeframe,
        profileCompletion,
        recentActivity
      ] = await Promise.all([
        // Total applications
        prisma.jobApplication.count({
          where: { userId }
        }),
        // Applications in timeframe
        prisma.jobApplication.count({
          where: {
            userId,
            createdAt: { gte: startDate }
          }
        }),
        // Total saved jobs
        prisma.savedJob.count({
          where: { userId }
        }),
        // Saved jobs in timeframe
        prisma.savedJob.count({
          where: {
            userId,
            savedAt: { gte: startDate }
          }
        }),
        // Profile completion percentage
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            bio: true,
            location: true,
            phone: true
          }
        }),
        // Recent activity count
        prisma.userActivityLog.count({
          where: {
            userId,
            createdAt: { gte: startDate }
          }
        })
      ]);

      // Calculate profile completion
      const profileFields = ['firstName', 'lastName', 'email', 'avatarUrl', 'bio', 'location', 'phone'];
      const completedFields = profileFields.filter(field => profile && profile[field]).length;
      const completionPercentage = Math.round((completedFields / profileFields.length) * 100);

      // Get application status breakdown
      const applicationStatusBreakdown = await prisma.jobApplication.groupBy({
        by: ['status'],
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      });

      metrics = {
        totalApplications,
        applicationsInTimeframe,
        savedJobs,
        savedJobsInTimeframe,
        profileCompletion: completionPercentage,
        recentActivity,
        applicationStatusBreakdown: applicationStatusBreakdown.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>)
      };

    } else if (userType === 'COMPANY') {
      // Employer metrics
      const [
        totalJobs,
        jobsInTimeframe,
        totalApplications,
        applicationsInTimeframe,
        activeJobs,
        recentActivity
      ] = await Promise.all([
        // Total jobs
        prisma.job.count({
          where: { userId }
        }),
        // Jobs in timeframe
        prisma.job.count({
          where: {
            userId,
            createdAt: { gte: startDate }
          }
        }),
        // Total applications to user's jobs
        prisma.jobApplication.count({
          where: {
            job: {
              userId
            }
          }
        }),
        // Applications in timeframe
        prisma.jobApplication.count({
          where: {
            job: {
              userId,
              createdAt: { gte: startDate }
            }
          }
        }),
        // Active jobs
        prisma.job.count({
          where: {
            userId,
            status: 'ACTIVE'
          }
        }),
        // Recent activity count
        prisma.userActivityLog.count({
          where: {
            userId,
            createdAt: { gte: startDate }
          }
        })
      ]);

      // Get application status breakdown for employer's jobs
      const applicationStatusBreakdown = await prisma.jobApplication.groupBy({
        by: ['status'],
        where: {
          job: {
            userId
          },
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      });

      metrics = {
        totalJobs,
        jobsInTimeframe,
        totalApplications,
        applicationsInTimeframe,
        activeJobs,
        recentActivity,
        applicationStatusBreakdown: applicationStatusBreakdown.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>)
      };

    } else if (userType === 'MENTOR') {
      // Mentor metrics
      const [
        mentorshipSessions,
        sessionsInTimeframe,
        mentorshipHours,
        hoursInTimeframe,
        recentActivity
      ] = await Promise.all([
        // Total sessions (placeholder - would need mentorship session model)
        0,
        // Sessions in timeframe
        0,
        // Total hours (placeholder)
        0,
        // Hours in timeframe (placeholder)
        0,
        // Recent activity count
        prisma.userActivityLog.count({
          where: {
            userId,
            createdAt: { gte: startDate }
          }
        })
      ]);

      metrics = {
        mentorshipSessions,
        sessionsInTimeframe,
        mentorshipHours,
        hoursInTimeframe,
        recentActivity
      };
    }

    // Get activity trends
    const activityTrends = await prisma.userActivityLog.groupBy({
      by: ['activityType'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      }
    });

    const formattedTrends = activityTrends.reduce((acc, item) => {
      acc[item.activityType] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        timeframe,
        startDate,
        endDate: now,
        metrics,
        activityTrends: formattedTrends
      }
    });

  } catch (error) {
    console.error('Error fetching user analytics overview:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user analytics'
    });
  }
});

/**
 * GET /v1/user-analytics/activity
 * Get user's recent activity
 */
router.get('/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const activities = await prisma.userActivityLog.findMany({
      where: { userId },
      include: {
        // Include related data if available
        // This would need to be expanded based on activity type
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const total = await prisma.userActivityLog.count({
      where: { userId }
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      activityType: activity.activityType,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
      duration: activity.duration,
      createdAt: activity.createdAt
    }));

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user activity'
    });
  }
});

/**
 * GET /v1/user-analytics/progress
 * Get user's progress metrics and milestones
 */
router.get('/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.userType;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let progress: any = {};

    if (userType === 'MEMBER') {
      // Job seeker progress
      const [
        applicationsCount,
        savedJobsCount,
        interviewsCount,
        offersCount,
        userStreak
      ] = await Promise.all([
        prisma.jobApplication.count({ where: { userId } }),
        prisma.savedJob.count({ where: { userId } }),
        prisma.jobApplication.count({ 
          where: { 
            userId,
            status: 'INTERVIEW'
          }
        }),
        prisma.jobApplication.count({ 
          where: { 
            userId,
            status: 'OFFERED'
          }
        }),
        prisma.userStreak.findUnique({
          where: { userId },
          select: {
            currentStreak: true,
            longestStreak: true,
            lastActiveDate: true
          }
        })
      ]);

      // Calculate progress milestones
      const milestones = [
        {
          id: 'first_application',
          title: 'First Application',
          description: 'Submit your first job application',
          completed: applicationsCount > 0,
          date: applicationsCount > 0 ? await getFirstApplicationDate(userId) : null
        },
        {
          id: 'five_applications',
          title: 'Active Job Seeker',
          description: 'Submit 5 job applications',
          completed: applicationsCount >= 5,
          progress: Math.min(applicationsCount / 5, 1) * 100
        },
        {
          id: 'first_interview',
          title: 'Interview Ready',
          description: 'Get your first interview',
          completed: interviewsCount > 0,
          date: interviewsCount > 0 ? await getFirstInterviewDate(userId) : null
        },
        {
          id: 'ten_applications',
          title: 'Dedicated Seeker',
          description: 'Submit 10 job applications',
          completed: applicationsCount >= 10,
          progress: Math.min(applicationsCount / 10, 1) * 100
        },
        {
          id: 'first_offer',
          title: 'Job Offer',
          description: 'Receive your first job offer',
          completed: offersCount > 0,
          date: offersCount > 0 ? await getFirstOfferDate(userId) : null
        }
      ];

      progress = {
        applicationsCount,
        savedJobsCount,
        interviewsCount,
        offersCount,
        streak: userStreak,
        milestones,
        completionRate: milestones.filter(m => m.completed).length / milestones.length * 100
      };

    } else if (userType === 'COMPANY') {
      // Employer progress
      const [
        jobsCount,
        applicationsCount,
        hiredCount,
        userStreak
      ] = await Promise.all([
        prisma.job.count({ where: { userId } }),
        prisma.jobApplication.count({
          where: {
            job: { userId }
          }
        }),
        prisma.jobApplication.count({
          where: {
            job: { userId },
            status: 'HIRED'
          }
        }),
        prisma.userStreak.findUnique({
          where: { userId },
          select: {
            currentStreak: true,
            longestStreak: true,
            lastActiveDate: true
          }
        })
      ]);

      const milestones = [
        {
          id: 'first_job',
          title: 'First Job Posted',
          description: 'Post your first job listing',
          completed: jobsCount > 0,
          date: jobsCount > 0 ? await getFirstJobDate(userId) : null
        },
        {
          id: 'five_jobs',
          title: 'Active Recruiter',
          description: 'Post 5 job listings',
          completed: jobsCount >= 5,
          progress: Math.min(jobsCount / 5, 1) * 100
        },
        {
          id: 'first_hire',
          title: 'First Hire',
          description: 'Make your first hire through Vantage',
          completed: hiredCount > 0,
          date: hiredCount > 0 ? await getFirstHireDate(userId) : null
        },
        {
          id: 'ten_applications',
          title: 'Popular Employer',
          description: 'Receive 10 job applications',
          completed: applicationsCount >= 10,
          progress: Math.min(applicationsCount / 10, 1) * 100
        }
      ];

      progress = {
        jobsCount,
        applicationsCount,
        hiredCount,
        hireRate: applicationsCount > 0 ? Math.round((hiredCount / applicationsCount) * 100) : 0,
        streak: userStreak,
        milestones,
        completionRate: milestones.filter(m => m.completed).length / milestones.length * 100
      };
    }

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user progress'
    });
  }
});

/**
 * POST /v1/user-analytics/activity
 * Log user activity
 */
router.post('/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { activityType, metadata, duration } = req.body;

    if (!activityType) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'activityType is required'
      });
    }

    const activity = await prisma.userActivityLog.create({
      data: {
        userId,
        activityType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        duration: duration ? parseInt(duration) : null
      }
    });

    // Log telemetry event
    console.log(`TELEMETRY: user_activity_logged`, {
      userId,
      activityType,
      activityId: activity.id,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: {
        id: activity.id,
        activityType: activity.activityType,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
        duration: activity.duration,
        createdAt: activity.createdAt
      }
    });

  } catch (error) {
    console.error('Error logging user activity:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to log user activity'
    });
  }
});

/**
 * GET /v1/user-analytics/engagement
 * Get user engagement metrics
 */
router.get('/engagement', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timeframe = timeframeSchema.parse(req.query.timeframe);
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    // Get engagement metrics
    const [
      totalActivities,
      uniqueActivityTypes,
      averageSessionDuration,
      loginCount,
      lastLogin
    ] = await Promise.all([
      // Total activities
      prisma.userActivityLog.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),
      // Unique activity types
      prisma.userActivityLog.groupBy({
        by: ['activityType'],
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }),
      // Average session duration
      prisma.userActivityLog.aggregate({
        where: {
          userId,
          activityType: 'SESSION_DURATION',
          createdAt: { gte: startDate }
        },
        _avg: {
          duration: true
        }
      }),
      // Login count
      prisma.userActivityLog.count({
        where: {
          userId,
          activityType: 'LOGIN',
          createdAt: { gte: startDate }
        }
      }),
      // Last login
      prisma.userActivityLog.findFirst({
        where: {
          userId,
          activityType: 'LOGIN'
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true
        }
      })
    ]);

    // Calculate engagement score
    const engagementScore = calculateEngagementScore({
      totalActivities,
      uniqueActivityTypes: uniqueActivityTypes.length,
      averageSessionDuration: averageSessionDuration._avg.duration || 0,
      loginCount,
      timeframe
    });

    res.json({
      success: true,
      data: {
        timeframe,
        engagementScore,
        metrics: {
          totalActivities,
          uniqueActivityTypes: uniqueActivityTypes.length,
          averageSessionDuration: averageSessionDuration._avg.duration || 0,
          loginCount,
          lastLogin: lastLogin?.createdAt,
          daysSinceLastLogin: lastLogin ? Math.floor((now.getTime() - lastLogin.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user engagement:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user engagement'
    });
  }
});

// Helper functions
async function getFirstApplicationDate(userId: string): Promise<Date | null> {
  const application = await prisma.jobApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  return application?.createdAt || null;
}

async function getFirstInterviewDate(userId: string): Promise<Date | null> {
  const application = await prisma.jobApplication.findFirst({
    where: { 
      userId,
      status: 'INTERVIEW'
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  return application?.createdAt || null;
}

async function getFirstOfferDate(userId: string): Promise<Date | null> {
  const application = await prisma.jobApplication.findFirst({
    where: { 
      userId,
      status: 'OFFERED'
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  return application?.createdAt || null;
}

async function getFirstJobDate(userId: string): Promise<Date | null> {
  const job = await prisma.job.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  return job?.createdAt || null;
}

async function getFirstHireDate(userId: string): Promise<Date | null> {
  const application = await prisma.jobApplication.findFirst({
    where: { 
      job: { userId },
      status: 'HIRED'
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  return application?.createdAt || null;
}

function calculateEngagementScore(metrics: {
  totalActivities: number;
  uniqueActivityTypes: number;
  averageSessionDuration: number;
  loginCount: number;
  timeframe: string;
}): number {
  let score = 0;
  
  // Activity frequency (40% weight)
  const daysInTimeframe = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    'all': 365
  }[metrics.timeframe] || 30;
  
  const activitiesPerDay = metrics.totalActivities / daysInTimeframe;
  score += Math.min(activitiesPerDay * 10, 40); // Max 40 points
  
  // Activity diversity (30% weight)
  score += Math.min(metrics.uniqueActivityTypes * 6, 30); // Max 30 points (5 types = 30 points)
  
  // Session duration (20% weight)
  score += Math.min(metrics.averageSessionDuration / 60 * 4, 20); // Max 20 points (5 min = 20 points)
  
  // Login frequency (10% weight)
  const loginsPerDay = metrics.loginCount / daysInTimeframe;
  score += Math.min(loginsPerDay * 5, 10); // Max 10 points (2 logins/day = 10 points)
  
  return Math.round(Math.min(score, 100));
}

export default router;
