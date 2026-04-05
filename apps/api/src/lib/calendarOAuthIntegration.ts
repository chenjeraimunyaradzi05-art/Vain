// @ts-nocheck
'use strict';

/**
 * Calendar Integration with OAuth (Step 46)
 * 
 * Features:
 * - Google Calendar API integration
 * - Microsoft Outlook API integration
 * - OAuth2 token management
 * - Availability sharing
 * - Automatic calendar invites
 * - Rescheduling flow
 */

const crypto = require('crypto');
const { prisma } = require('../db');
const logger = require('./logger');

// OAuth configuration
const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || 
                 `${process.env.API_BASE_URL}/calendar/callback/google`,
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiBase: 'https://www.googleapis.com/calendar/v3'
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_CALENDAR_REDIRECT_URI ||
                 `${process.env.API_BASE_URL}/calendar/callback/microsoft`,
    scopes: ['Calendars.ReadWrite', 'User.Read'],
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    apiBase: 'https://graph.microsoft.com/v1.0'
  }
};

/**
 * Generate OAuth authorization URL
 * @param {string} provider - 'google' or 'microsoft'
 * @param {string} userId - User ID for state
 */
function getAuthUrl(provider, userId) {
  const config = OAUTH_CONFIG[provider];
  if (!config || !config.clientId) {
    throw new Error(`${provider} calendar not configured`);
  }
  
  const state = Buffer.from(JSON.stringify({
    userId,
    provider,
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now()
  })).toString('base64url');
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline', // Google: get refresh token
    prompt: 'consent'
  });
  
  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * @param {string} provider - 'google' or 'microsoft'
 * @param {string} code - Authorization code
 */
async function exchangeCodeForTokens(provider, code) {
  const config = OAUTH_CONFIG[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  });
  
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  return response.json();
}

/**
 * Save calendar connection for user
 * @param {string} userId - User ID
 * @param {string} provider - Calendar provider
 * @param {object} tokens - OAuth tokens
 */
async function saveCalendarConnection(userId, provider, tokens) {
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
  
  // Encrypt tokens before storing
  const encryptedTokens = encryptTokens(tokens);
  
  await prisma.calendarConnection.upsert({
    where: {
      userId_provider: { userId, provider }
    },
    update: {
      accessToken: encryptedTokens.accessToken,
      refreshToken: encryptedTokens.refreshToken || undefined,
      expiresAt,
      updatedAt: new Date()
    },
    create: {
      userId,
      provider,
      accessToken: encryptedTokens.accessToken,
      refreshToken: encryptedTokens.refreshToken,
      expiresAt
    }
  });
  
  return { connected: true, provider };
}

/**
 * Encrypt tokens for storage
 */
function encryptTokens(tokens) {
  const key = crypto.scryptSync(
    process.env.CALENDAR_ENCRYPTION_KEY || process.env.JWT_SECRET || 'calendar-key',
    'salt',
    32
  );
  
  const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  };
  
  return {
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null
  };
}

/**
 * Decrypt tokens
 */
function decryptTokens(connection) {
  const key = crypto.scryptSync(
    process.env.CALENDAR_ENCRYPTION_KEY || process.env.JWT_SECRET || 'calendar-key',
    'salt',
    32
  );
  
  const decrypt = (encrypted) => {
    if (!encrypted) return null;
    const [ivHex, tagHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  };
  
  return {
    accessToken: decrypt(connection.accessToken),
    refreshToken: decrypt(connection.refreshToken)
  };
}

/**
 * Get valid access token (refresh if needed)
 * @param {string} userId - User ID
 * @param {string} provider - Calendar provider
 */
async function getValidAccessToken(userId, provider) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider } }
  });
  
  if (!connection) {
    throw new Error('Calendar not connected');
  }
  
  // Check if token is expired
  if (connection.expiresAt <= new Date()) {
    const tokens = decryptTokens(connection);
    
    if (!tokens.refreshToken) {
      throw new Error('Token expired, please reconnect');
    }
    
    // Refresh the token
    const newTokens = await refreshAccessToken(provider, tokens.refreshToken);
    await saveCalendarConnection(userId, provider, {
      access_token: newTokens.access_token,
      refresh_token: tokens.refreshToken, // Keep existing refresh token
      expires_in: newTokens.expires_in
    });
    
    return newTokens.access_token;
  }
  
  return decryptTokens(connection).accessToken;
}

/**
 * Refresh access token
 */
async function refreshAccessToken(provider, refreshToken) {
  const config = OAUTH_CONFIG[provider];
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  
  return response.json();
}

/**
 * Create calendar event
 * @param {string} userId - User ID
 * @param {string} provider - Calendar provider
 * @param {object} eventData - Event details
 */
