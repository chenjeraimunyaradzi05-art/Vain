/**
 * File Upload Utilities
 * 
 * Utilities for handling file uploads, validation, and processing
 */

import { BadRequestError } from './errors';
import { sanitizeFilename as sanitizeFilenameSecurity } from './sanitize';

/**
 * Sanitize filename for URL-friendly, readable filenames
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Collapse multiple hyphens
 * - Remove leading/trailing hyphens
 * - Remove unicode/non-ASCII characters
 */
export function sanitizeFilename(filename: string): string {
  // Split into name and extension
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : '';
  
  const sanitized = name
    // Lowercase
    .toLowerCase()
    // Remove unicode characters (non-ASCII)
    .replace(/[^\x00-\x7F]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters (keep alphanumeric, hyphens, dots)
    .replace(/[^a-z0-9-]/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, 200);
  
  return sanitized + ext.toLowerCase();
}

/**
 * Allowed file types configuration
 */
export const ALLOWED_FILE_TYPES = {
  resume: {
    extensions: ['.pdf', '.doc', '.docx'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  avatar: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
};

type FileType = keyof typeof ALLOWED_FILE_TYPES;

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file by type
 */
export function validateFile(
  file: {
    originalname: string;
    mimetype: string;
    size: number;
  },
  type: FileType
): FileValidationResult {
  const config = ALLOWED_FILE_TYPES[type];
  
  if (!config) {
    return { valid: false, error: 'Invalid file type category' };
  }
  
  // Check file extension
  const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
  if (!config.extensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${config.extensions.join(', ')}`,
    };
  }
  
  // Check MIME type
  if (!config.mimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${config.mimeTypes.join(', ')}`,
    };
  }
  
  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = config.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalname: string): string {
  const ext = originalname.split('.').pop() || '';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Generate upload path based on file type
 */
export function generateUploadPath(type: FileType, userId?: string): string {
  const datePath = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  const userPath = userId || 'anonymous';
  return `uploads/${type}/${datePath}/${userPath}`;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'text/plain': 'txt',
  };
  
  return mimeToExt[mimeType] || 'bin';
}

/**
 * Calculate file hash for deduplication
 */
export async function calculateFileHash(buffer: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check if file is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a document
 */
export function isDocument(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  return documentTypes.includes(mimeType);
}

/**
 * Generate presigned URL for S3 upload
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300
): Promise<{ uploadUrl: string; fileUrl: string }> {
  // This would use AWS SDK in production
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  
  if (!bucket) {
    throw new BadRequestError('S3 bucket not configured');
  }
  
  // In a real implementation:
  // const s3 = new S3Client({ region });
  // const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  // const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  
  const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  
  return {
    uploadUrl: `${fileUrl}?presigned=true`, // Placeholder
    fileUrl,
  };
}

/**
 * Generate presigned URL for S3 download
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  
  if (!bucket) {
    throw new BadRequestError('S3 bucket not configured');
  }
  
  // In a real implementation:
  // const s3 = new S3Client({ region });
  // const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  // return await getSignedUrl(s3, command, { expiresIn });
  
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}?presigned=true`;
}

export default {
  ALLOWED_FILE_TYPES,
  validateFile,
  generateUniqueFilename,
  generateUploadPath,
  getExtensionFromMime,
  sanitizeFilename,
  calculateFileHash,
  isImage,
  isDocument,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
};

export {};
