// @ts-nocheck
/**
 * Google Calendar OAuth Integration Library
 * Handles OAuth flow and calendar operations for mentor scheduling
 * 
 * Note: This requires googleapis package: npm install googleapis
 * And env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 */

// Lazy load googleapis to avoid breaking if not installed
let google = null;
try {
  google = require('googleapis').google;
} catch (e) {
  console.warn('googleapis not installed - Google Calendar OAuth features disabled');
}

// OAuth2 client configuration
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Check if calendar integration is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && google);
}

/**
 * Create OAuth2 client with credentials
 */
function createOAuth2Client() {
  if (!google) {
    console.warn('Google Calendar: googleapis not installed');
    return null;
  }
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';

  if (!clientId || !clientSecret) {
    console.warn('Google Calendar: OAuth credentials not configured');
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate authorization URL for OAuth flow
 * @param {string} userId - User ID to include in state
 * @returns {string} Authorization URL
 */
function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google Calendar integration not configured');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from callback
 * @returns {Promise<object>} Token object
 */
async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google Calendar integration not configured');
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create authenticated calendar client
 * @param {object} tokens - Access and refresh tokens
 * @returns {object} Google Calendar API client
 */
function createCalendarClient(tokens) {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google Calendar integration not configured');
  }

  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Get free/busy availability for a mentor
 * @param {object} tokens - User's OAuth tokens
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Array>} List of busy time ranges
 */
async function getFreeBusy(tokens, startDate, endDate) {
  const calendar = createCalendarClient(tokens);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  return response.data.calendars.primary.busy || [];
}

/**
 * Get available time slots based on mentor's availability and calendar
 * @param {object} tokens - User's OAuth tokens (null for fallback)
 * @param {Array} availabilityRules - Mentor's weekly availability rules
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {number} slotDurationMinutes - Duration of each slot
 * @returns {Promise<Array>} List of available time slots
 */
async function getAvailableSlots(tokens, availabilityRules, startDate, endDate, slotDurationMinutes = 60) {
  // Get busy times from calendar if tokens available
  let busyTimes = [];
  if (tokens && isConfigured()) {
    try {
      busyTimes = await getFreeBusy(tokens, startDate, endDate);
    } catch (e) {
      console.warn('Failed to fetch calendar, using availability rules only:', e.message);
    }
  }

  const slots = [];
  const current = new Date(startDate);

  while (current < endDate) {
    const dayOfWeek = current.getDay();
    const dayRules = (availabilityRules || []).filter(r => r.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      const [startHour, startMin] = rule.startTime.split(':').map(Number);
      const [endHour, endMin] = rule.endTime.split(':').map(Number);

      let slotStart = new Date(current);
      slotStart.setHours(startHour, startMin, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(endHour, endMin, 0, 0);

      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
        
        if (slotEnd > dayEnd) break;

        // Check if slot conflicts with busy times
        const isConflict = busyTimes.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        // Only add future slots
        if (!isConflict && slotStart > new Date()) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration: slotDurationMinutes,
          });
        }

        slotStart = slotEnd;
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return slots;
}

/**
 * Create calendar event for a mentorship session
 * @param {object} tokens - Mentor's OAuth tokens
 * @param {object} session - Session details
 * @returns {Promise<object>} Created event
 */
async function createSessionEvent(tokens, session) {
  const calendar = createCalendarClient(tokens);

  const event = {
    summary: `Mentorship Session with ${session.menteeName || 'Mentee'}`,
    description: `Ngurra Pathways mentorship session\n\n${session.notes || ''}\n\nJoin: ${session.videoUrl || 'Link will be provided'}`,
    start: {
      dateTime: session.scheduledAt,
      timeZone: session.timezone || 'Australia/Sydney',
    },
    end: {
      dateTime: new Date(new Date(session.scheduledAt).getTime() + (session.duration || 60) * 60000).toISOString(),
      timeZone: session.timezone || 'Australia/Sydney',
    },
    attendees: session.attendees || [],
    conferenceData: session.createMeet ? {
      createRequest: {
        requestId: session.id,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    } : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: session.createMeet ? 1 : 0,
    sendUpdates: 'all',
  });

  return response.data;
}

/**
 * Update calendar event for a session
 * @param {object} tokens - User's OAuth tokens
 * @param {string} eventId - Google Calendar event ID
 * @param {object} updates - Event updates
 * @returns {Promise<object>} Updated event
 */
async function updateSessionEvent(tokens, eventId, updates) {
  const calendar = createCalendarClient(tokens);

  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: updates,
    sendUpdates: 'all',
  });

  return response.data;
}

/**
 * Cancel calendar event
 * @param {object} tokens - User's OAuth tokens
 * @param {string} eventId - Google Calendar event ID
 */
async function cancelSessionEvent(tokens, eventId) {
  const calendar = createCalendarClient(tokens);

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });
}

/**
 * Generate a fallback availability schedule (no OAuth required)
 * @param {Array} availabilityRules - Mentor's weekly availability
 * @param {number} daysAhead - Number of days to generate
 * @returns {Promise<Array>} Available time slots
 */
async function generateFallbackSlots(availabilityRules, daysAhead = 14) {
  const now = new Date();
  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return getAvailableSlots(null, availabilityRules, now, endDate, 60);
}

/**
 * Generate default availability rules (weekdays 9-5)
 * @returns {Array} Default availability rules
 */
function getDefaultAvailability() {
  return [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', timezone: 'Australia/Sydney' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', timezone: 'Australia/Sydney' },
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', timezone: 'Australia/Sydney' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', timezone: 'Australia/Sydney' },
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', timezone: 'Australia/Sydney' },
  ];
}