async function createCalendarEvent(userId, provider, eventData) {
  const accessToken = await getValidAccessToken(userId, provider);
  const config = OAUTH_CONFIG[provider];
  
  if (provider === 'google') {
    return createGoogleEvent(accessToken, config, eventData);
  } else if (provider === 'microsoft') {
    return createMicrosoftEvent(accessToken, config, eventData);
  }
  
  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Create event in Google Calendar
 */
async function createGoogleEvent(accessToken, config, eventData) {
  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: eventData.timezone || 'Australia/Sydney'
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: eventData.timezone || 'Australia/Sydney'
    },
    attendees: eventData.attendees?.map(email => ({ email })) || [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    },
    conferenceData: eventData.createMeetLink ? {
      createRequest: {
        requestId: crypto.randomBytes(16).toString('hex')
      }
    } : undefined
  };
  
  if (eventData.location) {
    event.location = eventData.location;
  }
  
  const url = `${config.apiBase}/calendars/primary/events`;
  const params = eventData.createMeetLink ? '?conferenceDataVersion=1' : '';
  
  const response = await fetch(url + params, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Google event: ${error}`);
  }
  
  const result = await response.json();
  
  return {
    id: result.id,
    htmlLink: result.htmlLink,
    meetLink: result.conferenceData?.entryPoints?.[0]?.uri
  };
}

/**
 * Create event in Microsoft Outlook
 */
async function createMicrosoftEvent(accessToken, config, eventData) {
  const event = {
    subject: eventData.title,
    body: {
      contentType: 'HTML',
      content: eventData.description || ''
    },
    start: {
      dateTime: eventData.startTime.toISOString().slice(0, -1),
      timeZone: eventData.timezone || 'Australia/Sydney'
    },
    end: {
      dateTime: eventData.endTime.toISOString().slice(0, -1),
      timeZone: eventData.timezone || 'Australia/Sydney'
    },
    attendees: eventData.attendees?.map(email => ({
      emailAddress: { address: email },
      type: 'required'
    })) || [],
    isOnlineMeeting: !!eventData.createMeetLink,
    onlineMeetingProvider: eventData.createMeetLink ? 'teamsForBusiness' : undefined
  };
  
  if (eventData.location) {
    event.location = { displayName: eventData.location };
  }
  
  const response = await fetch(`${config.apiBase}/me/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Outlook event: ${error}`);
  }
  
  const result = await response.json();
  
  return {
    id: result.id,
    webLink: result.webLink,
    meetLink: result.onlineMeeting?.joinUrl
  };
}

/**
 * Get user's free/busy times
 * @param {string} userId - User ID
 * @param {string} provider - Calendar provider
 * @param {Date} startTime - Start of range
 * @param {Date} endTime - End of range
 */
async function getFreeBusy(userId, provider, startTime, endTime) {
  const accessToken = await getValidAccessToken(userId, provider);
  const config = OAUTH_CONFIG[provider];
  
  if (provider === 'google') {
    const response = await fetch(`${config.apiBase}/freeBusy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: 'primary' }]
      })
    });
    
    const data = await response.json();
    return data.calendars?.primary?.busy || [];
  } else if (provider === 'microsoft') {
    const response = await fetch(
      `${config.apiBase}/me/calendarView?startDateTime=${startTime.toISOString()}&endDateTime=${endTime.toISOString()}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    const data = await response.json();
    return data.value?.map(event => ({
      start: event.start.dateTime,
      end: event.end.dateTime
    })) || [];
  }
  
  return [];
}

/**
 * Find available meeting slots
 * @param {string} userId - User ID
 * @param {object} options - Search options
 */
async function findAvailableSlots(userId, options) {
  const {
    startDate,
    endDate,
    duration = 30, // minutes
    workingHoursStart = 9,
    workingHoursEnd = 17,
    timezone = 'Australia/Sydney'
  } = options;
  
  // Get user's calendar connections
  const connections = await prisma.calendarConnection.findMany({
    where: { userId }
  });
  
  // Collect all busy times
  let allBusy = [];
  
  for (const connection of connections) {
    try {
      const busy = await getFreeBusy(
        userId,
        connection.provider,
        new Date(startDate),
        new Date(endDate)
      );
      allBusy = [...allBusy, ...busy];
    } catch (err) {
      logger.warn('Failed to get free/busy', { provider: connection.provider, error: err.message });
    }
  }
  
  // Generate available slots
  const slots = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate < end) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(workingHoursStart, 0, 0, 0);
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(workingHoursEnd, 0, 0, 0);
    
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      let slotStart = new Date(dayStart);
      
      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        
        // Check if slot conflicts with any busy time
        const hasConflict = allBusy.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });
        
        if (!hasConflict && slotEnd <= dayEnd) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          });
        }
        
        slotStart = new Date(slotStart.getTime() + 30 * 60000); // 30 min intervals
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots.slice(0, 50); // Limit results
}

/**
 * Delete a calendar event
 * @param {string} userId - User ID
 * @param {string} provider - Calendar provider
 * @param {string} eventId - Event ID
 */
async function deleteCalendarEvent(userId, provider, eventId) {
  const accessToken = await getValidAccessToken(userId, provider);
  const config = OAUTH_CONFIG[provider];
  
  let url;
  if (provider === 'google') {
    url = `${config.apiBase}/calendars/primary/events/${eventId}`;
  } else if (provider === 'microsoft') {
    url = `${config.apiBase}/me/events/${eventId}`;
  }
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to delete event');
  }
  
  return { success: true };
}

/**
 * Get user's connected calendars
 * @param {string} userId - User ID
 */
async function getConnectedCalendars(userId) {
  const connections = await prisma.calendarConnection.findMany({
    where: { userId },
    select: {
      provider: true,
      createdAt: true,
      expiresAt: true
    }
  });
  
  return connections.map(c => ({
    provider: c.provider,
    connected: true,
    connectedAt: c.createdAt,
    tokenValid: c.expiresAt > new Date()
  }));
}

/**
 * Disconnect a calendar
 * @param {string} userId - User ID
 * @param {string} provider - Calendar provider
 */
async function disconnectCalendar(userId, provider) {
  await prisma.calendarConnection.delete({
    where: { userId_provider: { userId, provider } }
  });
  
  return { disconnected: true, provider };
}
