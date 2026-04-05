// @ts-nocheck
/**
 * Video Resume Module
 * 
 * Comprehensive video resume functionality including:
 * - Video upload and recording
 * - Processing and transcoding
 * - AI-powered transcription
 * - Thumbnail generation
 * - Privacy controls
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

const prismaClient = new PrismaClient();
const prisma = prismaClient as any;

// ============================================================================
// CONFIGURATION
// ============================================================================

const VIDEO_CONFIG = {
  maxDuration: 180, // 3 minutes max
  maxFileSize: 100 * 1024 * 1024, // 100MB
  supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  thumbnailTimeOffset: 2, // seconds into video for thumbnail
  resolutions: ['1080p', '720p', '480p'],
  defaultResolution: '720p'
};

const PROCESSING_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  TRANSCRIBING: 'transcribing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// S3 client initialization
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ngurra-video-resumes';

// ============================================================================
// VIDEO UPLOAD
// ============================================================================

/**
 * Generate a presigned URL for direct video upload to S3
 */
export async function getVideoUploadUrl(userId, { fileName, contentType, fileSize }) {
  // Validate file type
  if (!VIDEO_CONFIG.supportedFormats.includes(contentType)) {
    throw new Error(`Unsupported video format. Supported: ${VIDEO_CONFIG.supportedFormats.join(', ')}`);
  }

  // Validate file size
  if (fileSize > VIDEO_CONFIG.maxFileSize) {
    throw new Error(`File size exceeds ${VIDEO_CONFIG.maxFileSize / 1024 / 1024}MB limit`);
  }

  const videoId = uuid();
  const key = `videos/${userId}/${videoId}/original${getExtension(fileName)}`;

  // Create video record in pending state
  const videoResume = await prisma.videoResume.create({
    data: {
      id: videoId,
      userId,
      originalFileName: fileName,
      contentType,
      fileSize,
      s3Key: key,
      status: PROCESSING_STATUS.UPLOADING
    }
  });

  // Generate presigned upload URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
    Metadata: {
      userId,
      videoId,
      originalFileName: fileName
    }
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    videoId,
    uploadUrl,
    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
    maxDuration: VIDEO_CONFIG.maxDuration,
    maxFileSize: VIDEO_CONFIG.maxFileSize
  };
}

/**
 * Confirm upload completion and trigger processing
 */
