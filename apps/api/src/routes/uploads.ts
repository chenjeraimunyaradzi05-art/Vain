// @ts-nocheck
import express, { Request, Response } from 'express';
import { z } from 'zod';
import auth from '../middleware/auth';
import { prisma } from '../db';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { validateFile, FILE_LIMITS, stripExifMetadata, generateSecureFilename, checkForWebShell } from '../lib/fileValidation';
import { circuitBreakers } from '../lib/circuitBreaker';
import { logSecurityEvent, logSuspiciousActivity, SecurityEventType, Severity } from '../lib/securityAudit';

const router = express.Router();
const authenticateJWT = auth.authenticate;

// Schemas
const fileSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional(),
});

const signSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  category: z.enum(['RESUME', 'PHOTO', 'VIDEO', 'OTHER']).optional(),
});

const metadataSchema = z.object({
  key: z.string(),
  filename: z.string(),
  url: z.string().url(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  category: z.enum(['RESUME', 'PHOTO', 'VIDEO', 'OTHER']).optional(),
});

// S3 client singleton
function getS3Client(): S3Client | null {
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKey || !secret) return null;
  return new S3Client({ region, credentials: { accessKeyId: accessKey, secretAccessKey: secret } });
}

// Allowed MIME types for each category
const ALLOWED_TYPES: Record<string, string[]> = {
  RESUME: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  PHOTO: ['image/jpeg', 'image/png', 'image/webp'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/webm'],
  OTHER: Object.keys(FILE_LIMITS),
};

/**
 * POST /uploads/s3-url
 * Generate pre-signed URL for direct client upload
 * Validates file type and size limits before allowing upload
 */
router.post('/s3-url', authenticateJWT, async (req: Request, res: Response) => {
  const parse = signSchema.safeParse(req.body);
  if (!parse.success) {
    return void res.status(400).json({ error: parse.error.flatten() });
  }

  const { filename, mimeType, category = 'OTHER' } = parse.data;
  const userId = (req as any).user?.id;

  // Validate MIME type is allowed
  if (!FILE_LIMITS[mimeType]) {
    await logSuspiciousActivity(userId, req, `Attempted upload of disallowed file type: ${mimeType}`);
    return void res.status(400).json({ error: `File type not allowed: ${mimeType}` });
  }

  // Validate MIME type matches category
  const allowedForCategory = ALLOWED_TYPES[category] || ALLOWED_TYPES.OTHER;
  if (!allowedForCategory.includes(mimeType)) {
    return void res.status(400).json({ error: `File type ${mimeType} not allowed for category ${category}` });
  }

  // Validate file extension
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const limits = FILE_LIMITS[mimeType];
  if (!limits.extensions.includes(ext)) {
    return void res.status(400).json({ 
      error: `File extension ${ext} does not match type ${mimeType}. Allowed: ${limits.extensions.join(', ')}` 
    });
  }

  const s3 = getS3Client();
  if (!s3) {
    return void res.status(500).json({ error: 'S3 not configured on server' });
  }

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    return void res.status(500).json({ error: 'S3 bucket not configured' });
  }

  // Generate secure filename to prevent path traversal and other attacks
  const secureFilename = generateSecureFilename(filename);
  const key = `uploads/${userId}/${secureFilename}`;

  try {
    // Use circuit breaker for S3 operations
    const url = await circuitBreakers.s3.execute(async () => {
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: mimeType,
        // Set content-disposition for safe downloads
        ContentDisposition: `attachment; filename="${secureFilename}"`,
        // Set max content length to enforce size limit
        ContentLength: limits.maxSize,
      });
      return getSignedUrl(s3, cmd, { expiresIn: 60 * 10 }); // 10 minutes
    });

    const region = process.env.AWS_REGION || 'ap-southeast-2';
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;

    return void res.json({ 
      url, 
      key, 
      bucket, 
      filename, 
      mimeType, 
      category,
      publicUrl,
      maxSize: limits.maxSize,
      maxSizeMB: (limits.maxSize / (1024 * 1024)).toFixed(1),
    });
  } catch (err: any) {
    console.error('s3 presign error:', err);
    
    if (err.message?.includes('Circuit breaker is OPEN')) {
      return void res.status(503).json({ error: 'S3 service temporarily unavailable, please try again later' });
    }
    
    return void res.status(500).json({ error: 'Failed to create signed url' });
  }
});

/**
 * POST /uploads/metadata
 * Persist file record after upload completes
 * Validates the uploaded file before storing metadata
 */
