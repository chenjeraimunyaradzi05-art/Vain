/**
 * Middleware Module Index
 * 
 * Central export for all middleware.
 */

// Request logging
export { requestLogger, devLogger } from './requestLogger';


// Role-Based Access Control (Steps 21-30)
export {
  requirePermission,
  requireOwnership,
  requireSudo,
  requireApiKeyPermission,
} from './rbac';

// Women-Only Space Access Control (Steps 57-58)
export {
  requireWomenAccess,
  requireFirstNationsAccess,
  attachWomenVerification,
  requireTrustScore,
} from './womenOnly';

// Security
export {
  blockScanners,
  validateContentType,
  sanitizeInput as securitySanitize,
} from './security';

// Rate Limiting
export { limiters } from './rateLimit';

// Advanced Rate Limiting
export { 
  rateLimiter, 
  defaultRateLimiter,
  strictRateLimiter,
  relaxedRateLimiter,
  uploadRateLimiter,
} from './rateLimiting';

// Caching
export { cacheMiddleware } from './cache';

// Re-export default modules
export { default as requestLoggerMiddleware } from './requestLogger';
export { default as rbacMiddleware } from './rbac';
export { default as womenOnlyMiddleware } from './womenOnly';

export {};

