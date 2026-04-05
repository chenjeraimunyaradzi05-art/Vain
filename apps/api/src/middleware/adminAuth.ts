import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db';

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        // Compare against self to maintain constant time
        crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Admin authentication middleware.
 * 
 * This middleware checks if the authenticated user has admin privileges.
 * It should be used AFTER the regular auth middleware.
 * 
 * Admin access is granted if:
 * 1. User has userType 'ADMIN' or 'GOVERNMENT' in the database
 * 2. Request includes valid ADMIN_API_KEY header (for API access)
 */

/**
 * Check if user has admin privileges (ADMIN or GOVERNMENT userType)
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        // Check for API key access (for system integrations) - timing-safe comparison
        const adminApiKey = process.env.ADMIN_API_KEY;
        const providedKey = req.headers['x-admin-key'] as string;
        if (adminApiKey && providedKey && timingSafeEqual(providedKey, adminApiKey)) {
            (req as any).isApiKeyAuth = true;
            return next();
        }

        // Must have authenticated user
        if (!(req as any).user || !(req as any).user.id) {
            return void res.status(401).json({ error: 'Authentication required' });
        }

        // Fetch full user from database to get userType
        const user = await prisma.user.findUnique({
            where: { id: (req as any).user.id },
            select: { 
                id: true, 
                email: true, 
                userType: true
            }
        });

        if (!user) {
            return void res.status(401).json({ error: 'User not found' });
        }

        // Check for admin privileges
        const adminTypes = ['ADMIN', 'GOVERNMENT'];
        if (!adminTypes.includes(user.userType)) {
            return void res.status(403).json({ error: 'Admin access required' });
        }

        // Attach full user info to request
        (req as any).user = {
            ...(req as any).user,
            userType: user.userType,
            isAdmin: true,
            isSuperAdmin: user.userType === 'ADMIN'
        };

        return next();
    } catch (err) {
        console.error('Admin auth middleware error:', err);
        return void res.status(500).json({ error: 'Server error during authorization' });
    }
}

/**
 * Check if user has super admin privileges (ADMIN userType only)
 * Use this for sensitive operations like user deletion, system config, etc.
 */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        // Super admin API key check - timing-safe comparison
        const superAdminApiKey = process.env.SUPER_ADMIN_API_KEY;
        const providedKey = req.headers['x-super-admin-key'] as string;
        if (superAdminApiKey && providedKey && timingSafeEqual(providedKey, superAdminApiKey)) {
            (req as any).isApiKeyAuth = true;
            (req as any).isSuperAdmin = true;
            return next();
        }

        // Must have authenticated user
        if (!(req as any).user || !(req as any).user.id) {
            return void res.status(401).json({ error: 'Authentication required' });
        }

        // Fetch full user from database
        const user = await prisma.user.findUnique({
            where: { id: (req as any).user.id },
            select: { 
                id: true, 
                email: true, 
                userType: true
            }
        });

        if (!user) {
            return void res.status(401).json({ error: 'User not found' });
        }

        // Only ADMIN userType is super admin
        if (user.userType !== 'ADMIN') {
            return void res.status(403).json({ error: 'Super admin access required' });
        }

        // Attach full user info to request
        (req as any).user = {
            ...(req as any).user,
            userType: user.userType,
            isAdmin: true,
            isSuperAdmin: true
        };

        return next();
    } catch (err) {
        console.error('Super admin auth middleware error:', err);
        return void res.status(500).json({ error: 'Server error during authorization' });
    }
}

/**
 * Check if user is admin OR is the resource owner
 * Useful for endpoints where admins can manage any resource but users can manage their own
 * 
 * @param {Function} getResourceOwnerId - Function that takes req and returns the owner's user ID
 */
export function requireAdminOrOwner(getResourceOwnerId: (req: Request) => Promise<string | null>) {
    return async function(req: Request, res: Response, next: NextFunction) {
        try {
            // Check for API key access
            if (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY) {
                (req as any).isApiKeyAuth = true;
                return next();
            }

            // Must have authenticated user
            if (!(req as any).user || !(req as any).user.id) {
                return void res.status(401).json({ error: 'Authentication required' });
            }

            // Get resource owner ID
            const ownerId = await getResourceOwnerId(req);
            
            // If user is the owner, allow access
            if (ownerId && (req as any).user.id === ownerId) {
                return next();
            }

            // Otherwise, check for admin privileges
            const user = await prisma.user.findUnique({
                where: { id: (req as any).user.id },
                select: { userType: true }
            });

            if (!user) {
                return void res.status(403).json({ error: 'Access denied' });
            }

            const adminTypes = ['ADMIN', 'GOVERNMENT'];
            if (adminTypes.includes(user.userType)) {
                (req as any).user.isAdmin = true;
                return next();
            }

            return void res.status(403).json({ error: 'Access denied' });
        } catch (err) {
            console.error('Admin or owner auth middleware error:', err);
            return void res.status(500).json({ error: 'Server error during authorization' });
        }
    };
}

/**
 * Simple synchronous admin check for inline use
 * Only use when you already have user info attached with userType
 */
export function isAdmin(req: Request) {
    if (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY) {
        return true;
    }
    return (req as any).user && ['ADMIN', 'GOVERNMENT'].includes((req as any).user.userType);
}

/**
 * Simple synchronous super admin check
 */
export function isSuperAdmin(req: Request) {
    if (process.env.SUPER_ADMIN_API_KEY && req.headers['x-super-admin-key'] === process.env.SUPER_ADMIN_API_KEY) {
        return true;
    }
    return (req as any).user && (req as any).user.userType === 'ADMIN';
}

