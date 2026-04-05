// @ts-nocheck
'use strict';

/**
 * Automated Reminder System (Step 47)
 * 
 * Features:
 * - Session reminders (24h, 1h before)
 * - Application deadline reminders
 * - Course enrollment reminders
 * - Profile completion nudges
 * - Inactive user re-engagement
 */

const { prisma } = require('../db');
const { queueEmail } = require('./emailQueue');
const { sendUserSMS, SMS_TYPES } = require('./sms');
const { shouldSendNotification } = require('./notificationPreferences');
const { createNotification } = require('./notificationCenter');
const logger = require('./logger');

// Reminder configuration
const REMINDER_CONFIG = {
  sessionReminders: {
    times: [24 * 60, 60, 15], // minutes before: 24h, 1h, 15min
    channels: ['email', 'sms', 'push']
  },
  applicationDeadlines: {
    times: [72 * 60, 24 * 60], // 3 days, 1 day before
    channels: ['email', 'push']
  },
  courseReminders: {
    times: [48 * 60, 60], // 2 days, 1h before
    channels: ['email', 'push']
  },
  inactivityThreshold: 14, // days
  profileCompletionNudge: 7 // days after signup
};

/**
 * Process session reminders
 * Call this from a cron job every 15 minutes
 */
async function processSessionReminders() {
  const results = { sent: 0, failed: 0 };
  
  try {
    const now = new Date();
    
    for (const minutesBefore of REMINDER_CONFIG.sessionReminders.times) {
      const targetTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 7.5 * 60 * 1000); // 7.5 min window
      const windowEnd = new Date(targetTime.getTime() + 7.5 * 60 * 1000);
      
      // Find sessions in this window that haven't been reminded yet
      const sessions = await prisma.mentorSession.findMany({
        where: {
          scheduledAt: {
            gte: windowStart,
            lte: windowEnd
          },
          status: 'SCHEDULED',
          NOT: {
            remindersSent: { has: `${minutesBefore}min` }
          }
        },
        include: {
          mentee: {
            include: {
              profile: true
            }
          },
          mentor: {
            include: {
              profile: true
            }
          }
        }
      });
      
      for (const session of sessions) {
        try {
          await sendSessionReminder(session, minutesBefore);
          
          // Mark reminder as sent
          const sentReminders = session.remindersSent || [];
          sentReminders.push(`${minutesBefore}min`);
          
          await prisma.mentorSession.update({
            where: { id: session.id },
            data: { remindersSent: sentReminders }
          });
          
          results.sent++;
        } catch (err) {
          logger.error('Session reminder failed', { sessionId: session.id, error: err.message });
          results.failed++;
        }
      }
    }
    
    return results;
  } catch (err) {
    logger.error('Process session reminders failed', { error: err.message });
    return results;
  }
}

/**
 * Send session reminder to both mentor and mentee
 */
