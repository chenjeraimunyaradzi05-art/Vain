// @ts-nocheck
/**
 * Women-Only Space Access Control Middleware (Steps 57-58)
 * 
 * Enforces access control for women-only spaces in the platform.
 * Requires user to have verified women status to access protected routes.
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { logSecurityEvent, SecurityEventType, Severity } from '../lib/securityAudit';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  womenVerification?: {
    isVerified: boolean;
    canAccessWomenSpaces: boolean;
    canAccessFirstNationsSpaces: boolean;
    genderSelfId: string;
    isFirstNations: boolean;
    trustScore: number;
  };
}

/**
 * Check if user has access to women-only spaces
 */
async function getWomenVerification(userId: string) {
  try {
    const verification = await prisma.womenVerification.findUnique({
      where: { userId },
      select: {
        isVerified: true,
        canAccessWomenSpaces: true,
        canAccessFirstNationsSpaces: true,
        genderSelfId: true,
        isFirstNations: true,
        trustScore: true,
      },
    });
    return verification;
  } catch (error) {
    console.error('Error fetching women verification:', error);
    return null;
  }
}

/**
 * Middleware to require women-only space access
 * 
 * Usage:
 *   router.get('/women/forum', authenticate(), requireWomenAccess(), handler);
 */
export function requireWomenAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return void res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const verification = await getWomenVerification(user.id);

    if (!verification) {
      // Log access attempt
      logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        userId: user.id,
        description: 'Attempted to access women-only space without verification',
        metadata: {
          path: req.path,
          method: req.method,
        },
        severity: Severity.INFO,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).requestId,
      });

      return void res.status(403).json({
        error: 'Women-only space access required',
        code: 'WOMEN_VERIFICATION_REQUIRED',
        message: 'Please complete your profile verification to access this space.',
      });
    }

    if (!verification.canAccessWomenSpaces) {
      logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        userId: user.id,
        description: 'Women-only space access denied - not approved',
        metadata: {
          path: req.path,
          method: req.method,
          verificationStatus: verification.isVerified,
        },
        severity: Severity.INFO,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).requestId,
      });

      return void res.status(403).json({
        error: 'Access not approved',
        code: 'WOMEN_ACCESS_NOT_APPROVED',
        message: 'Your access to women-only spaces is pending approval.',
      });
    }

    // Attach verification info to request for downstream use
    req.womenVerification = verification;

    next();
  };
}

/**
 * Middleware to require First Nations space access
 * 
 * Usage:
 *   router.get('/first-nations/community', authenticate(), requireFirstNationsAccess(), handler);
 */
export function requireFirstNationsAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return void res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const verification = await getWomenVerification(user.id);

    if (!verification || !verification.canAccessFirstNationsSpaces) {
      logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        userId: user.id,
        description: 'First Nations space access denied',
        metadata: {
          path: req.path,
          method: req.method,
          hasVerification: !!verification,
        },
        severity: Severity.INFO,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).requestId,
      });

      return void res.status(403).json({
        error: 'First Nations space access required',
        code: 'FIRST_NATIONS_VERIFICATION_REQUIRED',
        message: 'This space is reserved for First Nations community members.',
      });
    }

    req.womenVerification = verification;

    next();
  };
}

/**
 * Optional middleware to attach women verification if available
 * Does not block access, just enriches request with verification data
 * 
 * Usage:
 *   router.get('/profile', authenticate(), attachWomenVerification(), handler);
 */
export function attachWomenVerification() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (user) {
      const verification = await getWomenVerification(user.id);
      if (verification) {
        req.womenVerification = verification;
      }
    }

    next();
  };
}

/**
 * Middleware to require minimum trust score for sensitive actions
 * 
 * Usage:
 *   router.post('/women/moderate', authenticate(), requireWomenAccess(), requireTrustScore(50), handler);
 */
export function requireTrustScore(minScore: number) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const verification = req.womenVerification;

    if (!verification) {
      return void res.status(403).json({
        error: 'Verification required',
        code: 'VERIFICATION_REQUIRED',
      });
    }

    if (verification.trustScore < minScore) {
      return void res.status(403).json({
        error: 'Insufficient trust score',
        code: 'INSUFFICIENT_TRUST_SCORE',
        required: minScore,
        current: verification.trustScore,
        message: 'You need a higher trust score to perform this action.',
      });
    }

    next();
  };
}

export default {
  requireWomenAccess,
  requireFirstNationsAccess,
  attachWomenVerification,
  requireTrustScore,
};


