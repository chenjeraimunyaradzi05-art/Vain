/**
 * API Key Management Routes
 * 
 * Enterprise feature for generating, managing, and revoking API keys
 * for machine-to-machine integrations.
 */

import express from 'express';
import crypto from 'crypto';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import authenticateJWT from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

// Alias for consistency
const requireAuth = authenticateJWT;

const router = express.Router();

/**
 * Generate a secure API key
 */
function generateApiKey() {
  const prefix = 'ngp_'; // Ngurra Pathways prefix
  const key = crypto.randomBytes(32).toString('hex');
  return `${prefix}${key}`;
}

/**
 * Hash API key for storage
 */
function hashApiKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * GET /api-keys
 * List API keys for the authenticated company
 */
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    
    // Get company profile
    const company = await prisma.companyProfile.findFirst({ where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const keys = await prisma.companyApiKey.findMany({
      where: { company: { userId } },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ keys });
  } catch (err) {
    console.error('Failed to list API keys:', err);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * POST /api-keys
 * Create a new API key
 */
router.post('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { name, permissions = ['read'], expiresInDays = 365 } = req.body;
    
    if (!name || name.length < 3) {
      return void res.status(400).json({ error: 'Name must be at least 3 characters' });
    }
    
    // Get company profile
    const company = await prisma.companyProfile.findFirst({ where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Check key limit (max 10 per company)
    const existingCount = await prisma.companyApiKey.count({
      where: { company: { userId }, isActive: true }
    });
    
    if (existingCount >= 10) {
      return void res.status(400).json({ error: 'Maximum 10 active API keys per company' });
    }
    
    // Generate key
    const rawKey = generateApiKey();
    const hashedKey = hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12); // Show first 12 chars
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const apiKey = await prisma.companyApiKey.create({
      data: { company: { connect: { userId } },
        name,
        keyHash: hashedKey,
        keyPrefix,
        permissions,
        expiresAt,
        isActive: true
      }
    });
    
    // Return the full key only once - it cannot be retrieved again
    res.status(201).json({
      key: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      },
      // Full key only shown once!
      secretKey: rawKey,
      warning: 'Save this key securely. It cannot be retrieved again.'
    });
  } catch (err) {
    console.error('Failed to create API key:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * DELETE /api-keys/:id
 * Revoke an API key
 */
router.delete('/:id', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    // Get company profile
    const company = await prisma.companyProfile.findFirst({ where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Verify ownership
    const apiKey = await prisma.companyApiKey.findFirst({
      where: { id, company: { userId } }
    });
    
    if (!apiKey) {
      return void res.status(404).json({ error: 'API key not found' });
    }
    
    // Soft delete - mark as inactive
    await prisma.companyApiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() }
    });
    
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    console.error('Failed to revoke API key:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * POST /api-keys/:id/rotate
 * Rotate an API key (create new, revoke old)
 */
router.post('/:id/rotate', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    // Get company profile
    const company = await prisma.companyProfile.findFirst({ where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Get existing key
    const oldKey = await prisma.companyApiKey.findFirst({
      where: { id, company: { userId }, isActive: true }
    });
    
    if (!oldKey) {
      return void res.status(404).json({ error: 'API key not found' });
    }
    
    // Generate new key
    const rawKey = generateApiKey();
    const hashedKey = hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);
    
    // Create new key with same settings
    const newKey = await prisma.companyApiKey.create({
      data: { company: { connect: { userId } },
        name: oldKey.name,
        keyHash: hashedKey,
        keyPrefix,
        permissions: oldKey.permissions,
        expiresAt: oldKey.expiresAt,
        isActive: true
      }
    });
    
    // Revoke old key
    await prisma.companyApiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() }
    });
    
    res.json({
      key: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        permissions: newKey.permissions,
        expiresAt: newKey.expiresAt
      },
      secretKey: rawKey,
      warning: 'Save this key securely. The old key has been revoked.'
    });
  } catch (err) {
    console.error('Failed to rotate API key:', err);
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

/**
 * GET /api-keys/usage
 * Get API key usage statistics
 */
router.get('/usage', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    
    const company = await prisma.companyProfile.findFirst({ where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const keys = await prisma.companyApiKey.findMany({
      where: { company: { userId } },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        requestCount: true,
        lastUsedAt: true,
        isActive: true
      }
    });
    
    const totalRequests = keys.reduce((sum, k) => sum + (k.requestCount || 0), 0);
    
    res.json({
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      totalRequests,
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        requestCount: k.requestCount || 0,
        lastUsedAt: k.lastUsedAt,
        isActive: k.isActive
      }))
    });
  } catch (err) {
    console.error('Failed to get API key usage:', err);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

/**
 * Middleware to authenticate API key requests
 * Use this on routes that should accept API key auth
 */
async function apiKeyAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ngp_')) {
    return next(); // Fall through to other auth methods
  }
  
  const key = authHeader.replace('Bearer ', '');
  const hashedKey = hashApiKey(key);
  
  try {
    const apiKey = await prisma.companyApiKey.findFirst({
      where: {
        keyHash: hashedKey,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      include: { company: true }
    });
    
    if (!apiKey) {
      return void res.status(401).json({ error: 'Invalid or expired API key' });
    }
    
    // Update usage stats
    await prisma.companyApiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 }
      }
    });
    
    // Attach API key info to request
    req.apiKey = apiKey;
    req.user = { id: apiKey.company.userId, type: 'api_key' };
    
    next();
  } catch (err) {
    console.error('API key auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export default router;

export { apiKeyAuth, hashApiKey };





