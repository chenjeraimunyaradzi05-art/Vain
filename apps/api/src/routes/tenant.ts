"use strict";
/**
 * Multi-tenant Configuration Routes
 * 
 * Manage tenant-specific settings, branding, and data residency.
 */

import express from 'express';
import { prisma } from '../db';
import requireAuth from '../middleware/auth';

const router = express.Router();

// Available data regions
const DATA_REGIONS = {
  AU: { name: 'Australia', primary: 'Sydney', flag: '🇦🇺' },
  US: { name: 'United States', primary: 'US East', flag: '🇺🇸' },
  EU: { name: 'European Union', primary: 'Frankfurt', flag: '🇪🇺' },
  UK: { name: 'United Kingdom', primary: 'London', flag: '🇬🇧' }
};

/**
 * GET /tenant
 * Get tenant configuration
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const config = await prisma.tenantConfig.findUnique({
      where: { companyId: company.id }
    });
    
    res.json({
      configured: !!config,
      config: config ? {
        id: config.id,
        subdomain: config.subdomain,
        customDomain: config.customDomain,
        branding: config.brandingConfig ? JSON.parse(config.brandingConfig) : null,
        featureFlags: config.featureFlags ? JSON.parse(config.featureFlags) : null,
        dataRegion: config.dataRegion,
        retentionDays: config.retentionDays,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      } : null,
      availableRegions: DATA_REGIONS
    });
  } catch (err) {
    console.error('Failed to get tenant config:', err);
    res.status(500).json({ error: 'Failed to get tenant configuration' });
  }
});

/**
 * POST /tenant
 * Create or update tenant configuration
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const {
      subdomain,
      customDomain,
      branding,
      featureFlags,
      dataRegion,
      retentionDays
    } = req.body;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Validate subdomain format
    if (subdomain) {
      if (!/^[a-z0-9-]+$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 50) {
        return void res.status(400).json({ 
          error: 'Subdomain must be 3-50 lowercase alphanumeric characters or hyphens' 
        });
      }
      
      // Check if subdomain is taken
      const existing = await prisma.tenantConfig.findFirst({
        where: { subdomain, NOT: { companyId: company.id } }
      });
      
      if (existing) {
        return void res.status(400).json({ error: 'Subdomain is already taken' });
      }
    }
    
    // Validate custom domain
    if (customDomain) {
      // Simple domain validation
      if (!/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/.test(customDomain.toLowerCase())) {
        return void res.status(400).json({ error: 'Invalid domain format' });
      }
      
      // Check if domain is taken
      const existing = await prisma.tenantConfig.findFirst({
        where: { customDomain, NOT: { companyId: company.id } }
      });
      
      if (existing) {
        return void res.status(400).json({ error: 'Domain is already configured' });
      }
    }
    
    // Validate data region
    if (dataRegion && !DATA_REGIONS[dataRegion]) {
      return void res.status(400).json({ 
        error: 'Invalid data region', 
        valid: Object.keys(DATA_REGIONS) 
      });
    }
    
    // Validate retention
    const validRetention = retentionDays ? Math.min(Math.max(30, retentionDays), 3650) : 365;
    
    // Check for existing config
    const existing = await prisma.tenantConfig.findUnique({
      where: { companyId: company.id }
    });
    
    const data = {
      subdomain: subdomain || null,
      customDomain: customDomain || null,
      brandingConfig: branding ? JSON.stringify(branding) : null,
      featureFlags: featureFlags ? JSON.stringify(featureFlags) : null,
      dataRegion: dataRegion || 'AU',
      retentionDays: validRetention
    };
    
    let config;
    if (existing) {
      config = await prisma.tenantConfig.update({
        where: { id: existing.id },
        data
      });
    } else {
      config = await prisma.tenantConfig.create({
        data: {
          companyId: company.id,
          ...data
        }
      });
    }
    
    res.json({
      success: true,
      config: {
        id: config.id,
        subdomain: config.subdomain,
        customDomain: config.customDomain,
        dataRegion: config.dataRegion,
        retentionDays: config.retentionDays
      }
    });
  } catch (err) {
    console.error('Failed to save tenant config:', err);
    res.status(500).json({ error: 'Failed to save tenant configuration' });
  }
});

/**
 * PATCH /tenant/branding
 * Update just branding settings
 */