async function sendSessionReminder(session, minutesBefore) {
  const timeLabel = getTimeLabel(minutesBefore);
  const formattedDate = new Date(session.scheduledAt).toLocaleString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  // Remind mentee
  if (session.mentee) {
    const mentorName = session.mentor?.profile?.name || 'your mentor';
    
    if (await shouldSendNotification(session.mentee.id, 'SESSION_REMINDER', 'email')) {
      await queueEmail({
        to: session.mentee.email,
        subject: `Mentor session ${timeLabel}`,
        template: 'sessionReminder',
        templateData: {
          userName: session.mentee.profile?.name,
          mentorName,
          sessionDate: formattedDate,
          sessionLink: `${process.env.APP_URL}/mentorship/sessions/${session.id}`,
          timeLabel
        },
        userId: session.mentee.id,
        type: 'SESSION_REMINDER'
      });
    }
    
    if (minutesBefore <= 60 && await shouldSendNotification(session.mentee.id, 'SESSION_REMINDER', 'sms')) {
      await sendUserSMS(session.mentee.id, SMS_TYPES.SESSION_REMINDERS,
        `Ngurra Pathways: Your mentor session with ${mentorName} is ${timeLabel}. Be ready!`
      );
    }
    
    await createNotification({
      userId: session.mentee.id,
      type: 'SESSION_REMINDER',
      category: 'mentorship',
      title: `Session ${timeLabel}`,
      message: `Your mentor session with ${mentorName} is ${timeLabel}`,
      link: `/mentorship/sessions/${session.id}`
    });
  }
  
  // Remind mentor
  if (session.mentor) {
    const menteeName = session.mentee?.profile?.name || 'your mentee';
    
    if (await shouldSendNotification(session.mentor.id, 'SESSION_REMINDER', 'email')) {
      await queueEmail({
        to: session.mentor.email,
        subject: `Mentor session ${timeLabel}`,
        template: 'sessionReminder',
        templateData: {
          userName: session.mentor.profile?.name,
          menteeName,
          sessionDate: formattedDate,
          sessionLink: `${process.env.APP_URL}/mentorship/sessions/${session.id}`,
          timeLabel
        },
        userId: session.mentor.id,
        type: 'SESSION_REMINDER'
      });
    }
    
    await createNotification({
      userId: session.mentor.id,
      type: 'SESSION_REMINDER',
      category: 'mentorship',
      title: `Session ${timeLabel}`,
      message: `Your session with ${menteeName} is ${timeLabel}`,
      link: `/mentorship/sessions/${session.id}`
    });
  }
}

/**
 * Get human-readable time label
 */
function getTimeLabel(minutes) {
  if (minutes >= 24 * 60) {
    const days = Math.round(minutes / (24 * 60));
    return days === 1 ? 'tomorrow' : `in ${days} days`;
  } else if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return hours === 1 ? 'in 1 hour' : `in ${hours} hours`;
  } else {
    return `in ${minutes} minutes`;
  }
}

/**
 * Process application deadline reminders
 */
async function processDeadlineReminders() {
  const results = { sent: 0, failed: 0 };
  
  try {
    const now = new Date();
    
    for (const minutesBefore of REMINDER_CONFIG.applicationDeadlines.times) {
      const targetTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
      const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);
      
      // Find jobs with deadlines in this window
      const jobs = await prisma.job.findMany({
        where: {
          applicationDeadline: {
            gte: windowStart,
            lte: windowEnd
          },
          isActive: true
        }
      });
      
      for (const job of jobs) {
        // Find users who saved this job but haven't applied
        const savedJobs = await prisma.savedJob.findMany({
          where: {
            jobId: job.id,
            deadlineReminderSent: false
          },
          include: {
            user: { include: { profile: true } }
          }
        });
        
        for (const saved of savedJobs) {
          try {
            // Check if they already applied
            const applied = await prisma.application.findFirst({
              where: { jobId: job.id, applicantId: saved.userId }
            });
            
            if (!applied) {
              await sendDeadlineReminder(saved.user, job, minutesBefore);
              results.sent++;
            }
            
            await prisma.savedJob.update({
              where: { id: saved.id },
              data: { deadlineReminderSent: true }
            });
          } catch (err) {
            logger.error('Deadline reminder failed', { userId: saved.userId, jobId: job.id });
            results.failed++;
          }
        }
      }
    }
    
    return results;
  } catch (err) {
    logger.error('Process deadline reminders failed', { error: err.message });
    return results;
  }
}

/**
 * Send deadline reminder
 */
