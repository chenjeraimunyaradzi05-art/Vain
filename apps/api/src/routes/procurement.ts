import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

const router = express.Router();

function isGovernmentOrAdmin(userType?: string) {
  return userType === 'GOVERNMENT' || userType === 'ADMIN';
}

// =============================================================================
// PROCUREMENT OPPORTUNITIES
// =============================================================================

/**
 * GET /procurement/opportunities
 * Search and list procurement opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    const {
      q,
      category,
      location,
      status = 'OPEN',
      minValue,
      maxValue,
      deadlineFrom,
      deadlineTo,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const where: any = {
      status,
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q.toLowerCase() } },
      ];
    }

    if (category) where.category = category;
    if (location) where.location = location;

    if (minValue || maxValue) {
      where.AND = where.AND || [];
      if (minValue) where.AND.push({ valueMax: { gte: Number(minValue) } });
      if (maxValue) where.AND.push({ valueMin: { lte: Number(maxValue) } });
    }

    if (deadlineFrom || deadlineTo) {
      where.deadline = {};
      if (deadlineFrom) where.deadline.gte = new Date(deadlineFrom);
      if (deadlineTo) where.deadline.lte = new Date(deadlineTo);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [items, total] = await Promise.all([
      prisma.procurementOpportunity.findMany({
        where,
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          agency: true,
          documentRequirements: true,
        },
      }),
      prisma.procurementOpportunity.count({ where }),
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
    console.error('List procurement opportunities error:', err);
    res.status(500).json({ error: 'Failed to list procurement opportunities' });
  }
});

/**
 * GET /procurement/opportunities/:id
 */
router.get('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const opportunity = await prisma.procurementOpportunity.findUnique({
      where: { id },
      include: {
        agency: true,
        documentRequirements: true,
      },
    });

    if (!opportunity) {
      return void res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json({ opportunity });
  } catch (err) {
    console.error('Get procurement opportunity error:', err);
    res.status(500).json({ error: 'Failed to get procurement opportunity' });
  }
});

/**
 * POST /procurement/opportunities
 * Create procurement opportunity (GOVERNMENT/ADMIN)
 */
router.post('/opportunities', authenticate, async (req, res) => {
  try {
    if (!isGovernmentOrAdmin(req.user?.userType)) {
      return void res.status(403).json({ error: 'Government or admin access required' });
    }

    const {
      title,
      description,
      agencyId,
      category,
      location,
      valueMin,
      valueMax,
      deadline,
      status,
      tags = [],
      indigenousTargets,
      supplyNationRequired = false,
      documentRequirements = [],
    } = req.body || {};

    if (!title || !agencyId) {
      return void res.status(400).json({ error: 'title and agencyId are required' });
    }

    const opportunity = await prisma.procurementOpportunity.create({
      data: {
        title,
        description,
        agencyId,
        category,
        location,
        valueMin,
        valueMax,
        deadline: deadline ? new Date(deadline) : null,
        status: status || 'OPEN',
        tags,
        indigenousTargets,
        supplyNationRequired,
        createdById: req.user?.id,
        documentRequirements: {
          create: documentRequirements.map((doc: any) => ({
            title: doc.title,
            description: doc.description,
            required: doc.required !== false,
          })),
        },
      },
      include: {
        agency: true,
        documentRequirements: true,
      },
    });

    res.status(201).json({ opportunity });
  } catch (err) {
    console.error('Create procurement opportunity error:', err);
    res.status(500).json({ error: 'Failed to create procurement opportunity' });
  }
});

/**
 * PATCH /procurement/opportunities/:id
 */
router.patch('/opportunities/:id', authenticate, async (req, res) => {
  try {
    if (!isGovernmentOrAdmin(req.user?.userType)) {
      return void res.status(403).json({ error: 'Government or admin access required' });
    }

    const { id } = req.params;
    const data = { ...req.body };
    if (data.deadline) data.deadline = new Date(data.deadline);

    const opportunity = await prisma.procurementOpportunity.update({
      where: { id },
      data,
      include: { agency: true, documentRequirements: true },
    });

    res.json({ opportunity });
  } catch (err) {
    console.error('Update procurement opportunity error:', err);
    res.status(500).json({ error: 'Failed to update procurement opportunity' });
  }
});

// =============================================================================
// AGENCIES
// =============================================================================

/**
 * GET /procurement/agencies
 */
router.get('/agencies', async (req, res) => {
  try {
    const agencies = await prisma.procurementAgency.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ agencies });
  } catch (err) {
    console.error('List agencies error:', err);
    res.status(500).json({ error: 'Failed to list agencies' });
  }
});

/**
 * POST /procurement/agencies
 */
router.post('/agencies', authenticate, async (req, res) => {
  try {
    if (!isGovernmentOrAdmin(req.user?.userType)) {
      return void res.status(403).json({ error: 'Government or admin access required' });
    }

    const { name, level, website, description, contactEmail } = req.body || {};
    if (!name) return void res.status(400).json({ error: 'name is required' });

    const agency = await prisma.procurementAgency.create({
      data: { name, level, website, description, contactEmail },
    });

    res.status(201).json({ agency });
  } catch (err) {
    console.error('Create agency error:', err);
    res.status(500).json({ error: 'Failed to create agency' });
  }
});

// =============================================================================
// PROCUREMENT ALERTS
// =============================================================================

/**
 * GET /procurement/alerts
 */
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const alerts = await prisma.procurementAlert.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ alerts });
  } catch (err) {
    console.error('List procurement alerts error:', err);
    res.status(500).json({ error: 'Failed to list alerts' });
  }
});

/**
 * POST /procurement/alerts
 */
router.post('/alerts', authenticate, async (req, res) => {
  try {
    const { keywords, categories = [], locations = [], minValue, maxValue, isActive = true } = req.body || {};

    const alert = await prisma.procurementAlert.create({
      data: {
        userId: req.user!.id,
        keywords,
        categories,
        locations,
        minValue,
        maxValue,
        isActive,
      },
    });

    res.status(201).json({ alert });
  } catch (err) {
    console.error('Create procurement alert error:', err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * PATCH /procurement/alerts/:id
 */
router.patch('/alerts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await prisma.procurementAlert.update({
      where: { id, userId: req.user!.id },
      data: { ...req.body },
    });

    res.json({ alert });
  } catch (err) {
    console.error('Update procurement alert error:', err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// =============================================================================
// BIDS
// =============================================================================

/**
 * POST /procurement/opportunities/:id/bids
 */
router.post('/opportunities/:id/bids', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { proposalUrl, notes, partners } = req.body || {};

    const bid = await prisma.procurementBid.create({
      data: {
        opportunityId: id,
        userId: req.user!.id,
        proposalUrl,
        notes,
        partners,
      },
    });

    res.status(201).json({ bid });
  } catch (err) {
    console.error('Create bid error:', err);
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

/**
 * PATCH /procurement/bids/:id
 */
router.patch('/bids/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.submittedAt) data.submittedAt = new Date(data.submittedAt);

    const bid = await prisma.procurementBid.findUnique({ where: { id } });
    if (!bid || bid.userId !== req.user!.id) {
      return void res.status(403).json({ error: 'Not authorized to update this bid' });
    }

    const updated = await prisma.procurementBid.update({ where: { id }, data });
    res.json({ bid: updated });
  } catch (err) {
    console.error('Update bid error:', err);
    res.status(500).json({ error: 'Failed to update bid' });
  }
});

export default router;