router.patch('/branding', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { 
      primaryColor,
      secondaryColor,
      logoUrl,
      faviconUrl,
      companyDisplayName,
      customCss
    } = req.body;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    let config = await prisma.tenantConfig.findUnique({
      where: { companyId: company.id }
    });
    
    // Get existing branding or create new
    const existingBranding = config?.brandingConfig 
      ? JSON.parse(config.brandingConfig) 
      : {};
    
    const branding = {
      ...existingBranding,
      ...(primaryColor && { primaryColor }),
      ...(secondaryColor && { secondaryColor }),
      ...(logoUrl && { logoUrl }),
      ...(faviconUrl && { faviconUrl }),
      ...(companyDisplayName && { companyDisplayName }),
      ...(customCss && { customCss })
    };
    
    if (config) {
      config = await prisma.tenantConfig.update({
        where: { id: config.id },
        data: { brandingConfig: JSON.stringify(branding) }
      });
    } else {
      config = await prisma.tenantConfig.create({
        data: {
          companyId: company.id,
          brandingConfig: JSON.stringify(branding)
        }
      });
    }
    
    res.json({
      success: true,
      branding
    });
  } catch (err) {
    console.error('Failed to update branding:', err);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

/**
 * PATCH /tenant/features
 * Update feature flags
 */
router.patch('/features', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { features } = req.body;
    
    if (!features || typeof features !== 'object') {
      return void res.status(400).json({ error: 'Features object required' });
    }
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    let config = await prisma.tenantConfig.findUnique({
      where: { companyId: company.id }
    });
    
    const existingFeatures = config?.featureFlags 
      ? JSON.parse(config.featureFlags) 
      : {};
    
    const updatedFeatures = { ...existingFeatures, ...features };
    
    if (config) {
      config = await prisma.tenantConfig.update({
        where: { id: config.id },
        data: { featureFlags: JSON.stringify(updatedFeatures) }
      });
    } else {
      config = await prisma.tenantConfig.create({
        data: {
          companyId: company.id,
          featureFlags: JSON.stringify(updatedFeatures)
        }
      });
    }
    
    res.json({
      success: true,
      features: updatedFeatures
    });
  } catch (err) {
    console.error('Failed to update features:', err);
    res.status(500).json({ error: 'Failed to update feature flags' });
  }
});

/**
 * GET /tenant/regions
 * List available data regions
 */
router.get('/regions', (req, res) => {
  res.json({ regions: DATA_REGIONS });
});

/**
 * POST /tenant/verify-domain
 * Verify custom domain ownership
 */
router.post('/verify-domain', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { domain } = req.body;
    
    if (!domain) {
      return void res.status(400).json({ error: 'Domain required' });
    }
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Generate verification token
    const verificationToken = `ngp-verify-${company.id.substring(0, 8)}`;
    
    // Instructions for verification
    res.json({
      domain,
      verification: {
        method: 'DNS TXT Record',
        recordType: 'TXT',
        recordName: '_ngurra-verify',
        recordValue: verificationToken,
        fullRecord: `_ngurra-verify.${domain}`,
        instructions: [
          '1. Log in to your domain registrar',
          `2. Add a TXT record for _ngurra-verify.${domain}`,
          `3. Set the value to: ${verificationToken}`,
          '4. Wait for DNS propagation (up to 24 hours)',
          '5. Click "Verify" to confirm ownership'
        ]
      }
    });
  } catch (err) {
    console.error('Failed to generate domain verification:', err);
    res.status(500).json({ error: 'Failed to generate verification' });
  }
});

/**
 * POST /tenant/check-domain
 * Check if domain verification is complete
 */
router.post('/check-domain', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { domain } = req.body;
    
    if (!domain) {
      return void res.status(400).json({ error: 'Domain required' });
    }
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const expectedToken = `ngp-verify-${company.id.substring(0, 8)}`;
    
    // Check DNS record (simplified - use dns.resolveTxt in production)
    try {
      const dns = require('dns').promises;
      const records = await dns.resolveTxt(`_ngurra-verify.${domain}`);
      const flatRecords = records.flat();
      
      if (flatRecords.includes(expectedToken)) {
        // Domain verified - save it
        let config = await prisma.tenantConfig.findUnique({
          where: { companyId: company.id }
        });
        
        if (config) {
          await prisma.tenantConfig.update({
            where: { id: config.id },
            data: { customDomain: domain }
          });
        } else {
          await prisma.tenantConfig.create({
            data: {
              companyId: company.id,
              customDomain: domain
            }
          });
        }
        
        res.json({ verified: true, domain });
      } else {
        res.json({ 
          verified: false, 
          message: 'Verification record not found or incorrect' 
        });
      }
    } catch (dnsErr) {
      res.json({ 
        verified: false, 
        message: 'DNS lookup failed - record not found or not propagated yet' 
      });
    }
  } catch (err) {
    console.error('Failed to check domain:', err);
    res.status(500).json({ error: 'Failed to check domain verification' });
  }
});

export default router;