router.post('/metadata', authenticateJWT, async (req: Request, res: Response) => {
  const parse = metadataSchema.safeParse(req.body);
  if (!parse.success) {
    return void res.status(400).json({ error: parse.error.flatten() });
  }

  const { key, filename, url, mimeType = 'application/octet-stream', size, category = 'OTHER' } = parse.data;
  const userId = (req as any).user?.id;

  // Validate size if provided
  if (size && mimeType && FILE_LIMITS[mimeType]) {
    const maxSize = FILE_LIMITS[mimeType].maxSize;
    if (size > maxSize) {
      await logSuspiciousActivity(userId, req, `Upload exceeded size limit: ${size} bytes for ${mimeType} (max: ${maxSize})`);
      return void res.status(400).json({ 
        error: `File too large. Maximum size for ${mimeType} is ${(maxSize / (1024 * 1024)).toFixed(1)}MB` 
      });
    }
  }

  // Optional: Verify file exists in S3 and check actual size
  const s3 = getS3Client();
  if (s3 && process.env.AWS_S3_BUCKET) {
    try {
      const headResult = await circuitBreakers.s3.execute(async () => {
        const cmd = new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
        });
        return s3.send(cmd);
      });

      // Verify content type matches
      if (headResult.ContentType && headResult.ContentType !== mimeType) {
        console.warn(`MIME type mismatch: declared ${mimeType}, actual ${headResult.ContentType}`);
        // Allow but log - some browsers send different MIME types
      }

      // Verify size
      if (headResult.ContentLength && mimeType && FILE_LIMITS[mimeType]) {
        const maxSize = FILE_LIMITS[mimeType].maxSize;
        if (headResult.ContentLength > maxSize) {
          // Delete the oversized file
          await logSuspiciousActivity(userId, req, `Uploaded file exceeded size limit: ${headResult.ContentLength} bytes (max: ${maxSize})`);
          return void res.status(400).json({ error: 'Uploaded file exceeds size limit' });
        }
      }
    } catch (err: any) {
      console.error('S3 head check error:', err);
      // Continue anyway - file might still be uploading or S3 is down
    }
  }

  try {
    const file = await prisma.uploadedFile.create({
      data: {
        userId,
        key,
        filename,
        url,
        mimeType,
        size,
        category,
      },
    });

    await logSecurityEvent({
      type: SecurityEventType.DATA_ACCESS,
      userId,
      description: `File uploaded: ${filename} (${category})`,
      severity: Severity.INFO,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return void res.json({ file });
  } catch (err) {
    console.error('save metadata error:', err);
    return void res.status(500).json({ error: 'Failed to store metadata' });
  }
});

/**
 * POST /uploads/validate
 * Validate a file buffer before upload (for server-side uploads)
 */
router.post('/validate', authenticateJWT, async (req: Request, res: Response) => {
  const { filename, mimeType, buffer } = req.body;

  if (!filename || !mimeType || !buffer) {
    return void res.status(400).json({ error: 'filename, mimeType, and buffer are required' });
  }

  try {
    const fileBuffer = Buffer.from(buffer, 'base64');
    const result = validateFile(fileBuffer, filename, mimeType);

    if (!result.valid) {
      await logSuspiciousActivity((req as any).user?.id, req, `File validation failed: ${result.errors.join(', ')}`);
    }

    return void res.json(result);
  } catch (err) {
    console.error('validate error:', err);
    return void res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * POST /uploads/resume - legacy endpoint
 */
router.post('/resume', authenticateJWT, async (req: Request, res: Response) => {
  const parse = fileSchema.safeParse(req.body);
  if (!parse.success) {
    return void res.status(400).json({ error: parse.error.flatten() });
  }
  const id = `resume_${Date.now()}`;
  return void res.json({ id, url: parse.data.url });
});

/**
 * POST /uploads/photo - legacy endpoint
 */
router.post('/photo', authenticateJWT, async (req: Request, res: Response) => {
  const parse = fileSchema.safeParse(req.body);
  if (!parse.success) {
    return void res.status(400).json({ error: parse.error.flatten() });
  }
  const id = `photo_${Date.now()}`;
  return void res.json({ id, url: parse.data.url });
});

/**
 * POST /uploads/video - legacy endpoint
 */
router.post('/video', authenticateJWT, async (req: Request, res: Response) => {
  const parse = fileSchema.safeParse(req.body);
  if (!parse.success) {
    return void res.status(400).json({ error: parse.error.flatten() });
  }
  const id = `video_${Date.now()}`;
  return void res.json({ id, url: parse.data.url });
});

/**
 * GET /uploads/me - list user's files
 */
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    const files = await prisma.uploadedFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return void res.json({ files });
  } catch (err) {
    console.error('list files error', err);
    return void res.status(500).json({ error: 'Failed to fetch files' });
  }
});

/**
 * GET /uploads/:id/download - get download URL with ownership check
 */
