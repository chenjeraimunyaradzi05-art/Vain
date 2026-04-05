/**
 * RBAC (Role-Based Access Control) Middleware (Steps 22-25)
 * 
 * Provides middleware for permission-based route protection
 * and resource ownership validation.
 */

import type { Request, Response, NextFunction } from 'express';
import { 
  Permission, 
  hasPermission, 
  requiresOwnershipCheck 
} from '../config/permissions';
import { logSecurityEvent, SecurityEventType, Severity } from '../lib/securityAudit';

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Step 22: Require specific permission(s) to access a route
 * 
 * Usage:
 *   router.post('/jobs', requirePermission('job:create'), createJob);
 *   router.delete('/jobs/:id', requirePermission(['job:delete']), deleteJob);
 */
export function requirePermission(permission: Permission | Permission[]) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return void res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }
    
    const userRole = user.role;
    
    // Check if user has ANY of the required permissions
    const hasRequired = permissions.some(p => hasPermission(userRole, p));
    
    if (!hasRequired) {
      // Log the permission denial
      logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        userId: user.id,
        description: `Permission denied: ${permissions.join(', ')}`,
        metadata: {
          requiredPermissions: permissions,
          userRole,
          path: req.path,
          method: req.method,
        },
        severity: Severity.WARNING,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).requestId,
      });
      
      return void res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: permissions,
      });
    }
    
    // Store required permissions for ownership check middleware
    (req as any).requiredPermissions = permissions;
    
    next();
  };
}

/**
 * Step 25: Resource ownership validation middleware
 * 
 * Validates that the user owns the resource they're trying to access.
 * Must be used after requirePermission middleware.
 * 
 * Usage:
 *   router.put('/jobs/:id', 
 *     requirePermission('job:update'), 
 *     requireOwnership('job', 'id'), 
 *     updateJob
 *   );
 */
export function requireOwnership(
  resourceType: 'job' | 'user' | 'company' | 'application',
  paramName: string = 'id'
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return void res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }
    
    const resourceId = req.params[paramName];
    
    if (!resourceId) {
      return void res.status(400).json({
        error: `Missing resource identifier: ${paramName}`,
        code: 'BAD_REQUEST',
      });
    }
    
    // Admins bypass ownership checks
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return next();
    }
    
    const userId = user.id;
    
    try {
      const isOwner = await checkOwnership(resourceType, resourceId, userId, user.role);
      
      if (!isOwner) {
        logSecurityEvent({
          type: SecurityEventType.PERMISSION_DENIED,
          userId,
          description: `Ownership check failed for ${resourceType}:${resourceId}`,
          metadata: {
            resourceType,
            resourceId,
            userRole: user.role,
            path: req.path,
            method: req.method,
          },
          severity: Severity.WARNING,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: (req as any).requestId,
        });
        
        return void res.status(403).json({
          error: 'You do not have access to this resource',
          code: 'FORBIDDEN',
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if a user owns a specific resource
 */
async function checkOwnership(
  resourceType: string,
  resourceId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  // Lazy load prisma to avoid circular dependencies
  const { prisma } = require('../db');
  
  switch (resourceType) {
    case 'user':
      // Users can only access their own profile
      return resourceId === userId;
    
    case 'job':
      // Companies can access jobs they posted
      const job = await prisma.job.findUnique({
        where: { id: resourceId },
        select: { companyId: true, postedBy: true },
      });
      if (!job) return false;
      
      // Check if user owns the company or posted the job
      if (job.postedBy === userId) return true;
      
      // Check company membership
      if (job.companyId) {
        const companyMember = await prisma.companyMember?.findFirst({
          where: { companyId: job.companyId, userId },
        });
        return !!companyMember;
      }
      return false;
    
    case 'company':
      // Check if user is a member of the company
      const company = await prisma.company?.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });
      if (!company) return false;
      
      if (company.ownerId === userId) return true;
      
      const membership = await prisma.companyMember?.findFirst({
        where: { companyId: resourceId, userId },
      });
      return !!membership;
    
    case 'application':
      // Applicants can view their own applications
      // Companies can view applications to their jobs
      const application = await prisma.application?.findUnique({
        where: { id: resourceId },
        select: { 
          applicantId: true,
          job: { select: { companyId: true, postedBy: true } },
        },
      });
      if (!application) return false;
      
      // Applicant owns their application
      if (application.applicantId === userId) return true;
      
      // Company can view applications to their jobs
      if (application.job) {
        if (application.job.postedBy === userId) return true;
        
        if (application.job.companyId) {
          const companyAccess = await prisma.companyMember?.findFirst({
            where: { companyId: application.job.companyId, userId },
          });
          return !!companyAccess;
        }
      }
      return false;
    
    default:
      return false;
  }
}

/**
 * Step 26: Sudo mode middleware
 * Requires re-authentication for sensitive actions
 */
export function requireSudo(options: { maxAge?: number } = {}) {
  const { maxAge = 5 * 60 * 1000 } = options; // Default: 5 minutes
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return void res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }
    
    // Check for sudo token in header
    const sudoToken = req.headers['x-sudo-token'];
    const sudoTimestamp = req.headers['x-sudo-timestamp'];
    
    if (!sudoToken || !sudoTimestamp) {
      return void res.status(403).json({
        error: 'This action requires re-authentication',
        code: 'SUDO_REQUIRED',
        message: 'Please confirm your password to continue',
      });
    }
    
    // Validate sudo timestamp is recent
    const timestamp = parseInt(sudoTimestamp as string, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > maxAge) {
      return void res.status(403).json({
        error: 'Sudo session expired',
        code: 'SUDO_EXPIRED',
        message: 'Please re-authenticate to continue',
      });
    }
    
    // In a real implementation, verify the sudoToken against a stored hash
    // For now, we trust the timestamp if it's present and recent
    
    next();
  };
}

/**
 * Step 27: Check if request has valid API key with specific permission
 */
export function requireApiKeyPermission(permission: Permission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return next(); // Fall through to regular auth
    }
    
    try {
      const { prisma } = require('../db');
      
      // Hash the API key to compare with stored hash
      const crypto = require('crypto');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const apiKeyRecord = await prisma.apiKey?.findFirst({
        where: {
          keyHash,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });
      
      if (!apiKeyRecord) {
        return void res.status(401).json({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY',
        });
      }
      
      // Step 28: Update lastUsedAt
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      });
      
      // Check if API key has the required permission
      const keyPermissions = apiKeyRecord.permissions || [];
      if (!keyPermissions.includes(permission)) {
        return void res.status(403).json({
          error: 'API key lacks required permission',
          code: 'INSUFFICIENT_API_KEY_PERMISSIONS',
          required: permission,
        });
      }
      
      // Attach user context from API key
      req.user = {
        id: apiKeyRecord.userId,
        userId: apiKeyRecord.userId,
        email: apiKeyRecord.user?.email || '',
        role: apiKeyRecord.user?.userType || 'MEMBER',
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default {
  requirePermission,
  requireOwnership,
  requireSudo,
  requireApiKeyPermission,
};

export {};

