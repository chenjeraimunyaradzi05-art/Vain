import dotenv from 'dotenv';

// Firebase Admin SDK (optional - only if configured)
let admin: any = null;
let messaging: any = null;

// Initialize Firebase if credentials are available
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;

if (FIREBASE_PROJECT_ID && FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    
    messaging = admin.messaging();
    console.log('[Push] Firebase Cloud Messaging initialized');
  } catch (error: any) {
    console.warn('[Push] Firebase initialization failed:', error.message);
  }
}

/**
 * Notification types for the platform
 */
export const NOTIFICATION_TYPES = {
  // Job-related
  JOB_APPLICATION_RECEIVED: 'job_application_received',
  JOB_APPLICATION_STATUS: 'job_application_status',
  JOB_INTERVIEW_SCHEDULED: 'job_interview_scheduled',
  JOB_INTERVIEW_REMINDER: 'job_interview_reminder',
  NEW_JOB_MATCH: 'new_job_match',
  
  // Mentorship-related
  MENTOR_REQUEST: 'mentor_request',
  MENTOR_REQUEST_ACCEPTED: 'mentor_request_accepted',
  MENTOR_SESSION_SCHEDULED: 'mentor_session_scheduled',
  MENTOR_SESSION_REMINDER: 'mentor_session_reminder',
  MENTOR_SESSION_STARTED: 'mentor_session_started',
  MENTOR_MESSAGE: 'mentor_message',
  
  // Course-related
  COURSE_ENROLLED: 'course_enrolled',
  COURSE_REMINDER: 'course_reminder',
  COURSE_COMPLETED: 'course_completed',
  BADGE_EARNED: 'badge_earned',
  
  // Community
  FORUM_REPLY: 'forum_reply',
  FORUM_MENTION: 'forum_mention',
  STORY_FEATURED: 'story_featured',
  
  // System
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  PROFILE_INCOMPLETE: 'profile_incomplete',
};

/**
 * Topic subscriptions for broadcast notifications
 */
export const NOTIFICATION_TOPICS = {
  ALL_USERS: 'all_users',
  MEMBERS: 'members',
  MENTORS: 'mentors',
  EMPLOYERS: 'employers',
  TAFE: 'tafe',
  NEW_JOBS: 'new_jobs',
  ANNOUNCEMENTS: 'announcements',
};

/**
 * Check if push notifications are configured
 * @returns {boolean}
 */
export function isConfigured() {
  return messaging !== null;
}

/**
 * Send a push notification to a single device
 * @param {string} token - FCM device token
 * @param {object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {string} notification.imageUrl - Optional image URL
 * @param {object} data - Optional data payload
 * @returns {Promise<object>} - Send result
 */
export async function sendToDevice(token: string, notification: any, data: any = {}) {
  if (!messaging) {
    console.log('[Push] Mock notification (FCM not configured):', { token, notification, data });
    return { success: true, mock: true, messageId: `mock-${Date.now()}` };
  }
  
  try {
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
      },
      data: {
        ...data,
        click_action: data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
        type: data.type || 'general',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'ngurra_default',
          icon: 'ic_notification',
          color: '#3b82f6',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: data.badge || 1,
            sound: 'default',
          },
        },
      },
    };
    
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('[Push] Send failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a push notification to multiple devices
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {object} notification - Notification payload
 * @param {object} data - Optional data payload
 * @returns {Promise<object>} - Send results
 */
export async function sendToDevices(tokens: string[], notification: any, data: any = {}) {
  if (!messaging) {
    console.log('[Push] Mock batch notification:', { count: tokens.length, notification });
    return { 
      successCount: tokens.length, 
      failureCount: 0, 
      mock: true,
      responses: tokens.map(t => ({ success: true, token: t })),
    };
  }
  
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }
  
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
      },
      data: {
        ...data,
        click_action: data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
        type: data.type || 'general',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'ngurra_default',
          icon: 'ic_notification',
          color: '#3b82f6',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    };
    
    const response = await messaging.sendEachForMulticast({
      tokens,
      ...message,
    });
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses.map((r, i) => ({
        success: r.success,
        token: tokens[i],
        error: r.error?.message,
      })),
    };
  } catch (error) {
    console.error('[Push] Batch send failed:', error);
    return { successCount: 0, failureCount: tokens.length, error: error.message };
  }
}

/**
 * Send a notification to a topic
 * @param {string} topic - Topic name
 * @param {object} notification - Notification payload
 * @param {object} data - Optional data payload
 * @returns {Promise<object>} - Send result
 */
