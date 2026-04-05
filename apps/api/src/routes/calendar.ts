// @ts-nocheck
/**
 * Calendar Integration Routes
 * 
 * OAuth integration with Google Calendar and Outlook Calendar.
 * Handles connection, syncing, and scheduling.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate as authenticateToken } from '../middleware/auth';
import { prisma as prismaClient } from '../lib/database';
import crypto from 'crypto';

const prisma = prismaClient as any;

const router = Router();

// Token response interface
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

interface GoogleUserInfo {
  email?: string;
  name?: string;
}

interface MicrosoftUserInfo {
  mail?: string;
  userPrincipalName?: string;
  displayName?: string;
}

// OAuth configuration
const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/google/callback',
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
};

const MICROSOFT_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/calendar/outlook/callback',
  scopes: [
    'offline_access',
    'Calendars.ReadWrite',
  ],
};

// Helper to encrypt tokens before storing
function encryptToken(token: string): string {
  const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encrypted: string): string {
  const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * GET /api/calendar/status
 * Get current calendar connection status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get user's calendar integrations
    const integrations = await prisma.calendarIntegration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        connected: true,
        lastSync: true,
        createdAt: true,
      },
    });

    // Get scheduling settings
    const settings = await prisma.userSchedulingSettings.findUnique({
      where: { userId },
    });

    res.json({
      integrations,
      settings: settings || {
        defaultDuration: 30,
        bufferTime: 10,
        advanceNotice: 24,
        workingHours: { start: '09:00', end: '17:00' },
        workingDays: [1, 2, 3, 4, 5],
      },
    });
  } catch (error: any) {
    console.error('Calendar status error:', error);
    res.status(500).json({ error: 'Failed to get calendar status' });
  }
});

/**
 * GET /api/calendar/google/auth
 * Initiate Google Calendar OAuth flow
 */
router.get('/google/auth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session or database
    await prisma.oAuthState.create({
      data: {
        state,
        userId,
        provider: 'google',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', GOOGLE_CONFIG.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_CONFIG.scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    res.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Google auth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate Google OAuth' });
  }
});

/**
 * GET /api/calendar/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return void res.redirect('/settings/calendar?error=access_denied');
    }

    if (!code || !state) {
      return void res.redirect('/settings/calendar?error=invalid_request');
    }

    // Verify state
    const storedState = await prisma.oAuthState.findFirst({
      where: {
        state: state as string,
        provider: 'google',
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedState) {
      return void res.redirect('/settings/calendar?error=invalid_state');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CONFIG.clientId,
        client_secret: GOOGLE_CONFIG.clientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_CONFIG.redirectUri,
      }),
    });

    const tokens: TokenResponse = await tokenResponse.json();

    if (!tokens.access_token) {
      return void res.redirect('/settings/calendar?error=token_exchange_failed');
    }

    // Get user's email from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // Store or update integration
    await prisma.calendarIntegration.upsert({
      where: {
        userId_provider: {
          userId: storedState.userId,
          provider: 'google',
        },
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        tokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        email: userInfo.email,
        connected: true,
        lastSync: new Date(),
      },
      create: {
        userId: storedState.userId,
        provider: 'google',
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        tokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        email: userInfo.email,
        connected: true,
      },
    });

    // Clean up state
    await prisma.oAuthState.delete({ where: { id: storedState.id } });

    res.redirect('/settings/calendar?success=google_connected');
  } catch (error: any) {
    console.error('Google callback error:', error);
    res.redirect('/settings/calendar?error=callback_failed');
  }
});

/**
 * GET /api/calendar/outlook/auth
 * Initiate Outlook Calendar OAuth flow
 */
router.get('/outlook/auth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const state = crypto.randomBytes(32).toString('hex');
    
    await prisma.oAuthState.create({
      data: {
        state,
        userId,
        provider: 'outlook',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', MICROSOFT_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', MICROSOFT_CONFIG.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', MICROSOFT_CONFIG.scopes.join(' '));
    authUrl.searchParams.set('state', state);

    res.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Outlook auth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate Outlook OAuth' });
  }
});

/**
 * GET /api/calendar/outlook/callback
 * Handle Outlook OAuth callback
 */
router.get('/outlook/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return void res.redirect('/settings/calendar?error=access_denied');
    }

    if (!code || !state) {
      return void res.redirect('/settings/calendar?error=invalid_request');
    }

    const storedState = await prisma.oAuthState.findFirst({
      where: {
        state: state as string,
        provider: 'outlook',
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedState) {
      return void res.redirect('/settings/calendar?error=invalid_state');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MICROSOFT_CONFIG.clientId,
        client_secret: MICROSOFT_CONFIG.clientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: MICROSOFT_CONFIG.redirectUri,
        scope: MICROSOFT_CONFIG.scopes.join(' '),
      }),
    });

    const tokens: TokenResponse = await tokenResponse.json();

    if (!tokens.access_token) {
      return void res.redirect('/settings/calendar?error=token_exchange_failed');
    }

    // Get user's email from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo: MicrosoftUserInfo = await userInfoResponse.json();

    await prisma.calendarIntegration.upsert({
      where: {
        userId_provider: {
          userId: storedState.userId,
          provider: 'outlook',
        },
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        tokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        email: userInfo.mail || userInfo.userPrincipalName,
        connected: true,
        lastSync: new Date(),
      },
      create: {
        userId: storedState.userId,
        provider: 'outlook',
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        tokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        email: userInfo.mail || userInfo.userPrincipalName,
        connected: true,
      },
    });

    await prisma.oAuthState.delete({ where: { id: storedState.id } });

    res.redirect('/settings/calendar?success=outlook_connected');
  } catch (error: any) {
    console.error('Outlook callback error:', error);
    res.redirect('/settings/calendar?error=callback_failed');
  }
});

