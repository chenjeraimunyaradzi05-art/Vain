/**
 * Video Service
 * 
 * Handles:
 * - Video upload and validation
 * - Video transcoding (multiple qualities)
 * - HLS streaming generation
 * - Thumbnail generation
 * - Video metadata extraction
 * - CDN integration
 * - Live streaming support
 */

import { prisma } from '../db';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';
import crypto from 'crypto';
import path from 'path';

// Video quality presets
export interface VideoQuality {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  audioRate: number;
}

export const VIDEO_QUALITIES: VideoQuality[] = [
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioRate: 192 },
  { name: '720p', width: 1280, height: 720, bitrate: '2500k', audioRate: 128 },
  { name: '480p', width: 854, height: 480, bitrate: '1000k', audioRate: 96 },
  { name: '360p', width: 640, height: 360, bitrate: '600k', audioRate: 64 },
];

// Configuration
const CONFIG = {
  maxUploadSize: 500 * 1024 * 1024, // 500MB
  maxDuration: 30 * 60, // 30 minutes
  allowedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  thumbnailCount: 3,
  hlsSegmentDuration: 6, // seconds
  cdnBaseUrl: process.env.CDN_BASE_URL || 'https://cdn.ngurra.com',
  storagePath: process.env.VIDEO_STORAGE_PATH || '/storage/videos',
};

// Types
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  frameRate: number;
  audioCodec?: string;
  audioChannels?: number;
}

export interface VideoUpload {
  id: string;
  userId: string;
  originalFilename: string;
  status: VideoStatus;
  metadata?: VideoMetadata;
  qualities: VideoQualityOutput[];
  thumbnails: string[];
  hlsPlaylistUrl?: string;
  createdAt: Date;
  processedAt?: Date;
}

export type VideoStatus = 
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'transcoding'
  | 'ready'
  | 'failed';

export interface VideoQualityOutput {
  quality: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
  fileSize?: number;
}

export interface TranscodingJob {
  id: string;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  quality: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface LiveStream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'ended';
  streamKey: string;
  rtmpUrl: string;
  hlsUrl?: string;
  viewerCount: number;
  startedAt?: Date;
  endedAt?: Date;
  recordingUrl?: string;
}

class VideoService {
  private static instance: VideoService;
  private transcodingQueue: Map<string, TranscodingJob> = new Map();
  private liveStreams: Map<string, LiveStream> = new Map();

  private constructor() {}

  static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  /**
   * Initialize video upload
   */
  async initializeUpload(
    userId: string,
    filename: string,
    fileSize: number,
    mimeType: string
  ): Promise<{
    uploadId: string;
    uploadUrl: string;
    expiresAt: Date;
  }> {
    // Validate file
    const extension = path.extname(filename).toLowerCase().slice(1);
    if (!CONFIG.allowedFormats.includes(extension)) {
      throw new Error(`Invalid file format. Allowed: ${CONFIG.allowedFormats.join(', ')}`);
    }

    if (fileSize > CONFIG.maxUploadSize) {
      throw new Error(`File too large. Maximum size: ${CONFIG.maxUploadSize / 1024 / 1024}MB`);
    }

    // Generate upload ID
    const uploadId = this.generateId('upload');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create video record
    const video: VideoUpload = {
      id: uploadId,
      userId,
      originalFilename: filename,
      status: 'pending',
      qualities: [],
      thumbnails: [],
      createdAt: new Date()
    };

    // Store in cache
    await redisCache.set(`video:upload:${uploadId}`, video, 3600);

    // Generate signed upload URL (in production, use S3/GCS presigned URL)
    const uploadUrl = `${CONFIG.cdnBaseUrl}/upload/${uploadId}?expires=${expiresAt.getTime()}`;

    logger.info('Video upload initialized', {
      uploadId,
      userId,
      filename,
      fileSize
    });

    return {
      uploadId,
      uploadUrl,
      expiresAt
    };
  }

  /**
   * Handle upload completion
   */
  async completeUpload(uploadId: string): Promise<VideoUpload> {
    const video = await redisCache.get<VideoUpload>(`video:upload:${uploadId}`);
    if (!video) {
      throw new Error('Upload not found');
    }

    // Update status
    video.status = 'processing';
    await redisCache.set(`video:upload:${uploadId}`, video, 86400);

    // Queue for processing
    await this.queueProcessing(uploadId);

    logger.info('Video upload completed, processing started', { uploadId });

    return video;
  }

  /**
   * Queue video for processing
   */
  private async queueProcessing(videoId: string): Promise<void> {
    // In production, this would use a job queue like Bull
    // For now, simulate async processing

    // 1. Extract metadata
    await this.extractMetadata(videoId);

    // 2. Generate thumbnails
    await this.generateThumbnails(videoId);

    // 3. Transcode to multiple qualities
    await this.startTranscoding(videoId);
  }

