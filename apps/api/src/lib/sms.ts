// @ts-nocheck
"use strict";

/**
 * SMS Notification Integration
 * 
 * Supports Twilio for sending SMS alerts to users who opt-in.
 * Used for job alerts, interview reminders, and mentor session notifications.
 */

// Track sent messages for testing
const capturedMessages = [];

/**
 * Send an SMS message via Twilio
 * @param {string} to - Phone number (E.164 format: +61412345678)
 * @param {string} message - SMS body (max 160 chars for single segment)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendSMS(to, message) {
  const captureMode = String(process.env.SMS_TEST_CAPTURE || '').toLowerCase() === '1';
  
  // In test mode, capture messages instead of sending
  if (captureMode || !process.env.TWILIO_ACCOUNT_SID) {
    capturedMessages.push({
      to,
      message,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SMS Capture] To: ${to}, Message: ${message.substring(0, 50)}...`);
    return { success: true, messageId: 'capture-' + Date.now() };
  }

  try {
    // Dynamic import to make Twilio optional
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log(`[SMS] Sent to ${to}: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('[SMS] Send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send job alert SMS
 * @param {string} phone - User's phone number
 * @param {object} job - Job object with title and company
 */
async function sendJobAlertSMS(phone, job) {
  const message = `Ngurra Pathways: New job matching your profile! "${job.title}" at ${job.companyName}. Apply now at ngurrapathways.com.au/jobs/${job.id}`;
  return sendSMS(phone, message);
}

/**
 * Send interview reminder SMS
 * @param {string} phone - User's phone number
 * @param {object} interview - Interview details
 */
async function sendInterviewReminderSMS(phone, interview) {
  const dateStr = new Date(interview.scheduledAt).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const message = `Ngurra Pathways: Interview reminder! Your interview with ${interview.companyName} for "${interview.jobTitle}" is scheduled for ${dateStr}.`;
  return sendSMS(phone, message);
}

/**
 * Send mentor session reminder SMS
 * @param {string} phone - User's phone number
 * @param {object} session - Session details
 */
async function sendSessionReminderSMS(phone, session) {
  const dateStr = new Date(session.scheduledAt).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const message = `Ngurra Pathways: Mentor session reminder! You have a session with ${session.mentorName} at ${dateStr}.`;
  return sendSMS(phone, message);
}

/**
 * Send verification code via SMS
 * @param {string} phone - Phone number to verify
 * @param {string} code - Verification code
 */
async function sendVerificationSMS(phone, code) {
  const message = `Ngurra Pathways: Your verification code is ${code}. This code expires in 10 minutes.`;
  return sendSMS(phone, message);
}

/**
 * Validate phone number format (Australian E.164)
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function isValidAustralianPhone(phone) {
  // Australian mobile: +614XXXXXXXX or 04XXXXXXXX
  const e164Pattern = /^\+614\d{8}$/;
  const localPattern = /^04\d{8}$/;
  return e164Pattern.test(phone) || localPattern.test(phone);
}

/**
 * Normalize phone number to E.164 format
 * @param {string} phone - Phone number to normalize
 * @returns {string|null} Normalized phone or null if invalid
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove spaces, dashes, brackets
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Handle Australian formats
  if (cleaned.startsWith('04') && cleaned.length === 10) {
    return '+61' + cleaned.substring(1);
  }
  if (cleaned.startsWith('+61') && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.startsWith('61') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  
  // Already in valid E.164 format
  if (cleaned.startsWith('+') && cleaned.length >= 10) {
    return cleaned;
  }
  
  return null;
}

// ============================================
// Step 42: SMS Opt-In/Opt-Out Management
// ============================================

const { prisma } = require('../db');

// SMS notification types
const SMS_TYPES = {
  JOB_ALERTS: 'job_alerts',
  INTERVIEW_REMINDERS: 'interview_reminders',
  SESSION_REMINDERS: 'session_reminders',
  VERIFICATION: 'verification',
  MARKETING: 'marketing'
};

// Opt-out keywords
const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const OPT_IN_KEYWORDS = ['START', 'YES', 'SUBSCRIBE', 'UNSTOP'];

/**
 * Check if user is opted in for SMS notifications
 * @param {string} userId - User ID
 * @param {string} type - SMS notification type
 */
