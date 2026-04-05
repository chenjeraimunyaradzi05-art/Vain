// @ts-nocheck
/**
 * Burnout Detection System
 * 
 * Monitors user activity patterns to detect signs of:
 * - Excessive job searching (applying to many jobs in short time)
 * - Late night usage patterns
 * - Prolonged sessions without breaks
 * - Declining engagement over time
 * 
 * Provides gentle wellness check-ins and resources when needed.
 */

import { prisma } from '../db';

// Activity thresholds for detection
const THRESHOLDS = {
  // High activity
  APPLICATIONS_PER_HOUR: 10,      // More than this suggests stress
  APPLICATIONS_PER_DAY: 25,       // Daily limit before alert
  SESSION_DURATION_MINUTES: 180,  // 3+ hours without break
  
  // Time patterns
  NIGHT_START_HOUR: 23,           // 11 PM
  NIGHT_END_HOUR: 5,              // 5 AM
  NIGHT_SESSIONS_THRESHOLD: 3,    // Sessions in night hours per week
  
  // Engagement decline
  ACTIVITY_DROP_PERCENT: 50,      // 50% drop in activity week-over-week
  
  // Rejection pattern
  REJECTIONS_BEFORE_CHECK: 10,    // After 10 rejections, offer support
};

/**
 * Log user activity
 * 
 * @param {string} userId - User ID
 * @param {string} activityType - Type of activity (LOGIN, JOB_VIEW, APPLICATION, etc.)
 * @param {object} metadata - Additional context
 * @param {number} duration - Duration in seconds (for sessions)
 */
async function logActivity(userId, activityType, metadata = {}, duration = null) {
  try {
    await prisma.userActivityLog.create({
      data: {
        userId,
        activityType,
        metadata: JSON.stringify(metadata),
        duration
      }
    });
  } catch (error) {
    console.error('[BurnoutDetection] Log activity error:', error.message);
  }
}

/**
 * Analyze user activity and detect burnout indicators
 * 
 * @param {string} userId - User ID
 * @returns {object} Analysis results with any alerts
 */
