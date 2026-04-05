import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// =============================================================================
// CIVIC OPPORTUNITIES
// =============================================================================

/**
 * GET /civic/opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    const {
      q,
      type,
      location,
      active = 'true',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q.toLowerCase() } },
      ];
    }

    if (type) where.type = type;
    if (location) where.location = location;
    if (active === 'true') where.isActive = true;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [items, total] = await Promise.all([
      prisma.civicOpportunity.findMany({
        where,
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.civicOpportunity.count({ where }),
    ]);

    res.json({
      opportunities: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('List civic opportunities error:', err);
    res.status(500).json({ error: 'Failed to list civic opportunities' });
  }
});

/**
 * POST /civic/opportunities
 */
router.post('/opportunities', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      type = 'VOLUNTEER',
      organization,
      location,
      startDate,
      endDate,
      deadline,
      tags = [],
    } = req.body || {};

    if (!title) return void res.status(400).json({ error: 'title is required' });

    const opportunity = await prisma.civicOpportunity.create({
      data: {
        title,
        description,
        type,
        organization,
        location,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        tags,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ opportunity });
  } catch (err) {
    console.error('Create civic opportunity error:', err);
    res.status(500).json({ error: 'Failed to create civic opportunity' });
  }
});

/**
 * PATCH /civic/opportunities/:id
 */
router.patch('/opportunities/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.deadline) data.deadline = new Date(data.deadline);

    const opportunity = await prisma.civicOpportunity.update({
      where: { id },
      data,
    });

    res.json({ opportunity });
  } catch (err) {
    console.error('Update civic opportunity error:', err);
    res.status(500).json({ error: 'Failed to update civic opportunity' });
  }
});

// =============================================================================
// SUBMISSIONS / FEEDBACK
// =============================================================================

/**
 * POST /civic/opportunities/:id/submissions
 */
router.post('/opportunities/:id/submissions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'SUBMISSION', content } = req.body || {};

    const submission = await prisma.civicSubmission.create({
      data: {
        opportunityId: id,
        userId: req.user!.id,
        type,
        content,
      },
    });

    res.status(201).json({ submission });
  } catch (err) {
    console.error('Create civic submission error:', err);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

// =============================================================================
// CIVIC ALERTS
// =============================================================================

/**
 * GET /civic/alerts
 */
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const alerts = await prisma.civicAlert.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ alerts });
  } catch (err) {
    console.error('List civic alerts error:', err);
    res.status(500).json({ error: 'Failed to list alerts' });
  }
});

/**
 * POST /civic/alerts
 */
router.post('/alerts', authenticate, async (req, res) => {
  try {
    const { types = [], locations = [], isActive = true } = req.body || {};

    const alert = await prisma.civicAlert.create({
      data: {
        userId: req.user!.id,
        types,
        locations,
        isActive,
      },
    });

    res.status(201).json({ alert });
  } catch (err) {
    console.error('Create civic alert error:', err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// =============================================================================
// PETITIONS
// =============================================================================

/**
 * GET /civic/petitions
 */
router.get('/petitions', async (req, res) => {
  try {
    const petitions = await prisma.civicPetition.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ petitions });
  } catch (err) {
    console.error('List petitions error:', err);
    res.status(500).json({ error: 'Failed to list petitions' });
  }
});

/**
 * POST /civic/petitions
 */
router.post('/petitions', authenticate, async (req, res) => {
  try {
    const { title, description, url } = req.body || {};
    if (!title) return void res.status(400).json({ error: 'title is required' });

    const petition = await prisma.civicPetition.create({
      data: { title, description, url },
    });

    res.status(201).json({ petition });
  } catch (err) {
    console.error('Create petition error:', err);
    res.status(500).json({ error: 'Failed to create petition' });
  }
});

/**
 * POST /civic/petitions/:id/sign
 */
router.post('/petitions/:id/sign', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.civicPetitionSignature.create({
      data: {
        petitionId: id,
        userId: req.user!.id,
      },
    });

    await prisma.civicPetition.update({
      where: { id },
      data: { signatureCount: { increment: 1 } },
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return void res.status(409).json({ error: 'Already signed' });
    }
    console.error('Sign petition error:', err);
    res.status(500).json({ error: 'Failed to sign petition' });
  }
});

export default router;


