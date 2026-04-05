/**
 * Request Size Limits (Step 56)
 * 
 * Configurable request size limits to prevent:
 * - Memory exhaustion attacks
 * - Denial of service via large payloads
 * - Slowloris-style attacks
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface SizeLimitConfig {
  /** Maximum JSON body size (default: 1MB) */
  jsonLimit: string | number;
  /** Maximum URL-encoded body size (default: 1MB) */
  urlencodedLimit: string | number;
  /** Maximum raw body size (default: 5MB) */
  rawLimit: string | number;
  /** Maximum text body size (default: 1MB) */
  textLimit: string | number;
  /** Maximum file upload size (default: 10MB) */
  fileLimit: string | number;
}

const DEFAULT_LIMITS: SizeLimitConfig = {
  jsonLimit: '1mb',
  urlencodedLimit: '1mb',
  rawLimit: '5mb',
  textLimit: '1mb',
  fileLimit: '10mb',
};

/** Path-specific size overrides */
const PATH_OVERRIDES: Record<string, Partial<SizeLimitConfig>> = {
  '/api/files/upload': { jsonLimit: '50mb', fileLimit: '50mb' },
  '/api/resumes': { jsonLimit: '10mb', fileLimit: '10mb' },
  '/api/photos': { jsonLimit: '10mb', fileLimit: '10mb' },
  // Stricter limits for auth endpoints
  '/api/auth/login': { jsonLimit: '10kb' },
  '/api/auth/register': { jsonLimit: '100kb' },
  '/api/auth/forgot-password': { jsonLimit: '10kb' },
};

/**
 * Parse size string to bytes
 */
function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;
  
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 1024 * 1024; // Default 1MB
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

/**
 * Get limit for a specific path
 */
function getLimitForPath(path: string, limitType: keyof SizeLimitConfig): number {
  for (const [pattern, overrides] of Object.entries(PATH_OVERRIDES)) {
    if (path.startsWith(pattern)) {
      const override = overrides[limitType];
      if (override !== undefined) {
        return parseSize(override);
      }
    }
  }
  
  return parseSize(DEFAULT_LIMITS[limitType]);
}

/**
 * Request size check middleware
 */
export function requestSizeLimit(options: Partial<SizeLimitConfig> = {}) {
  const config = { ...DEFAULT_LIMITS, ...options };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const contentType = req.headers['content-type'] || '';
    
    // Determine appropriate limit based on content type
    let limitType: keyof SizeLimitConfig = 'rawLimit';
    
    if (contentType.includes('application/json')) {
      limitType = 'jsonLimit';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      limitType = 'urlencodedLimit';
    } else if (contentType.includes('text/')) {
      limitType = 'textLimit';
    } else if (contentType.includes('multipart/form-data')) {
      limitType = 'fileLimit';
    }
    
    const limit = getLimitForPath(req.path, limitType);
    
    if (contentLength > limit) {
      logger.warn('Request size exceeded limit', {
        path: req.path,
        contentLength,
        limit,
        limitType,
        ip: req.ip,
      });
      
      res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds the maximum allowed size of ${formatSize(limit)}`,
        limit: formatSize(limit),
      });
      return;
    }
    
    next();
  };
}

/**
 * Format bytes to human-readable string
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Streaming size check for large uploads
 */
export function streamingSizeLimit(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    let received = 0;
    
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      
      if (received > maxSize) {
        logger.warn('Streaming request size exceeded limit', {
          path: req.path,
          received,
          maxSize,
          ip: req.ip,
        });
        
        req.destroy();
        res.status(413).json({
          error: 'Payload Too Large',
          message: 'Upload size exceeded during streaming',
        });
      }
    });
    
    next();
  };
}

export {
  DEFAULT_LIMITS,
  PATH_OVERRIDES,
  parseSize,
  formatSize,
  getLimitForPath,
};

export default {
  requestSizeLimit,
  streamingSizeLimit,
  DEFAULT_LIMITS,
  PATH_OVERRIDES,
};

export {};