async function analyzeUserActivity(userId) {
  const alerts = [];
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  try {
    // 1. Check applications per hour
    const hourlyApplications = await prisma.userActivityLog.count({
      where: {
        userId,
        activityType: 'APPLICATION',
        createdAt: { gte: oneHourAgo }
      }
    });

    if (hourlyApplications >= THRESHOLDS.APPLICATIONS_PER_HOUR) {
      alerts.push({
        type: 'RAPID_APPLICATIONS',
        severity: 'HIGH',
        message: "You've been very active with applications. Remember to take breaks and be selective with your applications for better results.",
        indicators: { applicationsLastHour: hourlyApplications }
      });
    }

    // 2. Check daily applications
    const dailyApplications = await prisma.userActivityLog.count({
      where: {
        userId,
        activityType: 'APPLICATION',
        createdAt: { gte: oneDayAgo }
      }
    });

    if (dailyApplications >= THRESHOLDS.APPLICATIONS_PER_DAY) {
      alerts.push({
        type: 'HIGH_DAILY_ACTIVITY',
        severity: 'MEDIUM',
        message: "Quality over quantity! Focus on roles that truly match your skills. Taking time on each application leads to better outcomes.",
        indicators: { applicationsToday: dailyApplications }
      });
    }

    // 3. Check night usage
    const today = new Date().toISOString().split('T')[0];
    const nightSessions = await prisma.userActivityLog.count({
      where: {
        userId,
        activityType: 'LOGIN',
        createdAt: { gte: oneWeekAgo },
        OR: [
          { createdAt: { gte: new Date(`${today}T${THRESHOLDS.NIGHT_START_HOUR}:00:00`) } },
          { createdAt: { lt: new Date(`${today}T0${THRESHOLDS.NIGHT_END_HOUR}:00:00`) } }
        ]
      }
    });

    if (nightSessions >= THRESHOLDS.NIGHT_SESSIONS_THRESHOLD) {
      alerts.push({
        type: 'NIGHT_USAGE',
        severity: 'MEDIUM',
        message: "We've noticed some late-night sessions. Good sleep is important for your job search success. Consider setting a daily wind-down time.",
        indicators: { nightSessionsThisWeek: nightSessions }
      });
    }

    // 4. Check for long sessions
    const longSessions = await prisma.userActivityLog.findMany({
      where: {
        userId,
        activityType: 'SESSION_END',
        duration: { gte: THRESHOLDS.SESSION_DURATION_MINUTES * 60 },
        createdAt: { gte: oneWeekAgo }
      }
    });

    if (longSessions.length >= 2) {
      alerts.push({
        type: 'LONG_SESSIONS',
        severity: 'LOW',
        message: "Taking regular breaks helps maintain focus. Try the 52-17 rule: work for 52 minutes, break for 17.",
        indicators: { longSessionsThisWeek: longSessions.length }
      });
    }

    // 5. Check activity decline (potential discouragement)
    const thisWeekActivity = await prisma.userActivityLog.count({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo }
      }
    });

    const lastWeekActivity = await prisma.userActivityLog.count({
      where: {
        userId,
        createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo }
      }
    });

    if (lastWeekActivity > 0) {
      const dropPercent = ((lastWeekActivity - thisWeekActivity) / lastWeekActivity) * 100;
      if (dropPercent >= THRESHOLDS.ACTIVITY_DROP_PERCENT) {
        alerts.push({
          type: 'ACTIVITY_DECLINE',
          severity: 'MEDIUM',
          message: "Job searching can be challenging. Remember, every application is a step forward. Would you like to speak with a mentor?",
          indicators: { lastWeekActivity, thisWeekActivity, dropPercent: dropPercent.toFixed(1) }
        });
      }
    }

    // 6. Check rejection pattern
    const rejections = await prisma.userActivityLog.count({
      where: {
        userId,
        activityType: 'REJECTION_RECEIVED',
        createdAt: { gte: oneWeekAgo }
      }
    });

    if (rejections >= THRESHOLDS.REJECTIONS_BEFORE_CHECK) {
      alerts.push({
        type: 'MULTIPLE_REJECTIONS',
        severity: 'MEDIUM',
        message: "Rejections are a normal part of job searching. Would you like to review your resume with our AI coach or connect with a mentor?",
        indicators: { rejectionsThisWeek: rejections }
      });
    }

    return {
      userId,
      analyzedAt: now,
      metrics: {
        hourlyApplications,
        dailyApplications,
        thisWeekActivity,
        lastWeekActivity,
        nightSessions,
        longSessions: longSessions.length,
        rejections
      },
      alerts
    };
  } catch (error) {
    console.error('[BurnoutDetection] Analysis error:', error);
    return { userId, analyzedAt: now, metrics: {}, alerts: [], error: error.message };
  }
}

/**
 * Create burnout alerts in the database
 */
