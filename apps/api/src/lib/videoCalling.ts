// @ts-nocheck
"use strict";

/**
 * Video Calling Integration for Mentorship Sessions
 * 
 * Supports:
 * - Jitsi Meet (free, self-hosted or meet.jit.si)
 * - Zoom (requires Zoom API credentials)
 * - Google Meet (requires Google Workspace)
 * 
 * Default: Jitsi Meet (no authentication required)
 */

const crypto = require('crypto');

// Configuration
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const JITSI_APP_ID = process.env.JITSI_APP_ID || null;
const JITSI_SECRET = process.env.JITSI_SECRET || null;
const ZOOM_API_KEY = process.env.ZOOM_API_KEY || null;
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET || null;

/**
 * Generate a unique room name for a mentorship session
 * @param {string} sessionId - The mentorship session ID
 * @param {string} mentorId - The mentor's user ID
 * @returns {string} - Unique room name
 */
function generateRoomName(sessionId, mentorId) {
  const hash = crypto.createHash('sha256')
    .update(`${sessionId}-${mentorId}-${Date.now()}`)
    .digest('hex')
    .substring(0, 12);
  return `ngurra-mentorship-${hash}`;
}

/**
 * Create a Jitsi Meet video call URL
 * @param {object} options - Call options
 * @param {string} options.sessionId - The mentorship session ID
 * @param {string} options.mentorId - The mentor's user ID
 * @param {string} options.mentorName - The mentor's display name
 * @param {string} options.menteeName - The mentee's display name
 * @param {string} options.topic - Session topic
 * @returns {object} - Video call details
 */
function createJitsiMeeting(options) {
  const { sessionId, mentorId, mentorName, menteeName, topic } = options;
  
  const roomName = generateRoomName(sessionId, mentorId);
  const baseUrl = `https://${JITSI_DOMAIN}/${roomName}`;
  
  // Build configuration parameters
  const config = {
    'config.prejoinPageEnabled': false,
    'config.startWithAudioMuted': false,
    'config.startWithVideoMuted': false,
    'config.disableDeepLinking': true,
  };
  
  // Add subject/topic if provided
  if (topic) {
    config['config.subject'] = encodeURIComponent(topic);
  }
  
  // Build URL with config
  const configParams = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  const meetingUrl = `${baseUrl}#${configParams}`;
  
  // Generate participant-specific URLs with display names
  const mentorUrl = `${baseUrl}#userInfo.displayName="${encodeURIComponent(mentorName || 'Mentor')}"&${configParams}`;
  const menteeUrl = `${baseUrl}#userInfo.displayName="${encodeURIComponent(menteeName || 'Mentee')}"&${configParams}`;
  
  return {
    provider: 'jitsi',
    roomName,
    meetingUrl,
    mentorUrl,
    menteeUrl,
    domain: JITSI_DOMAIN,
    expiresAt: null, // Jitsi rooms don't expire
    joinInstructions: `Click the link to join the video call. No account or download required.`,
    embedCode: generateJitsiEmbed(roomName, topic),
  };
}

/**
 * Generate embeddable Jitsi iframe code
 * @param {string} roomName - The room name
 * @param {string} subject - The meeting subject
 * @returns {string} - HTML embed code
 */
function generateJitsiEmbed(roomName, subject) {
  return `<iframe 
  allow="camera; microphone; fullscreen; display-capture; autoplay" 
  src="https://${JITSI_DOMAIN}/${roomName}" 
  style="height: 100%; width: 100%; border: 0px;"
  title="${subject || 'Ngurra Mentorship Session'}"
></iframe>`;
}

/**
 * Create a Zoom meeting (requires Zoom API credentials)
 * @param {object} options - Meeting options
 * @returns {Promise<object>} - Zoom meeting details
 */
async function createZoomMeeting(options) {
  if (!ZOOM_API_KEY || !ZOOM_API_SECRET) {
    throw new Error('Zoom API credentials not configured. Set ZOOM_API_KEY and ZOOM_API_SECRET.');
  }
  
  const { topic, startTime, duration = 60, hostEmail } = options;
  
  // Generate JWT token for Zoom API
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    {
      iss: ZOOM_API_KEY,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
    ZOOM_API_SECRET
  );
  
  try {
    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: topic || 'Ngurra Mentorship Session',
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration,
        timezone: 'Australia/Sydney',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
          waiting_room: true,
          audio: 'both',
          auto_recording: 'none',
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Zoom API error: ${error.message}`);
    }
    
    const meeting = await response.json();
    
    return {
      provider: 'zoom',
      meetingId: meeting.id,
      meetingUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      password: meeting.password,
      expiresAt: meeting.start_time,
      joinInstructions: `Join the Zoom meeting using the link. Meeting ID: ${meeting.id}, Password: ${meeting.password}`,
    };
  } catch (error) {
    console.error('Zoom meeting creation failed:', error);
    throw error;
  }
}

/**
 * Create a video meeting for a mentorship session
 * Defaults to Jitsi if no specific provider requested
 * 
 * @param {object} options - Meeting options
 * @param {string} options.sessionId - Mentorship session ID
 * @param {string} options.mentorId - Mentor user ID
 * @param {string} options.mentorName - Mentor display name
 * @param {string} options.menteeName - Mentee display name
 * @param {string} options.topic - Session topic
 * @param {string} options.provider - 'jitsi' | 'zoom' (default: 'jitsi')
 * @param {Date} options.startTime - Session start time (for Zoom)
 * @param {number} options.duration - Duration in minutes (for Zoom)
 * @returns {Promise<object>} - Video meeting details
 */
async function createVideoMeeting(options) {
  const provider = options.provider || 'jitsi';
  
  switch (provider.toLowerCase()) {
    case 'zoom':
      return createZoomMeeting(options);
    case 'jitsi':
    default:
      return createJitsiMeeting(options);
  }
}

/**
 * Get video call embed component props for frontend
 * @param {string} meetingUrl - The meeting URL
 * @param {string} provider - The provider name
 * @returns {object} - Props for video embed component
 */
function getEmbedProps(meetingUrl, provider = 'jitsi') {
  if (provider === 'jitsi') {
    // Extract room name from URL
    const roomMatch = meetingUrl.match(/meet\.jit\.si\/([^#?]+)/);
    const roomName = roomMatch ? roomMatch[1] : '';
    
    return {
      domain: JITSI_DOMAIN,
      roomName,
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#1e293b',
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop',
          'fullscreen', 'hangup', 'chat', 'recording',
          'settings', 'raisehand', 'videoquality', 'tileview',
        ],
      },
    };
  }
  
  return { url: meetingUrl };
}

/**
 * Check if video calling is available
 * @returns {object} - Available providers
 */
function getAvailableProviders() {
  return {
    jitsi: {
      available: true, // Always available
      configured: !!JITSI_APP_ID,
      domain: JITSI_DOMAIN,
    },
    zoom: {
      available: !!ZOOM_API_KEY && !!ZOOM_API_SECRET,
      configured: !!ZOOM_API_KEY,
    },
  };
}
