/**
 * File Upload Service
 * 
 * Handles:
 * - File uploads (images, documents, videos)
 * - Cloud storage integration (S3/GCS compatible)
 * - Image processing and optimization
 * - Secure signed URLs
 * - File validation
 * - Storage quota management
 */

import { createHash, randomUUID } from 'crypto';
import path from 'path';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

// Types
export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  key: string;
  url: string;
  thumbnailUrl?: string;
  metadata: FileMetadata;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  checksum?: string;
  [key: string]: unknown;
}

export interface UploadOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  isPublic?: boolean;
  expiresIn?: number; // URL expiration in seconds
  metadata?: Record<string, string>;
}

export interface PresignedUrlRequest {
  filename: string;
  contentType: string;
  size?: number;
  folder?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresAt: Date;
}

// Configuration
const STORAGE_CONFIG = {
  bucket: process.env.S3_BUCKET || 'ngurra-uploads',
  region: process.env.S3_REGION || 'ap-southeast-2',
  accessKeyId: process.env.S3_ACCESS_KEY || '',
  secretAccessKey: process.env.S3_SECRET_KEY || '',
  endpoint: process.env.S3_ENDPOINT || undefined,
  cdnUrl: process.env.CDN_URL || '',
  localPath: process.env.UPLOAD_PATH || './uploads',
};

// File type configurations
const FILE_CONFIGS = {
  image: {
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'images',
  },
  document: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
    folder: 'documents',
  },
  video: {
    allowedTypes: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ],
    maxSize: 500 * 1024 * 1024, // 500MB
    folder: 'videos',
  },
  audio: {
    allowedTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    folder: 'audio',
  },
  avatar: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'avatars',
  },
  resume: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'resumes',
  },
};

class FileUploadService {
  private static instance: FileUploadService;
  private useLocal: boolean;

  private constructor() {
    this.useLocal = !STORAGE_CONFIG.accessKeyId;
    if (this.useLocal) {
      logger.info('Using local file storage (no S3 credentials)');
    }
  }

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  // ==================== Upload Methods ====================