  /**
   * Extract video metadata
   */
  private async extractMetadata(videoId: string): Promise<VideoMetadata> {
    const video = await redisCache.get<VideoUpload>(`video:upload:${videoId}`);
    if (!video) {
      throw new Error('Video not found');
    }

    // In production, use FFprobe to extract metadata
    // const command = `ffprobe -v quiet -print_format json -show_format -show_streams ${inputPath}`;

    // Simulated metadata
    const metadata: VideoMetadata = {
      duration: 120, // 2 minutes
      width: 1920,
      height: 1080,
      codec: 'h264',
      bitrate: 5000000,
      frameRate: 30,
      audioCodec: 'aac',
      audioChannels: 2
    };

    // Validate duration
    if (metadata.duration > CONFIG.maxDuration) {
      video.status = 'failed';
      await redisCache.set(`video:upload:${videoId}`, video, 86400);
      throw new Error(`Video too long. Maximum duration: ${CONFIG.maxDuration / 60} minutes`);
    }

    video.metadata = metadata;
    await redisCache.set(`video:upload:${videoId}`, video, 86400);

    logger.info('Video metadata extracted', { videoId, metadata });

    return metadata;
  }

  /**
   * Generate thumbnails from video
   */
  private async generateThumbnails(videoId: string): Promise<string[]> {
    const video = await redisCache.get<VideoUpload>(`video:upload:${videoId}`);
    if (!video || !video.metadata) {
      throw new Error('Video not found or metadata missing');
    }

    const thumbnails: string[] = [];
    const duration = video.metadata.duration;

    // Generate thumbnails at different timestamps
    const timestamps = [
      Math.floor(duration * 0.1),
      Math.floor(duration * 0.5),
      Math.floor(duration * 0.9)
    ];

    for (let i = 0; i < timestamps.length; i++) {
      // In production, use FFmpeg:
      // const command = `ffmpeg -ss ${timestamp} -i ${inputPath} -vframes 1 -q:v 2 ${outputPath}`;

      const thumbnailUrl = `${CONFIG.cdnBaseUrl}/thumbnails/${videoId}/thumb_${i}.jpg`;
      thumbnails.push(thumbnailUrl);
    }

    video.thumbnails = thumbnails;
    await redisCache.set(`video:upload:${videoId}`, video, 86400);

    logger.info('Thumbnails generated', { videoId, count: thumbnails.length });

    return thumbnails;
  }

  /**
   * Start transcoding to multiple qualities
   */
  private async startTranscoding(videoId: string): Promise<void> {
    const video = await redisCache.get<VideoUpload>(`video:upload:${videoId}`);
    if (!video || !video.metadata) {
      throw new Error('Video not found or metadata missing');
    }

    video.status = 'transcoding';
    await redisCache.set(`video:upload:${videoId}`, video, 86400);

    // Determine which qualities to transcode based on source resolution
    const sourceHeight = video.metadata.height;
    const qualitiesToTranscode = VIDEO_QUALITIES.filter(q => q.height <= sourceHeight);

    // Create transcoding jobs
    for (const quality of qualitiesToTranscode) {
      const job: TranscodingJob = {
        id: this.generateId('transcode'),
        videoId,
        status: 'queued',
        progress: 0,
        quality: quality.name
      };

      this.transcodingQueue.set(job.id, job);

      // Simulate transcoding (in production, use FFmpeg)
      this.simulateTranscoding(job, quality, video);
    }

    // Generate HLS playlist
    await this.generateHLSPlaylist(videoId);

    logger.info('Transcoding started', { 
      videoId, 
      qualities: qualitiesToTranscode.map(q => q.name) 
    });
  }

  /**
   * Simulate transcoding process
   */
  private async simulateTranscoding(
    job: TranscodingJob,
    quality: VideoQuality,
    video: VideoUpload
  ): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date();

