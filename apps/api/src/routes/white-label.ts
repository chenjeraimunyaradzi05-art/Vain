/**
 * White-Label Platform Configuration Routes
 * Allows customization of branding, colors, and domain for white-label deployments
 */

import express from 'express';
import { prisma } from '../db';
import authenticateJWT from '../middleware/auth';

const router = express.Router();

function parseJsonMaybe(value) {
  if (!value) return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Middleware to check admin or tenant owner access
 */
async function checkTenantAccess(req, res, next) {
  try {
    const userId = req.user?.id;
    const tenantSlug = req.params.slug;
    
    // Admin override
    const adminKey = req.headers['x-admin-key'];
    if (adminKey && adminKey === process.env.ADMIN_API_KEY) {
      return next();
    }

    if (!userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user owns this tenant
    const tenant = await prisma.whiteLabelTenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (!tenant) {
      return void res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.ownerId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to manage this tenant' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant access check error:', error);
    res.status(500).json({ error: 'Access check failed' });
  }
}

/**
 * GET /white-label/config
 * Get white-label config for the current domain (public)
 */
router.get('/config', async (req, res) => {
  try {
    const host = req.headers.host || req.headers['x-forwarded-host'];
    const slug = req.query.slug;

    let tenant;

    if (slug) {
      // Look up by slug
        tenant = await prisma.whiteLabelTenant.findFirst({
          where: { slug, isActive: true }
        });
    } else if (host) {
      // Look up by domain
      tenant = await prisma.whiteLabelTenant.findFirst({
        where: { 
          domain: host,
          isActive: true 
        }
      });
    }

    // Return default config if no tenant found
    if (!tenant) {
      return void res.json({
        isDefault: true,
        name: 'Ngurra Pathways',
        logoUrl: '/brand/ngurra-logo.svg',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E293B',
        accentColor: '#10B981',
        footerText: '© 2025 Ngurra Pathways. All rights reserved.'
      });
    }

    res.json({
      isDefault: false,
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl || '/brand/ngurra-logo.svg',
      faviconUrl: tenant.faviconUrl,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      accentColor: tenant.accentColor,
      footerText: tenant.footerText,
      customCss: tenant.customCss,
      supportEmail: tenant.supportEmail,
      supportPhone: tenant.supportPhone,
      termsUrl: tenant.termsUrl,
      privacyUrl: tenant.privacyUrl,
      features: parseJsonMaybe(tenant.features)
    });
  } catch (error) {
    console.error('Get white-label config error:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

/**
 * GET /white-label/tenants
 * List all tenants (admin only)
 */
router.get('/tenants', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return void res.status(403).json({ error: 'Admin access required' });
    }

    const tenants = await prisma.whiteLabelTenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        isActive: true,
        ownerId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tenants });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

/**
 * POST /white-label/tenants
 * Create a new white-label tenant (admin only)
 */
router.post('/tenants', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return void res.status(403).json({ error: 'Admin access required' });
    }

    const {
      slug,
      name,
      domain,
      ownerId,
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      footerText,
      customCss,
      supportEmail,
      supportPhone,
      termsUrl,
      privacyUrl,
      features
    } = req.body;

    if (!slug || !name || !ownerId) {
      return void res.status(400).json({ error: 'slug, name, and ownerId are required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return void res.status(400).json({ error: 'slug must be lowercase alphanumeric with dashes only' });
    }

    // Check if slug or domain already exists
    const existing = await prisma.whiteLabelTenant.findFirst({
      where: {
        OR: [
          { slug },
          domain ? { domain } : {}
        ]
      }
    });

    if (existing) {
      return void res.status(409).json({ error: 'Tenant with this slug or domain already exists' });
    }

    const tenant = await prisma.whiteLabelTenant.create({
      data: {
        slug,
        name,
        domain,
        ownerId,
        logoUrl,
        faviconUrl,
        primaryColor: primaryColor || '#3B82F6',
        secondaryColor: secondaryColor || '#1E293B',
        accentColor: accentColor || '#10B981',
        footerText,
        customCss,
        supportEmail,
        supportPhone,
        termsUrl,
        privacyUrl,
        features: features == null ? null : (typeof features === 'string' ? features : JSON.stringify(features)),
        isActive: true
      }
    });

    // Log tenant creation
    await prisma.auditLog.create({
      data: {
        event: 'white_label.tenant_created',
        action: 'WHITE_LABEL_TENANT_CREATED',
        userId: ownerId,
        targetResourceType: 'white_label_tenant',
        targetResourceId: tenant.id,
        metadata: JSON.stringify({ tenantId: tenant.id, slug }),
      }
    });

    res.status(201).json({ tenant });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

/**
 * GET /white-label/tenants/:slug
 * Get tenant details (owner or admin)
 */
router.get('/tenants/:slug', authenticateJWT, checkTenantAccess, async (req, res) => {
  try {
    res.json({ tenant: req.tenant });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

/**
 * PUT /white-label/tenants/:slug
 * Update tenant configuration (owner or admin)
 */
router.put('/tenants/:slug', authenticateJWT, checkTenantAccess, async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      name,
      domain,
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      footerText,
      customCss,
      customJs,
      supportEmail,
      supportPhone,
      termsUrl,
      privacyUrl,
      features,
      isActive
    } = req.body;

    // Check for domain conflict
    if (domain) {
      const existing = await prisma.whiteLabelTenant.findFirst({
        where: {
          domain,
          NOT: { slug }
        }
      });
      if (existing) {
        return void res.status(409).json({ error: 'Domain already in use by another tenant' });
      }
    }

    const tenant = await prisma.whiteLabelTenant.update({
      where: { slug },
      data: {
        name,
        domain,
        logoUrl,
        faviconUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        footerText,
        customCss,
        // customJs is not persisted in schema
        supportEmail,
        supportPhone,
        termsUrl,
        privacyUrl,
        features: features == null ? undefined : (typeof features === 'string' ? features : JSON.stringify(features)),
        isActive,
        updatedAt: new Date()
      }
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        event: 'white_label.tenant_updated',
        action: 'WHITE_LABEL_TENANT_UPDATED',
        userId: req.user.id,
        targetResourceType: 'white_label_tenant',
        targetResourceId: tenant.id,
        metadata: JSON.stringify({ tenantId: tenant.id, slug })
      }
    });

    res.json({ tenant });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * DELETE /white-label/tenants/:slug
 * Deactivate a tenant (admin only)
 */
router.delete('/tenants/:slug', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return void res.status(403).json({ error: 'Admin access required' });
    }

    const { slug } = req.params;

    const tenant = await prisma.whiteLabelTenant.update({
      where: { slug },
      data: { isActive: false }
    });

    await prisma.auditLog.create({
      data: {
        event: 'white_label.tenant_deactivated',
        action: 'WHITE_LABEL_TENANT_DEACTIVATED',
        targetResourceType: 'white_label_tenant',
        targetResourceId: tenant.id,
        metadata: JSON.stringify({ tenantId: tenant.id, slug })
      }
    });

    res.json({ message: 'Tenant deactivated', tenant });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to deactivate tenant' });
  }
});

/**
 * POST /white-label/tenants/:slug/preview
 * Generate a preview URL for testing branding
 */
router.post('/tenants/:slug/preview', authenticateJWT, checkTenantAccess, async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Generate a time-limited preview token
    const previewToken = Buffer.from(JSON.stringify({
      slug,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    })).toString('base64url');

    res.json({
      previewUrl: `${process.env.WEB_URL || 'http://localhost:3002'}?preview=${previewToken}`,
      expiresIn: '24 hours'
    });
  } catch (error) {
    console.error('Generate preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

/**
 * GET /white-label/css/:slug
 * Get generated CSS variables for a tenant
 */
router.get('/css/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const tenant = await prisma.whiteLabelTenant.findFirst({
      where: { slug, isActive: true }
    });

    if (!tenant) {
      return void res.status(404).json({ error: 'Tenant not found' });
    }

    // Generate CSS custom properties
    const css = `
:root {
  --wl-primary: ${tenant.primaryColor};
  --wl-secondary: ${tenant.secondaryColor};
  --wl-accent: ${tenant.accentColor};
  --wl-primary-rgb: ${hexToRgb(tenant.primaryColor)};
  --wl-secondary-rgb: ${hexToRgb(tenant.secondaryColor)};
  --wl-accent-rgb: ${hexToRgb(tenant.accentColor)};
}

${tenant.customCss || ''}
`.trim();

    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(css);
  } catch (error) {
    console.error('Get CSS error:', error);
    res.status(500).json({ error: 'Failed to generate CSS' });
  }
});

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export default router;


export {};