export async function sendToTopic(topic: string, notification: any, data: any = {}) {
  if (!messaging) {
    console.log('[Push] Mock topic notification:', { topic, notification });
    return { success: true, mock: true };
  }
  
  try {
    const message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        type: data.type || 'general',
      },
    };
    
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('[Push] Topic send failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe a device to a topic
 * @param {string} token - FCM device token
 * @param {string} topic - Topic to subscribe to
 * @returns {Promise<object>}
 */
export async function subscribeToTopic(token: string, topic: string) {
  if (!messaging) {
    console.log('[Push] Mock subscribe:', { token, topic });
    return { success: true, mock: true };
  }
  
  try {
    await messaging.subscribeToTopic([token], topic);
    return { success: true };
  } catch (error: any) {
    console.error('[Push] Subscribe failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe a device from a topic
 * @param {string} token - FCM device token
 * @param {string} topic - Topic to unsubscribe from
 * @returns {Promise<object>}
 */
export async function unsubscribeFromTopic(token: string, topic: string) {
  if (!messaging) {
    console.log('[Push] Mock unsubscribe:', { token, topic });
    return { success: true, mock: true };
  }
  
  try {
    await messaging.unsubscribeFromTopic([token], topic);
    return { success: true };
  } catch (error: any) {
    console.error('[Push] Unsubscribe failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a notification message for common events
 * @param {string} type - Notification type
 * @param {object} params - Event-specific parameters
 * @returns {object} - Formatted notification
 */
export function createNotification(type: string, params: any = {}) {
  switch (type) {
    case NOTIFICATION_TYPES.JOB_APPLICATION_RECEIVED:
      return {
        title: 'New Application Received',
        body: `${params.applicantName || 'A candidate'} applied for ${params.jobTitle || 'your job posting'}`,
        data: { type, jobId: params.jobId, applicationId: params.applicationId },
      };
      
    case NOTIFICATION_TYPES.JOB_APPLICATION_STATUS:
      return {
        title: 'Application Update',
        body: `Your application for ${params.jobTitle} is now ${params.status}`,
        data: { type, jobId: params.jobId, status: params.status },
      };
      
    case NOTIFICATION_TYPES.JOB_INTERVIEW_SCHEDULED:
      return {
        title: 'Interview Scheduled',
        body: `Your interview for ${params.jobTitle} is scheduled for ${params.date}`,
        data: { type, jobId: params.jobId, interviewId: params.interviewId },
      };
      
    case NOTIFICATION_TYPES.JOB_INTERVIEW_REMINDER:
      return {
        title: 'Interview Reminder',
        body: `Your interview for ${params.jobTitle} starts in ${params.timeUntil || '1 hour'}`,
        data: { type, jobId: params.jobId, interviewId: params.interviewId },
      };
      
    case NOTIFICATION_TYPES.MENTOR_REQUEST:
      return {
        title: 'New Mentorship Request',
        body: `${params.menteeName || 'Someone'} wants to connect with you as a mentor`,
        data: { type, requestId: params.requestId },
      };
      
    case NOTIFICATION_TYPES.MENTOR_REQUEST_ACCEPTED:
      return {
        title: 'Mentorship Request Accepted',
        body: `${params.mentorName || 'A mentor'} has accepted your request!`,
        data: { type, mentorId: params.mentorId },
      };
      
    case NOTIFICATION_TYPES.MENTOR_SESSION_SCHEDULED:
      return {
        title: 'Session Scheduled',
        body: `Mentorship session with ${params.otherName} on ${params.date}`,
        data: { type, sessionId: params.sessionId },
      };
      
    case NOTIFICATION_TYPES.MENTOR_SESSION_REMINDER:
      return {
        title: 'Session Starting Soon',
        body: `Your mentorship session starts in ${params.timeUntil || '15 minutes'}`,
        data: { type, sessionId: params.sessionId },
      };
      
    case NOTIFICATION_TYPES.MENTOR_SESSION_STARTED:
      return {
        title: 'Session Started',
        body: `${params.otherName} has started the video call`,
        data: { type, sessionId: params.sessionId, videoUrl: params.videoUrl },
      };
      
    case NOTIFICATION_TYPES.COURSE_ENROLLED:
      return {
        title: 'Course Enrollment Confirmed',
        body: `You're enrolled in ${params.courseTitle}`,
        data: { type, courseId: params.courseId },
      };
      
    case NOTIFICATION_TYPES.BADGE_EARNED:
      return {
        title: 'Badge Earned! 🎉',
        body: `You've earned the "${params.badgeName}" badge`,
        data: { type, badgeId: params.badgeId },
      };
      
    case NOTIFICATION_TYPES.FORUM_REPLY:
      return {
        title: 'New Reply',
        body: `${params.authorName} replied to your post`,
        data: { type, threadId: params.threadId },
      };
      
    default:
      return {
        title: params.title || 'Notification',
        body: params.body || 'You have a new notification',
        data: { type: type || 'general', ...params.data },
      };
  }
}

export {};
