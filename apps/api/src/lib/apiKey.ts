// @ts-nocheck
/**
 * API Key Validation Service
 * 
 * Handles validation of enterprise API keys for machine-to-machine
 * authentication.
 */

import { prisma } from './database';
import { logger } from './logger';
import * as cache from './redisCache';

export interface ApiKeyInfo {
  id: string;
  companyId: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  expiresAt: Date | null;
  isActive: boolean;
}

// Cache TTL for API key lookups (5 minutes)
const API_KEY_CACHE_TTL = 300;

/**
 * Hash API key for lookup (keys are stored hashed)
 */
async function hashApiKey(key: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key and return its info
 */
export async function validateApiKey(key: string): Promise<ApiKeyInfo | null> {
  if (!key) {
    return null;
  }

  try {
    const keyHash = await hashApiKey(key);
    const cacheKey = `api-key:${keyHash}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached as ApiKeyInfo;
    }

    // Lookup in database
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        isActive: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    // Parse permissions if stored as JSON string
    const keyInfo: ApiKeyInfo = {
      id: apiKey.id,
      companyId: apiKey.companyId,
      name: apiKey.name,
      permissions: typeof apiKey.permissions === 'string' 
        ? JSON.parse(apiKey.permissions) 
        : apiKey.permissions || [],
      rateLimit: apiKey.rateLimit || 1000,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive,
    };

    // Cache the result
    await cache.set(cacheKey, keyInfo, API_KEY_CACHE_TTL);

    // Update last used timestamp (async, don't wait)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(err => {
      logger.warn('Failed to update API key last used timestamp', { error: err.message });
    });

    return keyInfo;
  } catch (error: any) {
    logger.error('API key validation error', { error: error.message });
    return null;
  }
}

/**
 * Generate a new API key
 */
export async function generateApiKey(
  companyId: string,
  name: string,
  options: {
    permissions?: string[];
    rateLimit?: number;
    expiresInDays?: number;
  } = {}
): Promise<{ key: string; keyInfo: ApiKeyInfo }> {
  const crypto = await import('crypto');
  
  // Generate a secure random key
  const keyBytes = crypto.randomBytes(32);
  const key = `np_${keyBytes.toString('base64url')}`;
  const keyHash = await hashApiKey(key);

  const expiresAt = options.expiresInDays 
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      companyId,
      name,
      keyHash,
      keyPrefix: key.substring(0, 10), // Store prefix for identification
      permissions: JSON.stringify(options.permissions || ['read']),
      rateLimit: options.rateLimit || 1000,
      expiresAt,
      isActive: true,
    },
  });

  logger.info('API key generated', { companyId, keyName: name, keyId: apiKey.id });

  return {
    key, // Only returned once, never stored in plain text
    keyInfo: {
      id: apiKey.id,
      companyId,
      name,
      permissions: options.permissions || ['read'],
      rateLimit: options.rateLimit || 1000,
      expiresAt,
      isActive: true,
    },
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, companyId: string): Promise<boolean> {
  try {
    const result = await prisma.apiKey.updateMany({
      where: {
        id: keyId,
        companyId,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    if (result.count > 0) {
      logger.info('API key revoked', { keyId, companyId });
      return true;
    }
    return false;
  } catch (error: any) {
    logger.error('Failed to revoke API key', { keyId, error: error.message });
    return false;
  }
}

/**
 * List API keys for a company (without the actual key values)
 */
export async function listApiKeys(companyId: string): Promise<Omit<ApiKeyInfo, 'companyId'>[]> {
  const keys = await prisma.apiKey.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      rateLimit: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map(key => ({
    id: key.id,
    name: key.name,
    permissions: typeof key.permissions === 'string' 
      ? JSON.parse(key.permissions) 
      : key.permissions || [],
    rateLimit: key.rateLimit || 1000,
    expiresAt: key.expiresAt,
    isActive: key.isActive,
  }));
}

/**
 * Middleware to authenticate requests using API key
 */
export function apiKeyAuthMiddleware(requiredPermissions: string[] = []) {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer np_')) {
      return next(); // Let other auth methods handle it
    }

    const apiKey = authHeader.substring(7);
    const keyInfo = await validateApiKey(apiKey);

    if (!keyInfo) {
      return void res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or expired API key',
        },
      });
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(
        p => keyInfo.permissions.includes(p) || keyInfo.permissions.includes('admin')
      );

      if (!hasPermission) {
        return void res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'API key does not have required permissions',
          },
        });
      }
    }

    // Attach API key info to request
    req.apiKey = keyInfo;
    req.isApiKeyAuth = true;
    
    next();
  };
}

export {};

