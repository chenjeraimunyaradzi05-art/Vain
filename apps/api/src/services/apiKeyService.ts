/**
 * API Key Service (Step 74)
 * 
 * Manages API keys for third-party integrations.
 */

import crypto from 'crypto';
import { prisma } from '../db';
import { logSecurityEvent, SecurityEventType, Severity } from '../lib/securityAudit';

// Constants
const API_KEY_PREFIX_LENGTH = 8;
const API_KEY_LENGTH = 32;

// Rate limit tiers
export const RATE_LIMIT_TIERS = {
  standard: { requestsPerMinute: 60, description: 'Standard tier' },
  premium: { requestsPerMinute: 300, description: 'Premium tier' },
  enterprise: { requestsPerMinute: 1000, description: 'Enterprise tier' },
} as const;

// Available API scopes
export const API_SCOPES = [
  'read:profile',
  'write:profile',
  'read:jobs',
  'write:jobs',
  'read:applications',
  'write:applications',
  'read:messages',
  'write:messages',
  'read:notifications',
  'webhooks:receive',
  'admin:read',
  'admin:write',
] as const;

export type ApiScope = typeof API_SCOPES[number];
export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

export interface ApiKeyCreateInput {
  userId: string;
  name: string;
  permissions?: string[];
  scopes?: ApiScope[];
  rateLimitTier?: RateLimitTier;
  expiresAt?: Date;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  userId?: string;
  keyId?: string;
  scopes?: string[];
  permissions?: string[];
  rateLimit?: number;
  error?: string;
}

/**
 * Generate a new API key
 * Returns the raw key (only shown once) and the created record
 */
export async function createApiKey(input: ApiKeyCreateInput) {
  const { userId, name, permissions = [], scopes = [], rateLimitTier = 'standard', expiresAt } = input;

  // Generate the key
  const rawKey = crypto.randomBytes(API_KEY_LENGTH).toString('hex');
  const keyPrefix = rawKey.substring(0, API_KEY_PREFIX_LENGTH);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  // Get rate limit for tier
  const rateLimit = RATE_LIMIT_TIERS[rateLimitTier]?.requestsPerMinute || 60;

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      keyPrefix,
      permissions,
      scopes,
      rateLimit,
      rateLimitTier,
      expiresAt,
    },
  });

  logSecurityEvent({
    type: SecurityEventType.API_KEY_GENERATED,
    userId,
    description: `API key created: ${name}`,
    metadata: { keyId: apiKey.id, keyPrefix, scopes },
    severity: Severity.INFO,
  });

  // Return the raw key only once
  return {
    id: apiKey.id,
    name: apiKey.name,
    key: `gim_${rawKey}`, // Prefix for easy identification
    keyPrefix,
    scopes: apiKey.scopes,
    permissions: apiKey.permissions,
    rateLimit: apiKey.rateLimit,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Validate an API key and return associated info
 */
export async function validateApiKey(rawKey: string): Promise<ApiKeyValidationResult> {
  // Remove prefix if present
  const cleanKey = rawKey.startsWith('gim_') ? rawKey.substring(4) : rawKey;
  
  if (cleanKey.length !== API_KEY_LENGTH * 2) {
    return { isValid: false, error: 'Invalid key format' };
  }

  const keyHash = crypto.createHash('sha256').update(cleanKey).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    return { isValid: false, error: 'Invalid API key' };
  }

  if (!apiKey.isActive) {
    return { isValid: false, error: 'API key is revoked' };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { isValid: false, error: 'API key has expired' };
  }

  // Update usage stats
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return {
    isValid: true,
    userId: apiKey.userId,
    keyId: apiKey.id,
    scopes: apiKey.scopes,
    permissions: apiKey.permissions,
    rateLimit: apiKey.rateLimit || 60,
  };
}

/**
 * Get all API keys for a user (without exposing the actual keys)
 */
export async function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      permissions: true,
      rateLimit: true,
      rateLimitTier: true,
      lastUsedAt: true,
      usageCount: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(userId: string, keyId: string, reason?: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || 'User revoked',
    },
  });

  logSecurityEvent({
    type: SecurityEventType.API_KEY_REVOKED,
    userId,
    description: `API key revoked: ${apiKey.name}`,
    metadata: { keyId, keyPrefix: apiKey.keyPrefix, reason },
    severity: Severity.INFO,
  });

  return { success: true };
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(userId: string, keyId: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  await prisma.apiKey.delete({
    where: { id: keyId },
  });

  return { success: true };
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(keyScopes: string[], requiredScope: ApiScope): boolean {
  return keyScopes.includes(requiredScope);
}

/**
 * Check if an API key has any of the required scopes
 */
export function hasAnyScope(keyScopes: string[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.some(scope => keyScopes.includes(scope));
}

/**
 * Check if an API key has all required scopes
 */
export function hasAllScopes(keyScopes: string[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every(scope => keyScopes.includes(scope));
}

/**
 * Clean up expired API keys
 */
export async function cleanupExpiredApiKeys() {
  const result = await prisma.apiKey.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return { deleted: result.count };
}

export default {
  createApiKey,
  validateApiKey,
  getUserApiKeys,
  revokeApiKey,
  deleteApiKey,
  hasScope,
  hasAnyScope,
  hasAllScopes,
  cleanupExpiredApiKeys,
  API_SCOPES,
  RATE_LIMIT_TIERS,
};