async function isOptedIn(userId, type = 'all') {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        phone: true,
        phoneVerified: true,
        smsPreferences: true
      }
    });
    
    if (!user?.phone || !user.phoneVerified) {
      return false;
    }
    
    const prefs = user.smsPreferences ? JSON.parse(user.smsPreferences) : {};
    
    // Check global opt-out
    if (prefs.optedOut === true) {
      return false;
    }
    
    // Check specific type
    if (type !== 'all' && prefs[type] === false) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[SMS] Opt-in check failed:', err.message);
    return false;
  }
}

/**
 * Update SMS preferences for a user
 * @param {string} userId - User ID
 * @param {object} preferences - Preference updates
 */
async function updateSmsPreferences(userId, preferences) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smsPreferences: true }
    });
    
    const currentPrefs = user?.smsPreferences ? JSON.parse(user.smsPreferences) : {};
    const newPrefs = { ...currentPrefs, ...preferences, updatedAt: new Date().toISOString() };
    
    await prisma.user.update({
      where: { id: userId },
      data: { smsPreferences: JSON.stringify(newPrefs) }
    });
    
    return { success: true, preferences: newPrefs };
  } catch (err) {
    console.error('[SMS] Failed to update preferences:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Process incoming SMS (for opt-out handling)
 * @param {string} from - Sender phone number
 * @param {string} body - SMS body
 */
async function processIncomingSMS(from, body) {
  const normalizedPhone = normalizePhone(from);
  const message = body.trim().toUpperCase();
  
  // Find user by phone
  const user = await prisma.user.findFirst({
    where: { phone: normalizedPhone }
  });
  
  if (!user) {
    return { handled: false, reason: 'User not found' };
  }
  
  // Check for opt-out keywords
  if (OPT_OUT_KEYWORDS.some(kw => message.includes(kw))) {
    await updateSmsPreferences(user.id, { optedOut: true });
    
    // Send confirmation
    await sendSMS(normalizedPhone, 
      'Ngurra Pathways: You have been unsubscribed from SMS notifications. Reply START to re-subscribe.');
    
    return { handled: true, action: 'opted_out' };
  }
  
  // Check for opt-in keywords
  if (OPT_IN_KEYWORDS.some(kw => message.includes(kw))) {
    await updateSmsPreferences(user.id, { optedOut: false });
    
    // Send confirmation
    await sendSMS(normalizedPhone,
      'Ngurra Pathways: You have been subscribed to SMS notifications. Reply STOP to unsubscribe.');
    
    return { handled: true, action: 'opted_in' };
  }
  
  return { handled: false, reason: 'No action keyword found' };
}

/**
 * Send SMS with opt-in check
 * @param {string} userId - User ID
 * @param {string} type - SMS notification type
 * @param {string} message - SMS message
 */
async function sendUserSMS(userId, type, message) {
  // Check opt-in status
  if (!(await isOptedIn(userId, type))) {
    return { success: false, reason: 'User not opted in' };
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true }
  });
  
  if (!user?.phone) {
    return { success: false, reason: 'No phone number' };
  }
  
  return sendSMS(user.phone, message);
}

/**
 * Get SMS statistics
 */
async function getSmsStats(startDate, endDate) {
  // Note: Requires SmsLog model - track in production
  return {
    sent: 0,
    delivered: 0,
    failed: 0,
    optOuts: 0
  };
}

/**
 * Send application received SMS
 */
async function sendApplicationReceivedSMS(phone, jobTitle, companyName) {
  const message = `Ngurra Pathways: Your application for "${jobTitle}" at ${companyName} has been received! Check your dashboard for updates.`;
  return sendSMS(phone, message);
}

/**
 * Send application status update SMS
 */
async function sendApplicationStatusSMS(phone, jobTitle, status) {
  const statusMessages = {
    REVIEWED: `being reviewed`,
    SHORTLISTED: `been shortlisted! 🎉`,
    INTERVIEW: `moved to interview stage`,
    REJECTED: `not been selected. Keep applying!`
  };
  
  const statusText = statusMessages[status] || `been updated to: ${status}`;
  const message = `Ngurra Pathways: Your application for "${jobTitle}" has ${statusText}`;
  return sendSMS(phone, message);
}

// Test helpers
function _testCaptureClear() {
  capturedMessages.length = 0;
}

function _testCaptureGetAll() {
  return [...capturedMessages];
}
