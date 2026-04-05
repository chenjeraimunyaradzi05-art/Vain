"use strict";
/**
 * Security Middleware
 * 
 * Additional security measures for the API:
 * - Input sanitization (using xss library for HTML/script filtering)
 * - Request ID tracking
 * - Security headers
 * - Suspicious activity detection (defense-in-depth, not sole protection)
 * 
 * SECURITY NOTES:
 * 1. SQL Injection: Protected by Prisma's parameterized queries (primary defense)
 * 2. XSS: Protected by xss library sanitization + client-side DOMPurify
 * 3. Pattern Detection: Defense-in-depth layer, not bypass-proof
 */

import { v4 as uuidv4 } from 'uuid';
import { filterXSS } from 'xss';
import { logger } from '../lib/logger';
import { audit } from '../lib/auditLog';

// XSS filter configuration for rich-text fields
const xssOptions = {
  whiteList: {
    // Allow basic formatting tags for rich-text content
    a: ['href', 'title', 'target', 'rel'],
    b: [],
    i: [],
    u: [],
    strong: [],
    em: [],
    p: [],
    br: [],
    ul: [],
    ol: [],
    li: [],
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
    blockquote: [],
    code: [],
    pre: [],
  },
  stripIgnoreTag: true, // Strip tags not in whitelist
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'], // Remove these entirely
  onTagAttr: (tag, name, value) => {
    // Extra safety: validate href attributes
    if (name === 'href') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue.startsWith('javascript:') || lowerValue.startsWith('data:')) {
        return ''; // Remove dangerous hrefs
      }
    }
    // Force target="_blank" links to have rel="noopener noreferrer"
    if (tag === 'a' && name === 'rel') {
      return 'rel="noopener noreferrer"';
    }
  },
};

/**
 * Add request ID for tracing
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

/**
 * Detect and log suspicious activity patterns
 * 
 * ⚠️ IMPORTANT: This is a DEFENSE-IN-DEPTH measure, not the primary protection.
 * - SQL Injection: Primary defense is Prisma's parameterized queries
 * - XSS: Primary defense is input sanitization + output encoding
 * - These patterns catch obvious attacks and provide audit logging
 * 
 * Note: Rate limiting is now handled by Redis-based middleware.
 */
function suspiciousActivityDetector(options: any = {}) {
  const {
    // Patterns to watch for (obvious attack signatures)
    suspiciousPatterns = [
      /(\.\.|\/\/|\.\.\/)/i, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /eval\s*\(/i, // Code injection
      /javascript:/i, // JavaScript protocol
      /on\w+\s*=/i, // Event handlers
    ]
  } = options;

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Check URL and body for suspicious patterns
    const urlToCheck = req.originalUrl || req.url;
    const bodyString = JSON.stringify(req.body || {});
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(urlToCheck) || pattern.test(bodyString)) {
        logger.warn('Suspicious: Pattern detected', {
          ip,
          pattern: pattern.toString(),
          path: req.path,
          userId: req.user?.id
        });

        audit.suspiciousActivity(
          req.user?.id || null,
          'suspicious_pattern',
          req,
          { pattern: pattern.toString() }
        );

        // Block the request
        return void res.status(400).json({ 
          error: 'Invalid request' 
        });
      }
    }

    next();
  };
}

/**
 * Sanitize common input fields
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  next();
}

function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return; // Prevent deep recursion

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Trim whitespace
      let sanitized = value.trim();
      
      // Remove null bytes
      sanitized = sanitized.replace(/\0/g, '');
      
      // XSS Sanitization
      sanitized = filterXSS(sanitized, xssOptions);

      obj[key] = sanitized;
      
      // Limit very long strings (except specific fields)
      const allowLongFields = ['description', 'content', 'bio', 'coverLetter', 'body'];
      if (!allowLongFields.includes(key) && obj[key].length > 10000) {
        obj[key] = obj[key].substring(0, 10000);
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value, depth + 1);
    }
  }
}

/**
 * CORS preflight cache
 */
function corsPreflightCache(maxAge = 86400) {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', maxAge);
    }
    next();
  };
}

/**
 * Block common vulnerability scanners
 */
function blockScanners(req, res, next) {
  const blockedPaths = [
    '/wp-admin',
    '/wp-login',
    '/wordpress',
    '/.env',
    '/config.php',
    '/admin.php',
    '/phpmyadmin',
    '/.git',
    '/actuator',
    '/server-status'
  ];

  const path = req.path.toLowerCase();
  
  for (const blocked of blockedPaths) {
    if (path.includes(blocked)) {
      logger.info('Blocked scanner request', {
        path: req.path,
        ip: req.ip
      });
      return void res.status(404).send('Not Found');
    }
  }

  next();
}

/**
 * Add security response headers
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

/**
 * Validate content type for POST/PUT/PATCH
 */
function validateContentType(req, res, next) {
  const methodsRequiringBody = ['POST', 'PUT', 'PATCH'];
  
  if (methodsRequiringBody.includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    // Skip for form data and webhooks
    if (req.path.includes('/webhook') || req.path.includes('/upload')) {
      return next();
    }
    
    // Require JSON for API requests
    if (!contentType?.includes('application/json')) {
      // Allow empty bodies
      if (req.headers['content-length'] === '0') {
        return next();
      }
      
      return void res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json'
      });
    }
  }
  
  next();
}

/**
 * Rate limit by user ID for authenticated routes
 */
function perUserRateLimit(maxRequests = 100, windowMs = 60000) {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return next();
    }

    const now = Date.now();
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }
    
    const requests = userRequests.get(userId);
    requests.push(now);
    
    // Clean old entries
    const cutoff = now - windowMs;
    while (requests.length > 0 && requests[0] < cutoff) {
      requests.shift();
    }

    if (requests.length > maxRequests) {
      audit.rateLimitExceeded(userId, req.path, req);
      
      return void res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    next();
  };
}

export {
  requestIdMiddleware,
  suspiciousActivityDetector,
  sanitizeInput,
  corsPreflightCache,
  blockScanners,
  securityHeaders,
  validateContentType,
  perUserRateLimit
};