async function sendDeadlineReminder(user, job, minutesBefore) {
  const timeLabel = getTimeLabel(minutesBefore);
  
  if (await shouldSendNotification(user.id, 'JOB_ALERT', 'email')) {
    await queueEmail({
      to: user.email,
      subject: `Application deadline ${timeLabel} - ${job.title}`,
      template: 'deadlineReminder',
      templateData: {
        userName: user.profile?.name,
        jobTitle: job.title,
        companyName: job.companyName,
        deadline: new Date(job.applicationDeadline).toLocaleDateString('en-AU'),
        applyLink: `${process.env.APP_URL}/jobs/${job.id}/apply`,
        timeLabel
      },
      userId: user.id,
      type: 'JOB_ALERT'
    });
  }
  
  await createNotification({
    userId: user.id,
    type: 'APPLICATION_DEADLINE',
    category: 'jobs',
    title: `Deadline ${timeLabel}`,
    message: `Application for "${job.title}" closes ${timeLabel}`,
    link: `/jobs/${job.id}/apply`
  });
}

/**
 * Send profile completion nudges
 */
async function processProfileNudges() {
  const results = { sent: 0 };
  
  try {
    const nudgeThreshold = new Date(
      Date.now() - REMINDER_CONFIG.profileCompletionNudge * 24 * 60 * 60 * 1000
    );
    
    // Find users who signed up X days ago with incomplete profiles
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(nudgeThreshold.getTime() - 24 * 60 * 60 * 1000),
          lte: nudgeThreshold
        },
        profileNudgeSent: false,
        userType: 'MEMBER'
      },
      include: { profile: true }
    });
    
    for (const user of users) {
      // Calculate profile completion
      const completion = calculateProfileCompletion(user);
      
      if (completion < 80) {
        try {
          await sendProfileNudge(user, completion);
          
          await prisma.user.update({
            where: { id: user.id },
            data: { profileNudgeSent: true }
          });
          
          results.sent++;
        } catch (err) {
          logger.error('Profile nudge failed', { userId: user.id });
        }
      }
    }
    
    return results;
  } catch (err) {
    logger.error('Process profile nudges failed', { error: err.message });
    return results;
  }
}

/**
 * Calculate profile completion percentage
 */
function calculateProfileCompletion(user) {
  const profile = user.profile || {};
  const checks = [
    profile.name,
    profile.bio,
    profile.location,
    profile.avatar,
    profile.phone,
    profile.skills && JSON.parse(profile.skills || '[]').length > 0,
    profile.experience && JSON.parse(profile.experience || '[]').length > 0,
    profile.education && JSON.parse(profile.education || '[]').length > 0
  ];
  
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

/**
 * Send profile completion nudge
 */
async function sendProfileNudge(user, completion) {
  const missingItems = getMissingProfileItems(user);
  
  if (await shouldSendNotification(user.id, 'WEEKLY_DIGEST', 'email')) {
    await queueEmail({
      to: user.email,
      subject: 'Complete your profile to get noticed!',
      template: 'profileNudge',
      templateData: {
        userName: user.profile?.name || 'there',
        completion,
        missingItems,
        profileLink: `${process.env.APP_URL}/profile/edit`
      },
      userId: user.id,
      type: 'WEEKLY_DIGEST'
    });
  }
  
  await createNotification({
    userId: user.id,
    type: 'PROFILE_NUDGE',
    category: 'account',
    title: 'Complete your profile',
    message: `Your profile is ${completion}% complete. Add more details to get noticed by employers!`,
    link: '/profile/edit'
  });
}

/**
 * Get list of missing profile items
 */
function getMissingProfileItems(user) {
  const profile = user.profile || {};
  const missing = [];
  
  if (!profile.bio) missing.push('Add a bio to tell employers about yourself');
  if (!profile.avatar) missing.push('Upload a profile photo');
  if (!profile.skills || JSON.parse(profile.skills || '[]').length === 0) {
    missing.push('Add your skills');
  }
  if (!profile.experience || JSON.parse(profile.experience || '[]').length === 0) {
    missing.push('Add work experience');
  }
  if (!profile.education || JSON.parse(profile.education || '[]').length === 0) {
    missing.push('Add your education');
  }
  
  return missing.slice(0, 3); // Top 3 items
}

/**
 * Re-engage inactive users
 */
async function processInactiveUserReengagement() {
  const results = { sent: 0 };
  
  try {
    const inactiveThreshold = new Date(
      Date.now() - REMINDER_CONFIG.inactivityThreshold * 24 * 60 * 60 * 1000
    );
    
    const users = await prisma.user.findMany({
      where: {
        lastLoginAt: {
          lte: inactiveThreshold
        },
        lastReengagementEmail: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Not emailed in 30 days
        },
        userType: 'MEMBER',
        isActive: true
      },
      include: { profile: true },
      take: 100
    });
    
    for (const user of users) {
      try {
        // Get personalized content
        const { newJobs, newMentors } = await getReengagementContent(user);
        
        if (await shouldSendNotification(user.id, 'WEEKLY_DIGEST', 'email')) {
          await queueEmail({
            to: user.email,
            subject: 'We miss you! Check out new opportunities',
            template: 'reengagement',
            templateData: {
              userName: user.profile?.name,
              newJobsCount: newJobs,
              newMentorsCount: newMentors,
              loginLink: `${process.env.APP_URL}/login`
            },
            userId: user.id,
            type: 'WEEKLY_DIGEST'
          });
        }
        
        await prisma.user.update({
          where: { id: user.id },
          data: { lastReengagementEmail: new Date() }
        });
        
        results.sent++;
      } catch (err) {
        logger.error('Reengagement email failed', { userId: user.id });
      }
    }
    
    return results;
  } catch (err) {
    logger.error('Process reengagement failed', { error: err.message });
    return results;
  }
}