    // Simulate progress (in production, read from FFmpeg output)
    const simulateProgress = async () => {
      for (let progress = 0; progress <= 100; progress += 10) {
        job.progress = progress;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    await simulateProgress();

    // Mark as completed
    job.status = 'completed';
    job.completedAt = new Date();

    // Add quality output
    const qualityOutput: VideoQualityOutput = {
      quality: quality.name,
      url: `${CONFIG.cdnBaseUrl}/videos/${video.id}/${quality.name}.mp4`,
      width: quality.width,
      height: quality.height,
      bitrate: parseInt(quality.bitrate)
    };

    video.qualities.push(qualityOutput);

    // Check if all transcoding is complete
    const allJobs = Array.from(this.transcodingQueue.values())
      .filter(j => j.videoId === video.id);
    const allComplete = allJobs.every(j => j.status === 'completed');

    if (allComplete) {
      video.status = 'ready';
      video.processedAt = new Date();
      logger.info('Video processing complete', { videoId: video.id });
    }

    await redisCache.set(`video:upload:${video.id}`, video, 86400);
  }

  /**
   * Generate HLS playlist
   */
  private async generateHLSPlaylist(videoId: string): Promise<string> {
    const video = await redisCache.get<VideoUpload>(`video:upload:${videoId}`);
    if (!video) {
      throw new Error('Video not found');
    }

    // In production, generate master playlist and segment playlists
    // ffmpeg -i input.mp4 -c:v libx264 -c:a aac -hls_time 6 -hls_list_size 0 output.m3u8

    const hlsUrl = `${CONFIG.cdnBaseUrl}/hls/${videoId}/master.m3u8`;
    video.hlsPlaylistUrl = hlsUrl;
    await redisCache.set(`video:upload:${videoId}`, video, 86400);

    // Example master playlist content:
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
${CONFIG.cdnBaseUrl}/hls/${videoId}/1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
${CONFIG.cdnBaseUrl}/hls/${videoId}/720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
${CONFIG.cdnBaseUrl}/hls/${videoId}/480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=640x360
${CONFIG.cdnBaseUrl}/hls/${videoId}/360p.m3u8`;

    logger.info('HLS playlist generated', { videoId, hlsUrl });

    return hlsUrl;
  }

  /**
   * Get video by ID
   */
  async getVideo(videoId: string): Promise<VideoUpload | null> {
    const video = await redisCache.get<VideoUpload>(`video:upload:${videoId}`);
    return video;
  }

  /**
   * Get transcoding status
   */
  async getTranscodingStatus(videoId: string): Promise<TranscodingJob[]> {
    return Array.from(this.transcodingQueue.values())
      .filter(job => job.videoId === videoId);
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId: string, userId: string): Promise<boolean> {
    const video = await this.getVideo(videoId);
    if (!video) {
      return false;
    }

    if (video.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Delete from storage (in production, delete from S3/GCS)
    // await s3.deleteObject({ Bucket: 'videos', Key: videoId });

    // Delete from cache
    await redisCache.delete(`video:upload:${videoId}`);

    logger.info('Video deleted', { videoId, userId });

    return true;
  }

  // ==================== Live Streaming ====================

  /**
   * Create live stream
   */
  async createLiveStream(
    userId: string,
    title: string,
    description?: string,
    scheduledFor?: Date
  ): Promise<LiveStream> {
    const streamId = this.generateId('stream');
    const streamKey = this.generateStreamKey();

    const stream: LiveStream = {
      id: streamId,
      userId,
      title,
      description,
      status: scheduledFor ? 'scheduled' : 'live',
      streamKey,
      rtmpUrl: `rtmp://live.ngurra.com/stream/${streamKey}`,
      viewerCount: 0
    };

    this.liveStreams.set(streamId, stream);

    logger.info('Live stream created', { streamId, userId, title });

    return stream;
  }

  /**
   * Start live stream
   */
  async startLiveStream(streamId: string): Promise<LiveStream> {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    stream.status = 'live';
    stream.startedAt = new Date();
    stream.hlsUrl = `${CONFIG.cdnBaseUrl}/live/${streamId}/index.m3u8`;

    logger.info('Live stream started', { streamId });

    return stream;
  }

  /**
   * End live stream
   */
  async endLiveStream(streamId: string): Promise<LiveStream> {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    stream.recordingUrl = `${CONFIG.cdnBaseUrl}/recordings/${streamId}/replay.mp4`;

    logger.info('Live stream ended', { 
      streamId, 
      duration: stream.endedAt.getTime() - (stream.startedAt?.getTime() || 0)
    });

    return stream;
  }

  /**
   * Update viewer count
   */
  async updateViewerCount(streamId: string, delta: number): Promise<number> {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    stream.viewerCount = Math.max(0, stream.viewerCount + delta);
    return stream.viewerCount;
  }

  /**
   * Get live stream
   */
  getLiveStream(streamId: string): LiveStream | undefined {
    return this.liveStreams.get(streamId);
  }

  /**
   * Get all active live streams
   */
  getActiveLiveStreams(): LiveStream[] {
    return Array.from(this.liveStreams.values())
      .filter(stream => stream.status === 'live');
  }

  // ==================== Utilities ====================

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generate stream key
   */
  private generateStreamKey(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get video stats
   */
  async getVideoStats(videoId: string): Promise<{
    views: number;
    watchTime: number;
    likes: number;
    shares: number;
    averageWatchPercentage: number;
  }> {
    // In production, aggregate from analytics database
    return {
      views: 0,
      watchTime: 0,
      likes: 0,
      shares: 0,
      averageWatchPercentage: 0
    };
  }

  /**
   * Record view
   */
  async recordView(
    videoId: string,
    userId?: string,
    watchDuration?: number
  ): Promise<void> {
    logger.info('Video view recorded', { videoId, userId, watchDuration });
    // In production, save to analytics table
  }
}

// Export singleton instance
export const videoService = VideoService.getInstance();

