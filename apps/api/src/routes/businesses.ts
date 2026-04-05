import { Router } from 'express';
import { z } from 'zod';
import * as businessService from '../services/businessService';
import { authenticate } from '../middleware/auth';

const router = Router();

const createBusinessSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  website: z.string().url().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  contacts: z.any().optional(),
});

router.get('/ping', async (req, res) => {
  return res.json({ ok: true });
});

router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const q = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;

    const businesses = await businessService.listBusinesses({ page, limit, q, category });
    res.json({ businesses });
  } catch (error) {
    console.error('Business list error', error);
    res.status(500).json({ error: 'Failed to list businesses' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const input = createBusinessSchema.parse(req.body || {});
    const ownerId = (req as any).user?.id;
    if (!ownerId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    const business = await businessService.createBusiness({
      name: input.name,
      description: input.description,
      website: input.website,
      category: input.category,
      address: input.address,
      contacts: input.contacts,
      ownerId,
    });
    res.status(201).json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Create business error', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const biz = await businessService.getBusiness(req.params.id);
    if (!biz) return void res.status(404).json({ error: 'Business not found' });
    // calculate simple averages
    let avg = null;
    if (biz.ratings && biz.ratings.length) {
      const count = biz.ratings.length;
      const totals = biz.ratings.reduce((acc: any, r: any) => {
        acc.s = (acc.s || 0) + (r.safetyScore || 0);
        acc.g = (acc.g || 0) + (r.genderEquityScore || 0);
        acc.a = (acc.a || 0) + (r.accessibilityScore || 0);
        acc.i = (acc.i || 0) + (r.indigenousInclusionScore || 0);
        return acc;
      }, {});
      avg = {
        safetyScore: Math.round((totals.s / count) * 10) / 10,
        genderEquityScore: Math.round((totals.g / count) * 10) / 10,
        accessibilityScore: Math.round((totals.a / count) * 10) / 10,
        indigenousInclusionScore: Math.round((totals.i / count) * 10) / 10,
      };
    }
    res.json({ business: biz, averages: avg });
  } catch (error) {
    console.error('Get business error', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

const createRatingSchema = z.object({
  safetyScore: z.number().min(0).max(5).optional(),
  genderEquityScore: z.number().min(0).max(5).optional(),
  accessibilityScore: z.number().min(0).max(5).optional(),
  indigenousInclusionScore: z.number().min(0).max(5).optional(),
  summary: z.string().optional(),
});

router.post('/:id/ratings', authenticate, async (req, res) => {
  try {
    const input = createRatingSchema.parse(req.body || {});
    const userId = (req as any).user?.id;
    const rating = await businessService.addRating(req.params.id, userId, input);
    res.status(201).json({ rating });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Add rating error', error);
    res.status(500).json({ error: 'Failed to add rating' });
  }
});

router.get('/:id/ratings', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const ratings = await businessService.listRatings(req.params.id, { page, limit });
    res.json({ ratings });
  } catch (error) {
    console.error('List ratings error', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

export default router;