  /**
   * Upload a file from buffer
   */
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    userId: string,
    options: UploadOptions = {}
  ): Promise<UploadedFile> {
    // Validate file
    await this.validateFile(buffer, filename, mimeType, options);

    // Generate unique key
    const fileId = randomUUID();
    const ext = path.extname(filename);
    const folder = options.folder || this.getFolderFromMimeType(mimeType);
    const key = `${folder}/${this.generateDatePath()}/${fileId}${ext}`;

    // Calculate checksum
    const checksum = this.calculateChecksum(buffer);

    // Check for duplicate
    const existingFile = await this.findByChecksum(checksum);
    if (existingFile) {
      logger.info('Duplicate file found', { fileId, existingId: existingFile.id });
      return existingFile;
    }

    // Upload to storage
    const uploadResult = await this.uploadToStorage(buffer, key, mimeType, options);

    // Generate thumbnail if image
    let thumbnailUrl: string | undefined;
    if (options.generateThumbnail && this.isImage(mimeType)) {
      thumbnailUrl = await this.generateThumbnail(buffer, key, options.thumbnailSize);
    }

    // Get image dimensions if applicable
    const metadata: FileMetadata = {
      checksum,
      format: ext.slice(1),
    };

    if (this.isImage(mimeType)) {
      const dimensions = await this.getImageDimensions(buffer);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    }

    // Create file record
    const uploadedFile: UploadedFile = {
      id: fileId,
      originalName: filename,
      mimeType,
      size: buffer.length,
      key,
      url: uploadResult.url,
      thumbnailUrl,
      metadata,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    // Store file reference
    await this.storeFileReference(uploadedFile);

    // Update user storage quota
    await this.updateStorageQuota(userId, buffer.length);

    logger.info('File uploaded', {
      fileId,
      size: buffer.length,
      mimeType,
      userId,
    });

    return uploadedFile;
  }

  /**
   * Generate presigned URL for direct client upload
   */
  async getPresignedUploadUrl(
    userId: string,
    request: PresignedUrlRequest
  ): Promise<PresignedUrlResponse> {
    const fileId = randomUUID();
    const ext = path.extname(request.filename);
    const folder = request.folder || this.getFolderFromMimeType(request.contentType);
    const key = `${folder}/${this.generateDatePath()}/${fileId}${ext}`;

    // Check storage quota
    if (request.size) {
      const hasQuota = await this.checkStorageQuota(userId, request.size);
      if (!hasQuota) {
        throw new Error('Storage quota exceeded');
      }
    }

    // In production, generate actual presigned URL
    // For now, return a mock URL
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    const response: PresignedUrlResponse = {
      uploadUrl: `${this.getBaseUrl()}/upload/${key}?expires=${expiresAt.getTime()}`,
      fileKey: key,
      publicUrl: `${STORAGE_CONFIG.cdnUrl || this.getBaseUrl()}/${key}`,
      expiresAt,
    };

    // Store pending upload info
    await redisCache.set(
      `upload:pending:${key}`,
      {
        userId,
        filename: request.filename,
        contentType: request.contentType,
        size: request.size,
      },
      3600
    );

    return response;
  }

  /**
   * Confirm a presigned upload was completed
   */
  async confirmUpload(
    key: string,
    userId: string
  ): Promise<UploadedFile | null> {
    const pending = await redisCache.get<{
      filename: string;
      contentType: string;
      size?: number;
    }>(`upload:pending:${key}`);

    if (!pending) {
      logger.warn('Pending upload not found', { key });
      return null;
    }

    const fileId = path.basename(key, path.extname(key));
    
    const uploadedFile: UploadedFile = {
      id: fileId,
      originalName: pending.filename,
      mimeType: pending.contentType,
      size: pending.size || 0,
      key,
      url: `${STORAGE_CONFIG.cdnUrl || this.getBaseUrl()}/${key}`,
      metadata: {},
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    await this.storeFileReference(uploadedFile);
    
    if (pending.size) {
      await this.updateStorageQuota(userId, pending.size);
    }

    await redisCache.delete(`upload:pending:${key}`);

    return uploadedFile;
  }

  // ==================== Download/Access Methods ====================

  /**
   * Get a signed URL for file access
   */
  async getSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // In production, generate actual signed URL
    const expiresAt = Date.now() + expiresIn * 1000;
    return `${STORAGE_CONFIG.cdnUrl || this.getBaseUrl()}/${key}?expires=${expiresAt}&signature=${this.generateSignature(key, expiresAt)}`;
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<UploadedFile | null> {
    return redisCache.get<UploadedFile>(`file:${fileId}`);
  }

  /**
   * Get files by user
   */
  async getUserFiles(
    userId: string,
    options: { folder?: string; limit?: number; offset?: number } = {}
  ): Promise<UploadedFile[]> {
    const { folder, limit = 50, offset = 0 } = options;
    
    // In production, query database
    const fileIds = await redisCache.listRange(
      `user:${userId}:files`,
      offset,
      offset + limit - 1
    ) || [];

    const files: UploadedFile[] = [];
    for (const fileId of fileIds) {
      const file = await this.getFile(fileId as string);
      if (file && (!folder || file.key.startsWith(folder))) {
        files.push(file);
      }
    }

    return files;
  }

  // ==================== Delete Methods ====================

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file) {
      return false;
    }

    // Verify ownership
    if (file.uploadedBy !== userId) {
      throw new Error('Unauthorized to delete this file');
    }

    // Delete from storage
    await this.deleteFromStorage(file.key);

    // Delete thumbnail if exists
    if (file.thumbnailUrl) {
      const thumbnailKey = file.key.replace(/\.[^.]+$/, '_thumb.jpg');
      await this.deleteFromStorage(thumbnailKey);
    }

    // Remove file reference
    await redisCache.delete(`file:${fileId}`);
    await redisCache.listRemove(`user:${userId}:files`, fileId);
    
    // Delete checksum reference
    if (file.metadata.checksum) {
      await redisCache.delete(`file:checksum:${file.metadata.checksum}`);
    }

    // Update storage quota
    await this.updateStorageQuota(userId, -file.size);

    logger.info('File deleted', { fileId, userId });

    return true;
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(fileIds: string[], userId: string): Promise<number> {
    let deleted = 0;
    for (const fileId of fileIds) {
      const success = await this.deleteFile(fileId, userId);
      if (success) deleted++;
    }
    return deleted;
  }

  // ==================== Validation ====================

  /**
   * Validate file before upload
   */
  private async validateFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<void> {
    const allowedTypes = options.allowedTypes || this.getAllowedTypes(mimeType);
    const maxSize = options.maxSize || this.getMaxSize(mimeType);

    // Check file type
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Check file size
    if (buffer.length > maxSize) {
      throw new Error(
        `File size ${this.formatBytes(buffer.length)} exceeds maximum ${this.formatBytes(maxSize)}`
      );
    }

    // Validate file extension matches mime type
    const ext = path.extname(filename).toLowerCase();
    if (!this.isValidExtension(ext, mimeType)) {
      throw new Error('File extension does not match content type');
    }

    // Additional security checks could go here
    // e.g., scan for malware, check image headers, etc.
  }

  /**
   * Check if extension matches mime type
   */
  private isValidExtension(ext: string, mimeType: string): boolean {
    const extensionMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
      'application/pdf': ['.pdf'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'audio/mpeg': ['.mp3'],
    };

    const allowedExts = extensionMap[mimeType];
    if (!allowedExts) return true; // Allow if not in map
    return allowedExts.includes(ext);
  }

  // ==================== Storage Quota ====================

  /**
   * Check if user has storage quota
   */
  async checkStorageQuota(userId: string, additionalBytes: number): Promise<boolean> {
    const quota = await this.getUserQuota(userId);
    const used = quota.used + additionalBytes;
    return used <= quota.limit;
  }

  /**
   * Get user storage quota
   */
  async getUserQuota(userId: string): Promise<{ used: number; limit: number }> {
    const used = (await redisCache.get<number>(`user:${userId}:storage`)) || 0;
    const limit = (await redisCache.get<number>(`user:${userId}:storage:limit`)) || 
      1024 * 1024 * 1024; // 1GB default

    return { used, limit };
  }

  /**
   * Update user storage quota
   */
  private async updateStorageQuota(userId: string, bytes: number): Promise<void> {
    await redisCache.increment(`user:${userId}:storage`, bytes);
  }

  /**
   * Set user storage limit
   */
  async setStorageLimit(userId: string, limitBytes: number): Promise<void> {
    await redisCache.set(`user:${userId}:storage:limit`, limitBytes);
  }

  // ==================== Helper Methods ====================

  /**
   * Upload to storage
   */
  private async uploadToStorage(
    buffer: Buffer,
    key: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<{ url: string }> {
    // In production, upload to S3/GCS
    // For development, simulate upload
    const url = `${STORAGE_CONFIG.cdnUrl || this.getBaseUrl()}/${key}`;
    
    logger.debug('File uploaded to storage', { key, size: buffer.length });
    
    return { url };
  }

  /**
   * Delete from storage
   */
  private async deleteFromStorage(key: string): Promise<void> {
    // In production, delete from S3/GCS
    logger.debug('File deleted from storage', { key });
  }

  /**
   * Store file reference
   */
  private async storeFileReference(file: UploadedFile): Promise<void> {
    await redisCache.set(`file:${file.id}`, file);
    await redisCache.listPush(`user:${file.uploadedBy}:files`, file.id);
    
    if (file.metadata.checksum) {
      await redisCache.set(`file:checksum:${file.metadata.checksum}`, file);
    }
  }

  /**
   * Find file by checksum (deduplication)
   */
  private async findByChecksum(checksum: string): Promise<UploadedFile | null> {
    return redisCache.get<UploadedFile>(`file:checksum:${checksum}`);
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(
    buffer: Buffer,
    originalKey: string,
    size: { width: number; height: number } = { width: 200, height: 200 }
  ): Promise<string> {
    // In production, use sharp or similar for image processing
    const thumbnailKey = originalKey.replace(/\.[^.]+$/, '_thumb.jpg');
    const thumbnailUrl = `${STORAGE_CONFIG.cdnUrl || this.getBaseUrl()}/${thumbnailKey}`;
    
    logger.debug('Thumbnail generated', { originalKey, thumbnailKey });
    
    return thumbnailUrl;
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(
    buffer: Buffer
  ): Promise<{ width: number; height: number }> {
    // In production, use sharp or similar
    return { width: 0, height: 0 };
  }

  /**
   * Calculate file checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate signature for URL
   */
  private generateSignature(key: string, expires: number): string {
    const secret = process.env.URL_SIGNING_SECRET || 'dev-secret';
    return createHash('sha256')
      .update(`${key}:${expires}:${secret}`)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Generate date-based path
   */
  private generateDatePath(): string {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get folder from mime type
   */
  private getFolderFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'documents';
  }

  /**
   * Check if mime type is image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Get allowed types for category
   */
  private getAllowedTypes(mimeType: string): string[] {
    for (const config of Object.values(FILE_CONFIGS)) {
      if (config.allowedTypes.includes(mimeType)) {
        return config.allowedTypes;
      }
    }
    return [];
  }

  /**
   * Get max size for category
   */
  private getMaxSize(mimeType: string): number {
    for (const config of Object.values(FILE_CONFIGS)) {
      if (config.allowedTypes.includes(mimeType)) {
        return config.maxSize;
      }
    }
    return 10 * 1024 * 1024; // 10MB default
  }

  /**
   * Get base URL
   */
  private getBaseUrl(): string {
    return process.env.STORAGE_URL || 'http://localhost:3001/uploads';
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Export singleton
export const fileUploadService = FileUploadService.getInstance();

// Export file configurations
export { FILE_CONFIGS };

