/**
 * Input Sanitization Utilities
 * 
 * Provides comprehensive input sanitization to prevent XSS, SQL injection,
 * and other injection attacks.
 */

import { z } from 'zod';

/**
 * HTML special characters to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove potential XSS vectors from string
 */
export function sanitizeXss(input: string): string {
  return input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/on\w+\s*=[^\s>]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, '')
    // Remove data: protocol (potential XSS vector) - matches the entire data URL including base64 content
    .replace(/data\s*:[^"'\s>]*/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript\s*:/gi, '')
    // Remove expression() (IE CSS)
    .replace(/expression\s*\([^)]*\)/gi, '');
}

/**
 * Sanitize for SQL (use parameterized queries instead when possible)
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Remove null bytes
 */
export function removeNullBytes(input: string): string {
  return input.replace(/\x00/g, '');
}

/**
 * Sanitize filename for file uploads
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path traversal
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Keep only safe characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Limit length
    .substring(0, 255);
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  // Basic sanitization - remove potentially dangerous characters
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>'"\\]/g, '')
    .substring(0, 254);
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Deep sanitize an object recursively
 */
export function deepSanitize<T extends Record<string, any>>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return removeNullBytes(sanitizeXss(obj)) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize the key as well
    const sanitizedKey = removeNullBytes(key);
    result[sanitizedKey] = deepSanitize(value);
  }

  return result as T;
}

/**
 * Sanitization middleware factory
 */
export function sanitizationMiddleware() {
  return (req: any, _res: any, next: any) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body);
    }

    // Sanitize query params
    if (req.query && typeof req.query === 'object') {
      req.query = deepSanitize(req.query);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = deepSanitize(req.params);
    }

    next();
  };
}

/**
 * Zod refinements for common sanitization patterns
 */
export const sanitizedString = z.string().transform(s => removeNullBytes(sanitizeXss(s)));
export const sanitizedEmail = z.string().email().transform(s => sanitizeEmail(s));
export const sanitizedUrl = z.string().url().transform(s => sanitizeUrl(s) || '');
export const sanitizedFilename = z.string().transform(s => sanitizeFilename(s));

/**
 * Rate limiting configuration based on input analysis
 */
export function analyzeInputRisk(input: string): 'low' | 'medium' | 'high' {
  const patterns = {
    high: [
      /<script/i,
      /on\w+\s*=/i,
      /javascript:/i,
      /union.*select/i,
      /;\s*drop\s+table/i,
      /;\s*delete\s+from/i,
    ],
    medium: [
      /<\/?[a-z]/i,
      /['"].*['"]/,
      /\.\.\//,
    ],
  };

  for (const pattern of patterns.high) {
    if (pattern.test(input)) return 'high';
  }

  for (const pattern of patterns.medium) {
    if (pattern.test(input)) return 'medium';
  }

  return 'low';
}

export {};
