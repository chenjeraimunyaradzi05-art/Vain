import express, { Request, Response } from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import auth from '../middleware/auth';
import { checkFeaturedLimit } from '../middleware/subscription';
import { requireAdmin, isAdmin } from '../middleware/adminAuth';

const router = express.Router();
const authenticate = auth.authenticate;

// =============================================================================
// FEATURED JOBS
// =============================================================================

/**
 * GET /featured/jobs - Get featured job listings
 */
router.get('/jobs', async (req, res) => {
  try {
    const { placement = 'homepage', limit = 5 } = req.query;

    // Query jobs that are featured and active
    const now = new Date();
    const jobs = await prisma.job.findMany({
      where: { 
        isActive: true,
        isFeatured: true,
        OR: [
          { featuredUntil: null },
          { featuredUntil: { gte: now } },
        ],
      },
      take: parseInt(String(limit), 10),
      orderBy: [
        { featuredAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    
    const userIds = jobs.map((j) => j.userId);
    const companyProfiles = await prisma.companyProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, companyName: true, industry: true, isVerified: true },
    });
    const profileMap = new Map(companyProfiles.map((p) => [p.userId, p]));
    
    const enrichedJobs = jobs.map((job) => ({
      ...job,
      featured: { 
        placement: placement, 
        priority: 1,
        until: job.featuredUntil,
      },
      company: profileMap.get(job.userId) || null,
    }));
    
    return void res.json({ jobs: enrichedJobs });
  } catch (err) {
    console.error('Get featured jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch featured jobs' });
  }
});

/**
 * POST /featured/jobs/:jobId/click - Track featured job click
 */
router.post('/jobs/:jobId/click', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Increment view count on the job
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (job) {
      await prisma.job.update({
        where: { id: jobId },
        data: { viewCount: { increment: 1 } },
      });
    }

    res.json({ tracked: true });
  } catch (err) {
    console.error('Track click error:', err);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

/**
 * POST /featured/jobs - Feature a job listing (admin/payment)
 */
router.post('/jobs', authenticate, checkFeaturedLimit, async (req, res) => {
  try {
    const { jobId, durationDays = 30 } = req.body;

    if (!jobId) {
      return void res.status(400).json({ error: 'jobId is required' });
    }

    // Verify job exists and user owns it or is admin
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return void res.status(404).json({ error: 'Job not found' });
    }

    // Check ownership (user must own the job or be admin)
    if (job.userId !== (req as any).user.id && (req as any).user.userType !== 'GOVERNMENT') {
      return void res.status(403).json({ error: 'Not authorized to feature this job' });
    }

    // Note: Featured jobs are included in subscription tier limits (checkFeaturedLimit middleware)
    // FREE: 0, STARTER: 1, PROFESSIONAL: 3, ENTERPRISE: 10, RAP: unlimited

    const now = new Date();
    const featuredUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        isFeatured: true,
        featuredAt: now,
        featuredUntil: featuredUntil,
      },
    });

    res.status(201).json({ 
      featured: { 
        jobId: updated.id, 
        isFeatured: updated.isFeatured,
        featuredAt: updated.featuredAt,
        featuredUntil: updated.featuredUntil,
      } 
    });
  } catch (err) {
    console.error('Create featured job error:', err);
    res.status(500).json({ error: 'Failed to create featured listing' });
  }
});

// =============================================================================
// PARTNERS
// =============================================================================

/**
 * GET /featured/partners - List partner organizations
 */
router.get('/partners', async (req, res) => {
  try {
    const { tier } = req.query;

    const where: any = { isActive: true };
    if (tier) where.tier = tier;

    const partners = await prisma.partner.findMany({
      where,
      orderBy: [
        { tier: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json({ partners });
  } catch (err) {
    console.error('List partners error:', err);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

/**
 * GET /featured/partners/:slug - Get partner details
 */
router.get('/partners/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const partner = await prisma.partner.findUnique({
      where: { slug },
    });

    if (!partner || !partner.isActive) {
      return void res.status(404).json({ error: 'Partner not found' });
    }

    // Get featured jobs to display on partner page
    const now = new Date();
    const featuredJobs = await prisma.job.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        OR: [
          { featuredUntil: null },
          { featuredUntil: { gte: now } },
        ],
      },
      take: 5,
      orderBy: { featuredAt: 'desc' },
    });

    res.json({ partner, featuredJobs });
  } catch (err) {
    console.error('Get partner error:', err);
    res.status(500).json({ error: 'Failed to fetch partner' });
  }
});

/**
 * POST /featured/partners - Create partner (admin)
 */
router.post('/partners', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, logoUrl, website, tier, featuredJobs } = req.body;

    if (!name) {
      return void res.status(400).json({ error: 'name is required' });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const partner = await prisma.partner.create({
      data: {
        name,
        slug,
        description,
        logoUrl,
        website,
        tier: tier || 'standard',
        featuredJobs: featuredJobs || 0,
      },
    });

    res.status(201).json({ partner });
  } catch (err) {
    if (err.code === 'P2002') {
      return void res.status(409).json({ error: 'Partner with this name already exists' });
    }
    console.error('Create partner error:', err);
    res.status(500).json({ error: 'Failed to create partner' });
  }
});

/**
 * PUT /featured/partners/:slug - Update partner (admin)
 */
router.put('/partners/:slug', authenticate, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, logoUrl, website, tier, featuredJobs, isActive } = req.body;

    const existing = await prisma.partner.findUnique({ where: { slug } });
    if (!existing) {
      return void res.status(404).json({ error: 'Partner not found' });
    }

    // Generate new slug if name changed
    let newSlug = slug;
    if (name && name !== existing.name) {
      newSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const partner = await prisma.partner.update({
      where: { slug },
      data: {
        name: name || undefined,
        slug: newSlug,
        description: description !== undefined ? description : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        website: website !== undefined ? website : undefined,
        tier: tier || undefined,
        featuredJobs: featuredJobs !== undefined ? featuredJobs : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({ partner });
  } catch (err) {
    if (err.code === 'P2002') {
      return void res.status(409).json({ error: 'Partner with this name already exists' });
    }
    console.error('Update partner error:', err);
    res.status(500).json({ error: 'Failed to update partner' });
  }
});

/**
 * DELETE /featured/partners/:slug - Delete partner (admin)
 */
router.delete('/partners/:slug', authenticate, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;

    const existing = await prisma.partner.findUnique({ where: { slug } });
    if (!existing) {
      return void res.status(404).json({ error: 'Partner not found' });
    }

    await prisma.partner.delete({ where: { slug } });

    res.json({ success: true, message: 'Partner deleted' });
  } catch (err) {
    console.error('Delete partner error:', err);
    res.status(500).json({ error: 'Failed to delete partner' });
  }
});

/**
 * DELETE /featured/jobs/:jobId - Remove featured status from job
 */
router.delete('/jobs/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return void res.status(404).json({ error: 'Job not found' });
    }

    // Check ownership
    if (job.userId !== (req as any).user.id && (req as any).user.userType !== 'GOVERNMENT') {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        isFeatured: false,
        featuredAt: null,
        featuredUntil: null,
      },
    });

    res.json({ success: true, job: updated });
  } catch (err) {
    console.error('Remove featured job error:', err);
    res.status(500).json({ error: 'Failed to remove featured status' });
  }
});

export default router;