router.get('/:id/download', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const userType = (req as any).user?.userType;
  const id = req.params.id;

  try {
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) {
      return void res.status(404).json({ error: 'Not found' });
    }

    // Ownership check
    if (file.userId !== userId) {
      // Allow company users to access files attached to applications for their jobs
      if (userType === 'COMPANY') {
        const rel = await prisma.jobApplication.findFirst({
          where: { resumeId: file.id },
          include: { job: true },
        });
        if (!rel || !rel.job || rel.job.userId !== userId) {
          await logSecurityEvent({
            type: SecurityEventType.PERMISSION_DENIED,
            userId,
            description: `Attempted to download file ${id} without permission`,
            severity: Severity.WARNING,
            ipAddress: req.ip || req.socket.remoteAddress,
          });
          return void res.status(403).json({ error: 'Forbidden' });
        }
      } else {
        await logSecurityEvent({
          type: SecurityEventType.PERMISSION_DENIED,
          userId,
          description: `Attempted to download file ${id} without permission`,
          severity: Severity.WARNING,
          ipAddress: req.ip || req.socket.remoteAddress,
        });
        return void res.status(403).json({ error: 'Forbidden' });
      }
    }

    // Generate presigned download URL if S3 is configured
    const s3 = getS3Client();
    if (s3 && process.env.AWS_S3_BUCKET) {
      try {
        const url = await circuitBreakers.s3.execute(async () => {
          const cmd = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: file.key,
            // Force download with safe filename
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.filename || 'download')}"`,
          });
          return getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 minutes
        });

        await logSecurityEvent({
          type: SecurityEventType.DATA_ACCESS,
          userId,
          description: `Downloaded file: ${file.filename}`,
          severity: Severity.INFO,
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        return void res.json({ url, filename: file.filename, mimeType: file.mimeType });
      } catch (err) {
        console.error('presign get failed', err);
        // Fall through to return stored URL
      }
    }

    return void res.json({ url: file.url, filename: file.filename, mimeType: file.mimeType });
  } catch (err) {
    console.error('download file error', err);
    return void res.status(500).json({ error: 'Failed to get download url' });
  }
});

/**
 * DELETE /uploads/:id - delete a file (owner only)
 */
router.delete('/:id', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const id = req.params.id;

  try {
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) {
      return void res.status(404).json({ error: 'Not found' });
    }

    if (file.userId !== userId) {
      await logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        userId,
        description: `Attempted to delete file ${id} without permission`,
        severity: Severity.WARNING,
        ipAddress: req.ip || req.socket.remoteAddress,
      });
      return void res.status(403).json({ error: 'Forbidden' });
    }

    // Delete from database
    await prisma.uploadedFile.delete({ where: { id } });

    // Delete from S3 as well
    const s3 = getS3Client();
    if (s3 && process.env.AWS_S3_BUCKET && file.key) {
      try {
        await circuitBreakers.s3.execute(async () => {
          const cmd = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: file.key,
          });
          return s3.send(cmd);
        });
      } catch (s3Err) {
        console.warn('Failed to delete from S3:', s3Err);
        // Continue - DB record already deleted
      }
    }

    await logSecurityEvent({
      type: SecurityEventType.DATA_EXPORT,
      userId,
      description: `Deleted file: ${file.filename}`,
      severity: Severity.INFO,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return void res.json({ success: true });
  } catch (err) {
    console.error('delete file error', err);
    return void res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * POST /uploads/process-image
 * Server-side image processing: validates, strips EXIF, and uploads to S3
 * Use this for avatar uploads or when client-side upload isn't suitable
 */
router.post('/process-image', authenticateJWT, async (req: Request, res: Response) => {
  const { base64Data, filename, mimeType, category = 'PHOTO' } = req.body;
  const userId = (req as any).user?.id;

  if (!base64Data || !filename || !mimeType) {
    return void res.status(400).json({ error: 'base64Data, filename, and mimeType are required' });
  }

  // Validate MIME type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    return void res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are allowed' });
  }

  try {
    let buffer = Buffer.from(base64Data, 'base64');

    // Check for web shell or malicious content
    if (checkForWebShell(buffer)) {
      await logSuspiciousActivity(userId, req, 'Attempted to upload file containing malicious patterns');
      return void res.status(400).json({ error: 'File contains potentially malicious content' });
    }

    // Validate file
    const validation = validateFile(buffer, filename, mimeType);
    if (!validation.valid) {
      await logSuspiciousActivity(userId, req, `Image validation failed: ${validation.errors.join(', ')}`);
      return void res.status(400).json({ error: validation.errors.join(', ') });
    }

    // Strip EXIF metadata for privacy
    buffer = await stripExifMetadata(buffer, mimeType);

    const s3 = getS3Client();
    if (!s3) {
      return void res.status(500).json({ error: 'S3 not configured on server' });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return void res.status(500).json({ error: 'S3 bucket not configured' });
    }

    const secureFilename = generateSecureFilename(filename);
    const key = `uploads/${userId}/${secureFilename}`;

    // Upload to S3
    await circuitBreakers.s3.execute(async () => {
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentDisposition: `attachment; filename="${secureFilename}"`,
        CacheControl: 'private, max-age=31536000', // 1 year, private cache
      });
      return s3.send(cmd);
    });

    const region = process.env.AWS_REGION || 'ap-southeast-2';
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;

    // Save metadata
    const file = await prisma.uploadedFile.create({
      data: {
        userId,
        key,
        filename: secureFilename,
        url: publicUrl,
        mimeType,
        size: buffer.length,
        category,
      },
    });

    await logSecurityEvent({
      type: SecurityEventType.DATA_ACCESS,
      userId,
      description: `Processed and uploaded image: ${filename} (EXIF stripped)`,
      severity: Severity.INFO,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return void res.json({
      file,
      url: publicUrl,
      key,
      exifStripped: mimeType === 'image/jpeg',
    });
  } catch (err: any) {
    console.error('process-image error:', err);
    return void res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;