async function createAlerts(userId, alerts) {
  if (alerts.length === 0) return [];

  const createdAlerts = [];
  
  for (const alert of alerts) {
    try {
      // Check if similar alert exists in last 24 hours
      const existing = await prisma.burnoutAlert.findFirst({
        where: {
          userId,
          alertType: alert.type,
          dismissed: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!existing) {
        const created = await prisma.burnoutAlert.create({
          data: {
            userId,
            alertType: alert.type,
            severity: alert.severity,
            message: alert.message,
            indicators: JSON.stringify(alert.indicators)
          }
        });
        createdAlerts.push(created);
      }
    } catch (error) {
      console.error('[BurnoutDetection] Create alert error:', error.message);
    }
  }

  return createdAlerts;
}

/**
 * Get active (non-dismissed) alerts for a user
 */
async function getActiveAlerts(userId) {
  try {
    const alerts = await prisma.burnoutAlert.findMany({
      where: {
        userId,
        dismissed: false
      },
      orderBy: { createdAt: 'desc' }
    });

    return alerts.map(a => ({
      ...a,
      indicators: JSON.parse(a.indicators || '{}')
    }));
  } catch (error) {
    console.error('[BurnoutDetection] Get alerts error:', error);
    return [];
  }
}

/**
 * Dismiss an alert
 */
async function dismissAlert(alertId, userId) {
  try {
    return await prisma.burnoutAlert.updateMany({
      where: {
        id: alertId,
        userId
      },
      data: {
        dismissed: true,
        dismissedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[BurnoutDetection] Dismiss alert error:', error);
    return null;
  }
}

/**
 * Record a wellness check-in
 */
async function recordWellnessCheckIn(userId, data) {
  const { mood, stressLevel, hopefulness, notes } = data;

  try {
    const checkIn = await prisma.wellnessCheckIn.create({
      data: {
        userId,
        mood: parseInt(mood),
        stressLevel: parseInt(stressLevel),
        hopefulness: parseInt(hopefulness),
        notes
      }
    });

    // If scores are low, suggest resources
    const avgScore = (mood + (6 - stressLevel) + hopefulness) / 3; // Invert stress
    
    let recommendation = null;
    if (avgScore <= 2) {
      recommendation = {
        type: 'SUPPORT_NEEDED',
        message: "It sounds like things might be tough right now. Consider connecting with a mentor or our support resources.",
        resources: [
          { name: 'Mentor Sessions', url: '/mentorship' },
          { name: 'Beyond Blue', url: 'https://www.beyondblue.org.au', external: true },
          { name: 'Yarning SafeTALK', url: 'https://www.lifeline.org.au', external: true }
        ]
      };
    } else if (avgScore <= 3) {
      recommendation = {
        type: 'GENTLE_SUPPORT',
        message: "Job searching can be stressful. Take care of yourself and remember to celebrate small wins.",
        resources: [
          { name: 'Resume Review', url: '/member/resume' },
          { name: 'Career Guidance', url: '/mentorship' }
        ]
      };
    }

    return { checkIn, recommendation };
  } catch (error) {
    console.error('[BurnoutDetection] Wellness check-in error:', error);
    throw error;
  }
}

/**
 * Get wellness check-in history
 */
async function getWellnessHistory(userId, limit = 30) {
  try {
    return await prisma.wellnessCheckIn.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('[BurnoutDetection] Get wellness history error:', error);
    return [];
  }
}

/**
 * Get wellness resources based on current state
 */
function getWellnessResources(severity = 'LOW') {
  const resources = {
    general: [
      {
        name: 'Headspace',
        description: 'Free mental health support for young people',
        url: 'https://headspace.org.au',
        icon: '🧠'
      },
      {
        name: 'Beyond Blue',
        description: 'Anxiety and depression support',
        url: 'https://www.beyondblue.org.au',
        icon: '💙'
      }
    ],
    indigenous: [
      {
        name: 'Yarning SafeTALK',
        description: 'Culturally safe suicide alertness for First Nations communities',
        url: 'https://www.lifeline.org.au/about/indigenous-suicide-prevention/',
        icon: '🪃'
      },
      {
        name: 'Gayaa Dhuwi (Proud Spirit)',
        description: 'Aboriginal and Torres Strait Islander social and emotional wellbeing',
        url: 'https://www.gayaadhuwi.org.au',
        icon: '🌿'
      }
    ],
    career: [
      {
        name: 'Mentor Support',
        description: 'Connect with an experienced mentor on Ngurra',
        url: '/mentorship',
        internal: true,
        icon: '👥'
      },
      {
        name: 'Resume Review',
        description: 'Get AI-powered feedback on your resume',
        url: '/member/resume',
        internal: true,
        icon: '📄'
      }
    ]
  };

  return resources;
}

export {
  logActivity,
  analyzeUserActivity,
  createAlerts,
  getActiveAlerts,
  dismissAlert,
  recordWellnessCheckIn,
  getWellnessHistory,
  getWellnessResources,
  THRESHOLDS
};

