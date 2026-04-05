// @ts-nocheck
"use strict";

/**
 * Session Recording & Transcript Management
 * 
 * Handles:
 * - Recording storage (S3/local)
 * - Transcript generation (Whisper API / manual)
 * - Playback URL generation
 * - Recording lifecycle management
 * 
 * Dependencies:
 * - Jitsi with recording enabled (Jibri)
 * - Optional: OpenAI Whisper for transcription
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || './recordings';
const S3_BUCKET = process.env.RECORDINGS_S3_BUCKET || null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const RECORDING_RETENTION_DAYS = parseInt(process.env.RECORDING_RETENTION_DAYS || '90', 10);

/**
 * Recording status enum
 */
export const RecordingStatus = {
  PENDING: 'PENDING',
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
};

/**
 * Initialize recordings directory
 */
async function ensureRecordingsDir() {
  try {
    await fs.mkdir(RECORDINGS_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Generate a unique recording ID
 * @param {string} sessionId - The mentorship session ID
 * @returns {string} - Unique recording ID
 */
function generateRecordingId(sessionId) {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `rec_${sessionId.slice(-8)}_${timestamp}_${random}`;
}

/**
 * Create a new recording entry
 * @param {object} options - Recording options
 * @param {string} options.sessionId - Mentorship session ID
 * @param {string} options.mentorId - Mentor user ID
 * @param {string} options.menteeId - Mentee user ID
 * @param {string} options.roomName - Jitsi room name
 * @returns {object} - Recording metadata
 */
export async function createRecording(options) {
  const { sessionId, mentorId, menteeId, roomName } = options;
  
  const recordingId = generateRecordingId(sessionId);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RECORDING_RETENTION_DAYS);
  
  const recording = {
    id: recordingId,
    sessionId,
    mentorId,
    menteeId,
    roomName,
    status: RecordingStatus.PENDING,
    duration: null,
    fileSize: null,
    videoUrl: null,
    audioUrl: null,
    thumbnailUrl: null,
    transcript: null,
    transcriptStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    completedAt: null,
    expiresAt: expiresAt.toISOString(),
  };
  
  // In production, save to database
  // For now, create a metadata file
  await ensureRecordingsDir();
  const metadataPath = path.join(RECORDINGS_DIR, `${recordingId}.json`);
  await fs.writeFile(metadataPath, JSON.stringify(recording, null, 2));
  
  return recording;
}

/**
 * Update recording status
 * @param {string} recordingId - Recording ID
 * @param {object} updates - Fields to update
 * @returns {object} - Updated recording
 */
export async function updateRecording(recordingId, updates) {
  const metadataPath = path.join(RECORDINGS_DIR, `${recordingId}.json`);
  
  try {
    const data = await fs.readFile(metadataPath, 'utf8');
    const recording = JSON.parse(data);
    
    const updated = {
      ...recording,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2));
    return updated;
  } catch (err) {
    console.error(`Failed to update recording ${recordingId}:`, err);
    throw err;
  }
}

/**
 * Get recording by ID
 * @param {string} recordingId - Recording ID
 * @returns {object|null} - Recording metadata
 */
export async function getRecording(recordingId) {
  const metadataPath = path.join(RECORDINGS_DIR, `${recordingId}.json`);
  
  try {
    const data = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Get recordings for a session
 * @param {string} sessionId - Session ID
 * @returns {Array} - List of recordings
 */
export async function getSessionRecordings(sessionId) {
  await ensureRecordingsDir();
  
  try {
    const files = await fs.readdir(RECORDINGS_DIR);
    const recordings = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const data = await fs.readFile(path.join(RECORDINGS_DIR, file), 'utf8');
      const recording = JSON.parse(data);
      
      if (recording.sessionId === sessionId && recording.status !== RecordingStatus.EXPIRED) {
        recordings.push(recording);
      }
    }
    
    return recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get session recordings:', err);
    return [];
  }
}

/**
 * Get recordings for a user (as mentee)
 * @param {string} userId - User ID
 * @returns {Array} - List of recordings
 */
export async function getUserRecordings(userId) {
  await ensureRecordingsDir();
  
  try {
    const files = await fs.readdir(RECORDINGS_DIR);
    const recordings = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const data = await fs.readFile(path.join(RECORDINGS_DIR, file), 'utf8');
      const recording = JSON.parse(data);
      
      if ((recording.menteeId === userId || recording.mentorId === userId) && 
          recording.status === RecordingStatus.READY) {
        recordings.push(recording);
      }
    }
    
    return recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get user recordings:', err);
    return [];
  }
}

/**
 * Process a completed recording (called by Jibri webhook or manual upload)
 * @param {string} recordingId - Recording ID
 * @param {object} fileInfo - File information
 * @param {string} fileInfo.videoPath - Path to video file
 * @param {number} fileInfo.duration - Duration in seconds
 * @param {number} fileInfo.fileSize - File size in bytes
 * @returns {object} - Updated recording
 */
export async function processRecording(recordingId, fileInfo) {
  const { videoPath, duration, fileSize } = fileInfo;
  
  // Update status to processing
  await updateRecording(recordingId, {
    status: RecordingStatus.PROCESSING,
    duration,
    fileSize,
  });
  
  try {
    // Generate video URL (in production, upload to S3)
    const videoUrl = S3_BUCKET 
      ? await uploadToS3(videoPath, recordingId)
      : `/recordings/${recordingId}/video`;
    
    // Generate transcript if OpenAI is configured
    let transcript = null;
    let transcriptStatus = 'SKIPPED';
    
    if (OPENAI_API_KEY) {
      transcriptStatus = 'PROCESSING';
      await updateRecording(recordingId, { transcriptStatus });
      
      try {
        transcript = await generateTranscript(videoPath, recordingId);
        transcriptStatus = 'READY';
      } catch (err) {
        console.error('Transcript generation failed:', err);
        transcriptStatus = 'FAILED';
      }
    }
    
    // Update recording as ready
    return await updateRecording(recordingId, {
      status: RecordingStatus.READY,
      videoUrl,
      transcript,
      transcriptStatus,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Recording processing failed:', err);
    await updateRecording(recordingId, {
      status: RecordingStatus.FAILED,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Generate transcript using OpenAI Whisper API
 * @param {string} audioPath - Path to audio/video file
 * @param {string} recordingId - Recording ID for caching
 * @returns {object} - Transcript with timestamps
 */
export async function generateTranscript(audioPath, recordingId) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Read audio file
  const audioBuffer = await fs.readFile(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
  
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.mp4');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(`Whisper API error: ${error.error?.message || 'Unknown error'}`);
  }
  
  const result: any = await response.json();
  
  // Format transcript with timestamps
  const transcript = {
    text: result.text,
    language: result.language,
    duration: result.duration,
    segments: (result.segments || []).map((seg: any) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
    })),
    generatedAt: new Date().toISOString(),
  };
  
  // Save transcript to file
  const transcriptPath = path.join(RECORDINGS_DIR, `${recordingId}_transcript.json`);
  await fs.writeFile(transcriptPath, JSON.stringify(transcript, null, 2));
  
  return transcript;
}

/**
 * Upload file to S3 (placeholder - implement with AWS SDK)
 * @param {string} filePath - Local file path
 * @param {string} recordingId - Recording ID for key
 * @returns {string} - S3 URL
 */
async function uploadToS3(filePath, recordingId) {
  // In production, use AWS SDK:
  // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  // const client = new S3Client({ region: process.env.AWS_REGION });
  // ...
  
  console.log(`[S3] Would upload ${filePath} to bucket ${S3_BUCKET}`);
  return `https://${S3_BUCKET}.s3.amazonaws.com/recordings/${recordingId}/video.mp4`;
}

/**
 * Generate a signed playback URL (for private recordings)
 * @param {string} recordingId - Recording ID
 * @param {number} expiresIn - Expiry in seconds (default: 1 hour)
 * @returns {string} - Signed URL
 */
export function generatePlaybackUrl(recordingId, expiresIn = 3600) {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'secret')
    .update(`${recordingId}:${expires}`)
    .digest('hex')
    .substring(0, 16);
  
  const base = process.env.API_URL || 'http://localhost:3001';
  return `${base}/recordings/${recordingId}/play?expires=${expires}&sig=${signature}`;
}

/**
 * Validate playback URL signature
 * @param {string} recordingId - Recording ID
 * @param {number} expires - Expiry timestamp
 * @param {string} signature - URL signature
 * @returns {boolean} - Valid or not
 */
export function validatePlaybackUrl(recordingId, expires, signature) {
  if (Date.now() / 1000 > expires) return false;
  
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'secret')
    .update(`${recordingId}:${expires}`)
    .digest('hex')
    .substring(0, 16);
  
  return signature === expected;
}

/**
 * Clean up expired recordings
 * @returns {number} - Number of recordings cleaned
 */
export async function cleanupExpiredRecordings() {
  await ensureRecordingsDir();
  
  try {
    const files = await fs.readdir(RECORDINGS_DIR);
    let cleaned = 0;
    const now = new Date();
    
    for (const file of files) {
      if (!file.endsWith('.json') || file.includes('_transcript')) continue;
      
      const metadataPath = path.join(RECORDINGS_DIR, file);
      const data = await fs.readFile(metadataPath, 'utf8');
      const recording = JSON.parse(data);
      
      if (new Date(recording.expiresAt) < now) {
        // Delete recording files
        await updateRecording(recording.id, { status: RecordingStatus.EXPIRED });
        
        // In production, also delete from S3
        console.log(`[Cleanup] Expired recording: ${recording.id}`);
        cleaned++;
      }
    }
    
    return cleaned;
  } catch (err) {
    console.error('Failed to cleanup recordings:', err);
    return 0;
  }
}

/**
 * Get Jitsi configuration for recording-enabled sessions
 * @returns {object} - Jitsi config with recording enabled
 */
export function getRecordingConfig() {
  return {
    // Jibri (Jitsi recording) configuration
    enableRecording: true,
    recordingType: 'jibri', // or 'local' for browser-based
    fileRecordingsEnabled: true,
    liveStreamingEnabled: false,
    hiddenDomain: 'recorder.meet.jit.si',
    dropbox: {
      appKey: process.env.DROPBOX_APP_KEY || null,
    },
    // Local recording fallback
    localRecording: {
      enabled: true,
      format: 'webm',
      maxDuration: 3600, // 1 hour max
    },
  };
}

// Exports handled inline
