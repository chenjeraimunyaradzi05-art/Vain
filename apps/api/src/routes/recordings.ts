// @ts-nocheck
/**
 * Session Recordings API Routes
 * 
 * Endpoints:
 * - GET /recordings - List user's recordings
 * - GET /recordings/:id - Get recording details
 * - GET /recordings/:id/play - Get playback URL
 * - GET /recordings/:id/transcript - Get transcript
 * - POST /recordings - Create new recording (internal)
 * - POST /recordings/:id/complete - Mark recording complete (webhook)
 * - DELETE /recordings/:id - Delete recording (mentor only)
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import {
  RecordingStatus,
  createRecording,
  updateRecording,
  getRecording,
  getSessionRecordings,
  getUserRecordings,
  processRecording,
  generatePlaybackUrl,
  validatePlaybackUrl,
  getRecordingConfig,
} from '../lib/sessionRecording';

const router = express.Router();

/**
 * GET /recordings
 * List recordings for the authenticated user
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const recordings = await getUserRecordings(req.user.id);
    
    // Filter out sensitive data for non-mentors
    const sanitized = recordings.map(rec => ({
      id: rec.id,
      sessionId: rec.sessionId,
      status: rec.status,
      duration: rec.duration,
      createdAt: rec.createdAt,
      expiresAt: rec.expiresAt,
      hasTranscript: rec.transcriptStatus === 'READY',
      thumbnailUrl: rec.thumbnailUrl,
    }));
    
    res.json({ recordings: sanitized, total: sanitized.length });
  } catch (err) {
    console.error('Failed to list recordings:', err);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

/**
 * GET /recordings/session/:sessionId
 * Get recordings for a specific session
 */
router.get('/session/:sessionId', authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const recordings = await getSessionRecordings(sessionId);
    
    // Verify user has access to this session
    const hasAccess = recordings.some(
      rec => rec.mentorId === req.user.id || rec.menteeId === req.user.id
    );
    
    if (!hasAccess && recordings.length > 0) {
      return void res.status(403).json({ error: 'Access denied to this session' });
    }
    
    res.json({ recordings, total: recordings.length });
  } catch (err) {
    console.error('Failed to get session recordings:', err);
    res.status(500).json({ error: 'Failed to get session recordings' });
  }
});

/**
 * GET /recordings/config/jitsi
 * Get Jitsi recording configuration for frontend
 */
router.get('/config/jitsi', (req, res) => {
  const config = getRecordingConfig();
  res.json({ config });
});

/**
 * GET /recordings/:id
 * Get recording details
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const recording = await getRecording(req.params.id);
    
    if (!recording) {
      return void res.status(404).json({ error: 'Recording not found' });
    }
    
    // Verify access
    if (recording.mentorId !== req.user.id && recording.menteeId !== req.user.id) {
      return void res.status(403).json({ error: 'Access denied' });
    }
    
    // Don't expose internal paths
    const { videoPath, audioPath, ...safeRecording } = recording;
    
    res.json({ recording: safeRecording });
  } catch (err) {
    console.error('Failed to get recording:', err);
    res.status(500).json({ error: 'Failed to get recording' });
  }
});

/**
 * GET /recordings/:id/play
 * Get a signed playback URL or validate existing signature
 */
router.get('/:id/play', async (req, res) => {
  try {
    const { id } = req.params;
    const { expires, sig } = req.query;
    
    // If signature provided, validate and redirect
    if (expires && sig) {
      if (!validatePlaybackUrl(id, parseInt(expires, 10), sig)) {
        return void res.status(403).json({ error: 'Invalid or expired playback URL' });
      }
      
      const recording = await getRecording(id);
      if (!recording || recording.status !== RecordingStatus.READY) {
        return void res.status(404).json({ error: 'Recording not available' });
      }
      
      // Redirect to actual video URL
      return void res.redirect(recording.videoUrl);
    }
    
    // Otherwise, require auth and generate URL
    if (!req.user) {
      return void res.status(401).json({ error: 'Authentication required' });
    }
    
    const recording = await getRecording(id);
    
    if (!recording) {
      return void res.status(404).json({ error: 'Recording not found' });
    }
    
    if (recording.mentorId !== req.user.id && recording.menteeId !== req.user.id) {
      return void res.status(403).json({ error: 'Access denied' });
    }
    
    if (recording.status !== RecordingStatus.READY) {
      return void res.status(400).json({ 
        error: 'Recording not ready',
        status: recording.status,
      });
    }
    
    const playbackUrl = generatePlaybackUrl(id, 3600); // 1 hour expiry
    
    res.json({ 
      playbackUrl,
      expiresIn: 3600,
      duration: recording.duration,
    });
  } catch (err) {
    console.error('Failed to get playback URL:', err);
    res.status(500).json({ error: 'Failed to get playback URL' });
  }
});

