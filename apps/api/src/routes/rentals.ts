/**
 * Rentals Routes
 * Phase 5: Housing & Real Estate
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import {
  createRentalListing,
  publishRentalListing,
  searchRentalListings,
  getRentalListing,
  sendRentalInquiry,
  respondToRentalInquiry,
  getOwnerRentalInquiries,
  getOwnerRentalListings,
  upsertSeekerProfile,
  getSeekerProfile,
  searchSeekers,
} from '../services/rentals';

const router = Router();

const listingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  addressLine1: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  weeklyRent: z.number().optional(),
  bond: z.number().optional(),
  currency: z.string().optional(),
  availableFrom: z.string().datetime().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  parking: z.number().optional(),
});

const inquirySchema = z.object({
  rentalListingId: z.string().min(1),
  message: z.string().optional(),
});

const seekerProfileSchema = z.object({
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  currency: z.string().optional(),
  preferredSuburbs: z.array(z.string()).optional(),
  preferredStates: z.array(z.string()).optional(),
  propertyTypes: z.array(z.string()).optional(),
  bedroomsMin: z.number().optional(),
  bathroomsMin: z.number().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const query = req.query;
    const result = await searchRentalListings({
      suburb: query.suburb as string,
      state: query.state as string,
      minRent: query.minRent ? Number(query.minRent) : undefined,
      maxRent: query.maxRent ? Number(query.maxRent) : undefined,
      bedrooms: query.bedrooms ? Number(query.bedrooms) : undefined,
      status: (query.status as any) || undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('[Rentals] Search error:', error);
    res.status(500).json({ error: 'Failed to search rentals' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const parsed = listingSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return void res.status(400).json({ error: 'Invalid listing data', details: parsed.error.errors });
    }

    const listing = await createRentalListing(req.user.id, {
      ...parsed.data,
      availableFrom: parsed.data.availableFrom ? new Date(parsed.data.availableFrom) : undefined,
    } as any);

    res.status(201).json({ listing });
  } catch (error) {
    console.error('[Rentals] Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

router.patch('/:id/publish', authenticate, async (req, res) => {
  try {
    const listing = await publishRentalListing(req.params.id, req.user.id);
    res.json({ listing });
  } catch (error) {
    console.error('[Rentals] Publish listing error:', error);
    res.status(500).json({ error: 'Failed to publish listing' });
  }
});

router.post('/inquiries', authenticate, async (req, res) => {
  try {
    const parsed = inquirySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return void res.status(400).json({ error: 'Invalid inquiry', details: parsed.error.errors });
    }

    const inquiry = await sendRentalInquiry(req.user.id, parsed.data as any);
    res.status(201).json({ inquiry });
  } catch (error) {
    console.error('[Rentals] Send inquiry error:', error);
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
});

router.get('/inquiries/owner', authenticate, async (req, res) => {
  try {
    const status = req.query.status as any;
    const inquiries = await getOwnerRentalInquiries(req.user.id, status);
    res.json({ inquiries });
  } catch (error) {
    console.error('[Rentals] Owner inquiries error:', error);
    res.status(500).json({ error: 'Failed to load inquiries' });
  }
});

router.get('/owner', authenticate, async (req, res) => {
  try {
    const status = req.query.status as any;
    const listings = await getOwnerRentalListings(req.user.id, status);
    res.json({ listings });
  } catch (error) {
    console.error('[Rentals] Owner listings error:', error);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

router.patch('/inquiries/:id', authenticate, async (req, res) => {
  try {
    const status = req.body?.status as any;
    if (!status) return void res.status(400).json({ error: 'status is required' });

    const inquiry = await respondToRentalInquiry(req.params.id, req.user.id, status);
    res.json({ inquiry });
  } catch (error) {
    console.error('[Rentals] Respond inquiry error:', error);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

router.get('/seekers/profile', authenticate, async (req, res) => {
  try {
    const profile = await getSeekerProfile(req.user.id);
    res.json({ profile });
  } catch (error) {
    console.error('[Rentals] Get seeker profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.post('/seekers/profile', authenticate, async (req, res) => {
  try {
    const parsed = seekerProfileSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return void res.status(400).json({ error: 'Invalid profile data', details: parsed.error.errors });
    }

    const profile = await upsertSeekerProfile(req.user.id, parsed.data);
    res.json({ profile });
  } catch (error) {
    console.error('[Rentals] Upsert seeker profile error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

router.get('/seekers', authenticate, async (req, res) => {
  try {
    const result = await searchSeekers({
      preferredStates: req.query.preferredStates ? String(req.query.preferredStates).split(',') : undefined,
      maxBudget: req.query.maxBudget ? Number(req.query.maxBudget) : undefined,
      bedroomsMin: req.query.bedroomsMin ? Number(req.query.bedroomsMin) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.json({ seekers: result });
  } catch (error) {
    console.error('[Rentals] Search seekers error:', error);
    res.status(500).json({ error: 'Failed to search seekers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const listing = await getRentalListing(req.params.id);
    if (!listing) return void res.status(404).json({ error: 'Listing not found' });
    res.json({ listing });
  } catch (error) {
    console.error('[Rentals] Get listing error:', error);
    res.status(500).json({ error: 'Failed to load listing' });
  }
});

export default router;