/**
 * DELETE /api/calendar/:provider/disconnect
 * Disconnect a calendar integration
 */
router.delete('/:provider/disconnect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { provider } = req.params;

    if (!['google', 'outlook'].includes(provider)) {
      return void res.status(400).json({ error: 'Invalid provider' });
    }

    await prisma.calendarIntegration.delete({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    res.json({ message: `${provider} calendar disconnected` });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

/**
 * GET /api/calendar/events
 * Get upcoming calendar events
 */
router.get('/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { start, end, provider } = req.query;

    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end ? new Date(end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get integrations
    const integrations = await prisma.calendarIntegration.findMany({
      where: { 
        userId,
        connected: true,
        ...(provider ? { provider: provider as string } : {}),
      },
    });

    const allEvents: any[] = [];

    for (const integration of integrations) {
      try {
        const accessToken = decryptToken(integration.accessToken);
        
        if (integration.provider === 'google') {
          const eventsResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            `timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const data: any = await eventsResponse.json();
          
          if (data.items) {
            allEvents.push(...data.items.map((item: any) => ({
              id: item.id,
              title: item.summary,
              start: item.start.dateTime || item.start.date,
              end: item.end.dateTime || item.end.date,
              provider: 'google',
              link: item.htmlLink,
            })));
          }
        } else if (integration.provider === 'outlook') {
          const eventsResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/calendarView?` +
            `startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$orderby=start/dateTime`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const data: any = await eventsResponse.json();
          
          if (data.value) {
            allEvents.push(...data.value.map((item: any) => ({
              id: item.id,
              title: item.subject,
              start: item.start.dateTime,
              end: item.end.dateTime,
              provider: 'outlook',
              link: item.webLink,
            })));
          }
        }
      } catch (err) {
        console.error(`Error fetching events from ${integration.provider}:`, err);
      }
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    res.json({ events: allEvents });
  } catch (error: any) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

/**
 * GET /api/calendar/availability
 * Get available time slots
 */
router.get('/availability', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { date, duration = 30 } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const slotDuration = parseInt(duration as string) || 30;

    // Get user settings
    const settings = await prisma.userSchedulingSettings.findUnique({
      where: { userId },
    });

    const workingHours = settings?.workingHours || { start: '09:00', end: '17:00' };
    const workingDays = settings?.workingDays || [1, 2, 3, 4, 5];
    const bufferTime = settings?.bufferTime || 10;

    // Check if target date is a working day
    if (!workingDays.includes(targetDate.getDay())) {
      return void res.json({ slots: [], message: 'Not a working day' });
    }

    // Get all events for the day
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Fetch busy times from connected calendars
    const busyTimes: { start: Date; end: Date }[] = [];
    
    // Get existing scheduled sessions
    const sessions = await prisma.mentorSession.findMany({
      where: {
        OR: [{ mentorId: userId }, { menteeId: userId }],
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['scheduled', 'confirmed'] },
      },
    });

    sessions.forEach((session: any) => {
      const sessionStart = new Date(session.scheduledAt);
      const sessionEnd = new Date(sessionStart.getTime() + (session.duration || 30) * 60 * 1000);
      busyTimes.push({ start: sessionStart, end: sessionEnd });
    });

    // Generate available slots
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    const slots: { start: string; end: string }[] = [];
    let currentTime = new Date(targetDate);
    currentTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endHour, endMin, 0, 0);

    while (currentTime.getTime() + slotDuration * 60 * 1000 <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000);
      
      // Check if slot conflicts with busy times
      const isConflict = busyTimes.some(busy => 
        (currentTime < busy.end && slotEnd > busy.start)
      );

      if (!isConflict && currentTime > new Date()) {
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      currentTime = new Date(currentTime.getTime() + (slotDuration + bufferTime) * 60 * 1000);
    }

    res.json({ slots });
  } catch (error: any) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

/**
 * PUT /api/calendar/settings
 * Update scheduling settings
 */
router.put('/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      defaultDuration,
      bufferTime,
      advanceNotice,
      workingHours,
      workingDays,
    } = req.body;

    const settings = await prisma.userSchedulingSettings.upsert({
      where: { userId },
      update: {
        defaultDuration,
        bufferTime,
        advanceNotice,
        workingHours,
        workingDays,
      },
      create: {
        userId,
        defaultDuration: defaultDuration || 30,
        bufferTime: bufferTime || 10,
        advanceNotice: advanceNotice || 24,
        workingHours: workingHours || { start: '09:00', end: '17:00' },
        workingDays: workingDays || [1, 2, 3, 4, 5],
      },
    });

    res.json(settings);
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;

