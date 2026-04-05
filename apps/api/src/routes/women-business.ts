/**
 * Women Business Routes
 * Phase 2 Steps 151-175: Business tools for women entrepreneurs
 *
 * Notes:
 * - Owner-only write operations
 * - Public directory + marketplace can consume the read/search endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { BusinessStage, WomenBusinessType } from '@prisma/client';
import { prisma } from '../db';
import { authenticate, optionalAuth } from '../middleware/auth';
import {
  addMilestone,
  addProduct,
  addService,
  celebrateMilestone,
  createBusiness,
  createGoal,
  getBusinessStats,
  getGoals,
  getMilestones,
  getUserBusinesses,
  publishBusiness,
    unpublishBusiness,
  searchBusinesses,
  updateBusiness,
  updateGoalProgress,
} from '../services/womenBusiness';

const router = Router();

const createBusinessSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  businessType: z.nativeEnum(WomenBusinessType),
  stage: z.nativeEnum(BusinessStage).optional(),
  abn: z.string().min(1).optional(),
  acn: z.string().min(1).optional(),
  industry: z.string().min(1),
  subIndustry: z.string().min(1).optional(),
  suburb: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  isOnlineOnly: z.boolean().optional(),
  website: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  instagramUrl: z.string().min(1).optional(),
  facebookUrl: z.string().min(1).optional(),
  linkedinUrl: z.string().min(1).optional(),
  tiktokUrl: z.string().min(1).optional(),
  isFirstNationsBusiness: z.boolean().optional(),
  supplyNationCertified: z.boolean().optional(),
});

const updateBusinessSchema = createBusinessSchema.partial();

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  imageUrl: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  priceFrom: z.number().nonnegative().optional(),
  priceTo: z.number().nonnegative().optional(),
  priceUnit: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
});

const createGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  goalType: z.string().min(1).optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().min(1).optional(),
  targetDate: z.string().datetime().optional(),
});

const updateGoalProgressSchema = z.object({
  currentValue: z.number(),
});

const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
});

// Public directory search
router.get('/directory', async (req, res) => {
  try {
    const { industry, state, query, isFirstNationsBusiness, supplyNationCertified, limit, offset } = req.query;

    const result = await searchBusinesses({
      industry: industry ? String(industry) : undefined,
      state: state ? String(state) : undefined,
      query: query ? String(query) : undefined,
      isFirstNationsBusiness: String(isFirstNationsBusiness || '').toLowerCase() === 'true',
      supplyNationCertified: String(supplyNationCertified || '').toLowerCase() === 'true',
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('[women-business] directory search error', error);
    res.status(500).json({ error: 'Failed to search businesses' });
  }
});

// Public business details (published; owner can see drafts)
router.get('/:businessId', optionalAuth, async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const viewerId = (req as any).user?.id as string | undefined;

    const business = await prisma.womenBusiness.findUnique({
      where: { id: businessId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        milestones: {
          orderBy: { achievedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!business) {
      return void res.status(404).json({ error: 'Business not found' });
    }

    if (!business.isPublished && business.ownerId !== viewerId) {
      return void res.status(404).json({ error: 'Business not found' });
    }

    res.json({ business });
  } catch (error) {
    console.error('[women-business] get details error', error);
    res.status(500).json({ error: 'Failed to load business' });
  }
});

// Everything below is owner-authenticated
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const businesses = await getUserBusinesses((req as any).user.id);
    res.json({ businesses });
  } catch (error) {
    console.error('[women-business] list error', error);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
});

router.post('/', async (req, res) => {
  try {
    const input = createBusinessSchema.parse(req.body || {});
    const business = await createBusiness((req as any).user.id, input as any);
    res.status(201).json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[women-business] create error', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

router.patch('/:businessId', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const input = updateBusinessSchema.parse(req.body || {});
    const business = await updateBusiness(businessId, (req as any).user.id, input);
    res.json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to update business';
    res.status(message === 'Business not found' ? 404 : 500).json({ error: message });
  }
});

router.post('/:businessId/publish', async (req, res) => {
  try {
    const business = await publishBusiness(req.params.businessId, (req as any).user.id);
    res.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish business';
    res.status(message === 'Business not found' ? 404 : 400).json({ error: message });
  }
});
router.post('/:businessId/unpublish', async (req, res) => {
  try {
    const business = await unpublishBusiness(req.params.businessId, (req as any).user.id);
    res.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unpublish business';
    res.status(message === 'Business not found' ? 404 : 400).json({ error: message });
  }
});

router.post('/:businessId/products', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const input = createProductSchema.parse(req.body || {});

    const product = await addProduct((req as any).user.id, {
      businessId,
      ...(input as any),
    });

    res.status(201).json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to add product';
    res.status(message === 'Business not found' ? 404 : 500).json({ error: message });
  }
});

router.post('/:businessId/services', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const input = createServiceSchema.parse(req.body || {});

    const service = await addService((req as any).user.id, {
      businessId,
      ...(input as any),
    });

    res.status(201).json({ service });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to add service';
    res.status(message === 'Business not found' ? 404 : 500).json({ error: message });
  }
});

router.get('/:businessId/goals', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const status = req.query.status ? String(req.query.status) : undefined;

    // Ensure owner access
    const business = await prisma.womenBusiness.findFirst({
      where: { id: businessId, ownerId: (req as any).user.id },
      select: { id: true },
    });

    if (!business) {
      return void res.status(404).json({ error: 'Business not found' });
    }

    const goals = await getGoals(businessId, status);
    res.json({ goals });
  } catch (error) {
    console.error('[women-business] goals error', error);
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

router.post('/:businessId/goals', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const input = createGoalSchema.parse(req.body || {});

    const goal = await createGoal((req as any).user.id, {
      businessId,
      ...(input as any),
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    });

    res.status(201).json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to create goal';
    res.status(message === 'Business not found' ? 404 : 400).json({ error: message });
  }
});

router.patch('/goals/:goalId/progress', async (req, res) => {
  try {
    const goalId = req.params.goalId;
    const input = updateGoalProgressSchema.parse(req.body || {});

    const goal = await updateGoalProgress(goalId, (req as any).user.id, input.currentValue);
    res.json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to update goal';
    res.status(message === 'Goal not found' ? 404 : 400).json({ error: message });
  }
});

router.get('/:businessId/milestones', async (req, res) => {
  try {
    const businessId = req.params.businessId;

    // Ensure owner access
    const business = await prisma.womenBusiness.findFirst({
      where: { id: businessId, ownerId: (req as any).user.id },
      select: { id: true },
    });

    if (!business) {
      return void res.status(404).json({ error: 'Business not found' });
    }

    const milestones = await getMilestones(businessId);
    res.json({ milestones });
  } catch (error) {
    console.error('[women-business] milestones error', error);
    res.status(500).json({ error: 'Failed to load milestones' });
  }
});

router.post('/:businessId/milestones', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const input = milestoneSchema.parse(req.body || {});

    const milestone = await addMilestone((req as any).user.id, businessId, input.title, input.description);
    res.status(201).json({ milestone });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Failed to add milestone';
    res.status(message === 'Business not found' ? 404 : 500).json({ error: message });
  }
});

router.post('/milestones/:milestoneId/celebrate', async (req, res) => {
  try {
    const milestone = await celebrateMilestone(req.params.milestoneId, (req as any).user.id);
    res.json({ milestone });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to celebrate milestone';
    res.status(message === 'Milestone not found' ? 404 : 400).json({ error: message });
  }
});

router.get('/:businessId/stats', async (req, res) => {
  try {
    const stats = await getBusinessStats(req.params.businessId, (req as any).user.id);
    res.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load stats';
    res.status(message === 'Business not found' ? 404 : 400).json({ error: message });
  }
});

export default router;