/**
 * Get content for reengagement email
 */
async function getReengagementContent(user) {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const [newJobs, newMentors] = await Promise.all([
    prisma.job.count({
      where: {
        createdAt: { gte: twoWeeksAgo },
        isActive: true
      }
    }),
    prisma.user.count({
      where: {
        userType: 'MENTOR',
        createdAt: { gte: twoWeeksAgo },
        isActive: true
      }
    })
  ]);
  
  return { newJobs, newMentors };
}

/**
 * Process course enrollment reminders
 */
async function processCourseReminders() {
  const results = { sent: 0, failed: 0 };
  
  try {
    const now = new Date();
    
    // Find upcoming course sessions
    const upcomingSessions = await prisma.courseSession.findMany({
      where: {
        startsAt: {
          gte: now,
          lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) // Next 48 hours
        }
      },
      include: {
        course: true,
        enrollments: {
          include: {
            user: { include: { profile: true } }
          },
          where: { reminderSent: false }
        }
      }
    });
    
    for (const session of upcomingSessions) {
      for (const enrollment of session.enrollments) {
        try {
          const hoursUntil = Math.round((new Date(session.startsAt).getTime() - now.getTime()) / (60 * 60 * 1000));
          
          await createNotification({
            userId: enrollment.user.id,
            type: 'COURSE_REMINDER',
            category: 'learning',
            title: `Course starting ${hoursUntil <= 2 ? 'soon' : `in ${hoursUntil} hours`}`,
            message: `${session.course.name} is starting ${getTimeLabel(hoursUntil * 60)}`,
            link: `/courses/${session.course.id}`
          });
          
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { reminderSent: true }
          });
          
          results.sent++;
        } catch (err) {
          results.failed++;
        }
      }
    }
    
    return results;
  } catch (err) {
    logger.error('Process course reminders failed', { error: err.message });
    return results;
  }
}

/**
 * Run all reminder jobs
 * Call this from a cron job every 15 minutes
 */
async function runAllReminderJobs() {
  const results = {
    sessions: await processSessionReminders(),
    deadlines: await processDeadlineReminders(),
    courses: await processCourseReminders()
  };
  
  logger.info('Reminder jobs completed', results);
  return results;
}

/**
 * Run daily reminder jobs
 * Call this from a cron job once per day
 */
async function runDailyReminderJobs() {
  const results = {
    profileNudges: await processProfileNudges(),
    reengagement: await processInactiveUserReengagement()
  };
  
  logger.info('Daily reminder jobs completed', results);
  return results;
}