/**
 * GET /recordings/:id/transcript
 * Get recording transcript
 */
router.get('/:id/transcript', authenticateJWT, async (req, res) => {
  try {
    const recording = await getRecording(req.params.id);
    
    if (!recording) {
      return void res.status(404).json({ error: 'Recording not found' });
    }
    
    if (recording.mentorId !== req.user.id && recording.menteeId !== req.user.id) {
      return void res.status(403).json({ error: 'Access denied' });
    }
    
    if (recording.transcriptStatus !== 'READY' || !recording.transcript) {
      return void res.status(400).json({ 
        error: 'Transcript not available',
        status: recording.transcriptStatus,
      });
    }
    
    res.json({ 
      transcript: recording.transcript,
      recordingId: recording.id,
      duration: recording.duration,
    });
  } catch (err) {
    console.error('Failed to get transcript:', err);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

/**
 * POST /recordings
 * Create a new recording entry (called when starting a recorded session)
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { sessionId, mentorId, menteeId, roomName } = req.body;
    
    if (!sessionId || !roomName) {
      return void res.status(400).json({ error: 'sessionId and roomName required' });
    }
    
    // Verify user is part of the session
    const userId = req.user.id;
    if (userId !== mentorId && userId !== menteeId) {
      return void res.status(403).json({ error: 'Access denied' });
    }
    
    const recording = await createRecording({
      sessionId,
      mentorId: mentorId || userId,
      menteeId: menteeId || userId,
      roomName,
    });
    
    res.status(201).json({ 
      recording,
      message: 'Recording created. Start recording in video call.',
    });
  } catch (err) {
    console.error('Failed to create recording:', err);
    res.status(500).json({ error: 'Failed to create recording' });
  }
});

/**
 * POST /recordings/:id/complete
 * Mark recording as complete (called by Jibri webhook or manual upload)
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { videoPath, duration, fileSize, webhookSecret } = req.body;
    
    // Validate webhook secret (for automated callbacks)
    const expectedSecret = process.env.RECORDING_WEBHOOK_SECRET;
    if (expectedSecret && webhookSecret !== expectedSecret) {
      // Fall back to auth check
      if (!req.user) {
        return void res.status(401).json({ error: 'Authentication required' });
      }
    }
    
    const recording = await getRecording(id);
    if (!recording) {
      return void res.status(404).json({ error: 'Recording not found' });
    }
    
    // Process the recording (upload, transcript, etc.)
    const updated = await processRecording(id, {
      videoPath,
      duration,
      fileSize,
    });
    
    res.json({ 
      recording: updated,
      message: 'Recording processed successfully',
    });
  } catch (err) {
    console.error('Failed to complete recording:', err);
    res.status(500).json({ error: 'Failed to process recording' });
  }
});

/**
 * DELETE /recordings/:id
 * Delete a recording (mentor only, within retention period)
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const recording = await getRecording(req.params.id);
    
    if (!recording) {
      return void res.status(404).json({ error: 'Recording not found' });
    }
    
    // Only mentor can delete
    if (recording.mentorId !== req.user.id) {
      return void res.status(403).json({ error: 'Only the mentor can delete recordings' });
    }
    
    await updateRecording(req.params.id, { 
      status: RecordingStatus.EXPIRED,
      deletedBy: req.user.id,
      deletedAt: new Date().toISOString(),
    });
    
    res.json({ message: 'Recording deleted' });
  } catch (err) {
    console.error('Failed to delete recording:', err);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

export default router;