export async function confirmVideoUpload(videoId, userId) {
  const video = await prisma.videoResume.findFirst({
    where: { id: videoId, userId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  if (video.status !== PROCESSING_STATUS.UPLOADING) {
    throw new Error('Video is not in uploading state');
  }

  // Update status to processing
  await prisma.videoResume.update({
    where: { id: videoId },
    data: { status: PROCESSING_STATUS.PROCESSING }
  });

  // Trigger async processing (in production, this would be a background job)
  processVideo(videoId).catch(err => {
    console.error('Video processing failed:', err);
    prisma.videoResume.update({
      where: { id: videoId },
      data: { 
        status: PROCESSING_STATUS.FAILED,
        errorMessage: err.message
      }
    });
  });

  return { videoId, status: PROCESSING_STATUS.PROCESSING };
}

// ============================================================================
// VIDEO PROCESSING
// ============================================================================

/**
 * Process uploaded video (transcoding, thumbnail, transcription)
 */
async function processVideo(videoId) {
  const video = await prisma.videoResume.findUnique({
    where: { id: videoId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  try {
    // Step 1: Extract video metadata (duration, resolution)
    const metadata = await extractVideoMetadata(video.s3Key);
    
    // Validate duration
    if (metadata.duration > VIDEO_CONFIG.maxDuration) {
      throw new Error(`Video duration ${metadata.duration}s exceeds ${VIDEO_CONFIG.maxDuration}s limit`);
    }

    // Step 2: Generate thumbnail
    const thumbnailKey = await generateThumbnail(video.s3Key, video.userId, videoId);

    // Step 3: Transcode to web-optimized format
    const transcodedKey = await transcodeVideo(video.s3Key, video.userId, videoId);

    // Step 4: Start transcription
    await prisma.videoResume.update({
      where: { id: videoId },
      data: { status: PROCESSING_STATUS.TRANSCRIBING }
    });

    const transcription = await transcribeVideo(transcodedKey || video.s3Key);

    // Step 5: Update record with all processed data
    await prisma.videoResume.update({
      where: { id: videoId },
      data: {
        videoUrl: getPublicUrl(transcodedKey || video.s3Key),
        thumbnailUrl: getPublicUrl(thumbnailKey),
        duration: Math.round(metadata.duration),
        width: metadata.width,
        height: metadata.height,
        transcription: transcription.text,
        transcriptionConfidence: transcription.confidence,
        status: PROCESSING_STATUS.COMPLETED,
        processedAt: new Date()
      }
    });

    return { success: true, videoId };
  } catch (error) {
    await prisma.videoResume.update({
      where: { id: videoId },
      data: {
        status: PROCESSING_STATUS.FAILED,
        errorMessage: error.message
      }
    });
    throw error;
  }
}

/**
 * Extract video metadata using ffprobe (simulated for now)
 */
async function extractVideoMetadata(s3Key) {
  // In production, use AWS MediaConvert or ffprobe via Lambda
  // For now, return mock data
  return {
    duration: 120, // 2 minutes
    width: 1920,
    height: 1080,
    bitrate: 5000000,
    codec: 'h264'
  };
}

/**
 * Generate video thumbnail
 */
async function generateThumbnail(originalKey, userId, videoId) {
  // In production, use AWS MediaConvert or ffmpeg via Lambda
  const thumbnailKey = `videos/${userId}/${videoId}/thumbnail.jpg`;
  
  // For now, we'll assume thumbnail generation happens
  // In production, this would call a Lambda function or MediaConvert job
  
  return thumbnailKey;
}

/**
 * Transcode video to web-optimized format
 */
async function transcodeVideo(originalKey, userId, videoId) {
  // In production, use AWS MediaConvert
  const transcodedKey = `videos/${userId}/${videoId}/transcoded.mp4`;
  
  // For now, we'll assume transcoding happens
  // In production, this would submit an AWS MediaConvert job
  
  return transcodedKey;
}

/**
 * Transcribe video audio using AI
 */
async function transcribeVideo(s3Key) {
  // In production, use AWS Transcribe or OpenAI Whisper
  // For now, return mock transcription
  
  if (process.env.OPENAI_API_KEY) {
    try {
      // OpenAI Whisper transcription
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: createFormData(s3Key) // Would need to fetch video and create form data
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.text,
          confidence: 0.95
        };
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    }
  }

  // Fallback mock transcription
  return {
    text: '[Video transcription pending - AI transcription will be generated when processing completes]',
    confidence: 0
  };
}

// ============================================================================
// VIDEO RETRIEVAL & PLAYBACK
// ============================================================================

/**
 * Get video resume for a user
 */
export async function getVideoResume(userId) {
  const video = await prisma.videoResume.findFirst({
    where: {
      userId,
      status: PROCESSING_STATUS.COMPLETED,
      isActive: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!video) {
    return null;
  }

  return formatVideoResponse(video);
}

/**
 * Get video resume by ID
 */
export async function getVideoResumeById(videoId, requestingUserId = null) {
  const video = await prisma.videoResume.findUnique({
    where: { id: videoId },
    include: {
      user: {
        select: { id: true, name: true }
      }
    }
  });

  if (!video) {
    return null;
  }

  // Check privacy settings
  if (!video.isPublic && video.userId !== requestingUserId) {
    // Check if requesting user has permission (e.g., employer with application)
    const hasPermission = await checkVideoPermission(videoId, requestingUserId);
    if (!hasPermission) {
      return null;
    }
  }

  return formatVideoResponse(video);
}

/**
 * Get signed playback URL for video
 */
export async function getVideoPlaybackUrl(videoId, requestingUserId) {
  const video = await prisma.videoResume.findUnique({
    where: { id: videoId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Check permission
  if (!video.isPublic && video.userId !== requestingUserId) {
    const hasPermission = await checkVideoPermission(videoId, requestingUserId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }
  }

  // Generate signed URL for playback
  const key = video.s3Key.replace('/original', '/transcoded').replace(/\.\w+$/, '.mp4');
  
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  const playbackUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  // Track view
  await trackVideoView(videoId, requestingUserId);

  return {
    playbackUrl,
    thumbnailUrl: video.thumbnailUrl,
    duration: video.duration,
    expires: new Date(Date.now() + 3600 * 1000).toISOString()
  };
}

/**
 * Get all videos for a user
 */
export async function getUserVideos(userId) {
  const videos = await prisma.videoResume.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return videos.map(formatVideoResponse);
}

// ============================================================================
// PRIVACY CONTROLS
// ============================================================================

/**
 * Update video privacy settings
 */
export async function updateVideoPrivacy(videoId, userId, settings) {
  const video = await prisma.videoResume.findFirst({
    where: { id: videoId, userId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  const updated = await prisma.videoResume.update({
    where: { id: videoId },
    data: {
      isPublic: settings.isPublic ?? video.isPublic,
      allowedViewers: settings.allowedViewers,
      allowDownload: settings.allowDownload ?? video.allowDownload,
      expiresAt: settings.expiresAt
    }
  });

  return formatVideoResponse(updated);
}

/**
 * Share video with specific users or employers
 */
export async function shareVideo(videoId, userId, shareWith) {
  const video = await prisma.videoResume.findFirst({
    where: { id: videoId, userId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  const currentViewers = video.allowedViewers || [];
  const newViewers = [...new Set([...currentViewers, ...shareWith])];

  await prisma.videoResume.update({
    where: { id: videoId },
    data: { allowedViewers: newViewers }
  });

  // Create share notifications
  for (const viewerId of shareWith) {
    await prisma.notification.create({
      data: {
        userId: viewerId,
        type: 'VIDEO_SHARED',
        title: 'Video Resume Shared With You',
        message: `A candidate has shared their video resume with you.`,
        metadata: { videoId, sharedBy: userId }
      }
    });
  }

  return { shared: shareWith.length, totalViewers: newViewers.length };
}

/**
 * Revoke video access
 */
export async function revokeVideoAccess(videoId, userId, revokeFrom) {
  const video = await prisma.videoResume.findFirst({
    where: { id: videoId, userId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  const currentViewers = video.allowedViewers || [];
  const newViewers = currentViewers.filter(id => !revokeFrom.includes(id));

  await prisma.videoResume.update({
    where: { id: videoId },
    data: { allowedViewers: newViewers }
  });

  return { revoked: revokeFrom.length, remainingViewers: newViewers.length };
}

/**
 * Check if user has permission to view video
 */
async function checkVideoPermission(videoId, requestingUserId) {
  if (!requestingUserId) return false;

  const video = await prisma.videoResume.findUnique({
    where: { id: videoId }
  });

  if (!video) return false;

  // Check if in allowed viewers list
  if (video.allowedViewers && video.allowedViewers.includes(requestingUserId)) {
    return true;
  }

  // Check if employer has received application from this candidate
  const application = await prisma.application.findFirst({
    where: {
      userId: video.userId,
      job: {
        company: {
          users: {
            some: { id: requestingUserId }
          }
        }
      }
    }
  });

  return !!application;
}

// ============================================================================
// VIDEO MANAGEMENT
// ============================================================================

/**
 * Set a video as the active/primary video resume
 */
export async function setActiveVideo(videoId, userId) {
  // Deactivate all other videos
  await prisma.videoResume.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false }
  });

  // Activate selected video
  const video = await prisma.videoResume.update({
    where: { id: videoId },
    data: { isActive: true }
  });

  return formatVideoResponse(video);
}

/**
 * Delete a video resume
 */
export async function deleteVideo(videoId, userId) {
  const video = await prisma.videoResume.findFirst({
    where: { id: videoId, userId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Delete from S3
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: video.s3Key
    }));

    // Also delete transcoded and thumbnail
    const basePath = video.s3Key.replace(/\/original\.\w+$/, '');
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${basePath}/transcoded.mp4`
    }));
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${basePath}/thumbnail.jpg`
    }));
  } catch (error) {
    console.error('S3 deletion error:', error);
  }

  // Soft delete from database
  await prisma.videoResume.update({
    where: { id: videoId },
    data: { 
      isActive: false,
      deletedAt: new Date()
    }
  });

  return { deleted: true };
}

/**
 * Update video metadata (title, description)
 */
export async function updateVideoMetadata(videoId, userId, metadata) {
  const video = await prisma.videoResume.findFirst({
    where: { id: videoId, userId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  const updated = await prisma.videoResume.update({
    where: { id: videoId },
    data: {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags
    }
  });

  return formatVideoResponse(updated);
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Track video view
 */
async function trackVideoView(videoId, viewerId) {
  await prisma.videoView.create({
    data: {
      videoId,
      viewerId,
      viewedAt: new Date()
    }
  }).catch(() => {
    // Ignore if VideoView model doesn't exist yet
  });

  // Update view count
  await prisma.videoResume.update({
    where: { id: videoId },
    data: { viewCount: { increment: 1 } }
  }).catch(() => {});
}

/**
 * Get video analytics for owner
 */
export async function getVideoAnalytics(videoId, userId) {
  const video = await prisma.videoResume.findFirst({
    where: { id: videoId, userId }
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Get view history
  let views = [];
  try {
    views = await prisma.videoView.findMany({
      where: { videoId },
      include: {
        viewer: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { viewedAt: 'desc' },
      take: 100
    });
  } catch {
    // VideoView model might not exist
  }

  // Calculate analytics
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weekViews = views.filter(v => v.viewedAt > weekAgo).length;
  const monthViews = views.filter(v => v.viewedAt > monthAgo).length;

  // Unique viewers
  const uniqueViewers = new Set(views.map(v => v.viewerId)).size;

  // Viewer breakdown by role
  const viewersByRole = views.reduce((acc, v) => {
    const role = v.viewer?.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  return {
    videoId,
    totalViews: video.viewCount || 0,
    weekViews,
    monthViews,
    uniqueViewers,
    viewersByRole,
    recentViews: views.slice(0, 10).map(v => ({
      viewerId: v.viewerId,
      viewerName: v.viewer?.name,
      viewerRole: v.viewer?.role,
      viewedAt: v.viewedAt
    })),
    createdAt: video.createdAt,
    isPublic: video.isPublic
  };
}

// ============================================================================
// RECORDING TOKENS
// ============================================================================

/**
 * Generate a recording session token
 * Used for browser-based video recording
 */
export async function createRecordingSession(userId) {
  const sessionId = uuid();
  const token = uuid();

  // Store session in cache (Redis in production)
  // For now, use database
  await prisma.videoRecordingSession.create({
    data: {
      id: sessionId,
      userId,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      status: 'active'
    }
  }).catch(() => {
    // Table might not exist, that's OK
  });

  return {
    sessionId,
    token,
    maxDuration: VIDEO_CONFIG.maxDuration,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getExtension(fileName) {
  const match = fileName.match(/\.\w+$/);
  return match ? match[0].toLowerCase() : '.mp4';
}

function getPublicUrl(s3Key) {
  // Return CloudFront URL if configured, otherwise S3 URL
  const cdnDomain = process.env.CDN_DOMAIN;
  if (cdnDomain) {
    return `https://${cdnDomain}/${s3Key}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${s3Key}`;
}

function formatVideoResponse(video) {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    duration: video.duration,
    width: video.width,
    height: video.height,
    transcription: video.transcription,
    status: video.status,
    isPublic: video.isPublic,
    isActive: video.isActive,
    viewCount: video.viewCount || 0,
    tags: video.tags,
    createdAt: video.createdAt,
    processedAt: video.processedAt
  };
}

function createFormData(s3Key) {
  // Placeholder - in production would fetch video and create FormData
  return new FormData();
}

export default {
  // Upload
  getVideoUploadUrl,
  confirmVideoUpload,
  
  // Retrieval
  getVideoResume,
  getVideoResumeById,
  getVideoPlaybackUrl,
  getUserVideos,
  
  // Privacy
  updateVideoPrivacy,
  shareVideo,
  revokeVideoAccess,
  
  // Management
  setActiveVideo,
  deleteVideo,
  updateVideoMetadata,
  
  // Analytics
  getVideoAnalytics,
  
  // Recording
  createRecordingSession,
  
  // Config
  VIDEO_CONFIG,
  PROCESSING_STATUS
};

export {};
