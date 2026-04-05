/**
 * Housing Routes
 * Phase 5: Housing & Real Estate Module
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { HousingType } from '@prisma/client';
import {
  createListing,
  publishListing,
  searchListings,
  getListingDetails,
  addListingPhotos,
  sendInquiry,
  respondToInquiry,
  getOwnerInquiries,
  getSeekerInquiries,
  saveListing,
  unsaveListing,
  getSavedListings,
  updateSeekerProfile,
  getSeekerProfile,
  searchSeekers,
} from '../services/womenHousing';

const router = Router();

const listingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  housingType: z.nativeEnum(HousingType),
  address: z.string().optional(),
  suburb: z.string().min(1),
  state: z.string().min(1),
  postcode: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rentPerWeek: z.number().min(0),
  bondAmount: z.number().optional(),
  billsIncluded: z.boolean().optional(),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  parking: z.number().optional(),
  availableFrom: z.string().datetime(),
  minLeaseMonths: z.number().optional(),
  maxLeaseMonths: z.number().optional(),
  womenOnly: z.boolean().optional(),
  firstNationsPreferred: z.boolean().optional(),
  childrenAllowed: z.boolean().optional(),
  petsAllowed: z.boolean().optional(),
  smokingAllowed: z.boolean().optional(),
  accessibilityFeatures: z.array(z.string()).optional(),
  safetyFeatures: z.array(z.string()).optional(),
  safetyNotes: z.string().optional(),
  culturalNotes: z.string().optional(),
  nearCulturalServices: z.boolean().optional(),
  contactMethod: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
});

const photoSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const inquirySchema = z.object({
  listingId: z.string().min(1),
  message: z.string().min(1),
  moveInDate: z.string().datetime().optional(),
  occupants: z.number().optional(),
  hasChildren: z.boolean().optional(),
  hasPets: z.boolean().optional(),
});

const seekerSchema = z.object({
  seekingType: z.array(z.nativeEnum(HousingType)).optional(),
  minBudget: z.number().optional(),
  maxBudget: z.number().optional(),
  preferredSuburbs: z.array(z.string()).optional(),
  preferredStates: z.array(z.string()).optional(),
  occupants: z.number().optional(),
  hasChildren: z.boolean().optional(),
  childrenAges: z.string().optional(),
  hasPets: z.boolean().optional(),
  petDetails: z.string().optional(),
  employmentStatus: z.string().optional(),
  incomeRange: z.string().optional(),
  needsAccessibility: z.boolean().optional(),
  accessibilityNeeds: z.array(z.string()).optional(),
  urgency: z.string().optional(),
  desiredMoveDate: z.string().datetime().optional(),
  bio: z.string().optional(),
  hasReferences: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
});

const agentSchema = z.object({
  displayName: z.string().optional(),
  agencyName: z.string().optional(),
  phone: z.string().optional(),
  websiteUrl: z.string().optional(),
  bio: z.string().optional(),
  licenseNumber: z.string().optional(),
  regions: z.array(z.string()).optional(),
});

const partnershipSchema = z.object({
  listingId: z.string().min(1),
  listingType: z.string().min(1),
  message: z.string().optional(),
});

const mortgageSchema = z.object({
  amount: z.number().min(1),
  deposit: z.number().min(0),
  termYears: z.number().min(1),
  interestRate: z.number().min(0),
  lenderName: z.string().min(1),
});

// =============================================================================
// Listings
// =============================================================================

router.get('/listings', async (req, res) => {
  try {
    const query = req.query;
    const result = await searchListings({
      suburb: query.suburb as string,
      state: query.state as string,
      housingType: query.housingType as HousingType,
      minRent: query.minRent ? Number(query.minRent) : undefined,
      maxRent: query.maxRent ? Number(query.maxRent) : undefined,
      bedrooms: query.bedrooms ? Number(query.bedrooms) : undefined,
      childrenAllowed: query.childrenAllowed === 'true',
      petsAllowed: query.petsAllowed === 'true',
      firstNationsPreferred: query.firstNationsPreferred === 'true',
      accessibilityNeeded: query.accessibilityNeeded === 'true',
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });
    res.json(result);
  } catch (error) {
    console.error('[Housing] Search listings error:', error);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await getListingDetails(req.params.id, req.user?.id);
    if (!listing) return void res.status(404).json({ error: 'Listing not found' });
    res.json({ listing });
  } catch (error) {
    console.error('[Housing] Listing details error:', error);
    res.status(500).json({ error: 'Failed to load listing' });
  }
});

router.post('/listings', authenticate, async (req, res) => {
  try {
    const parsed = listingSchema.parse(req.body);
    const listing = await createListing(req.user.id, {
      ...parsed,
      availableFrom: new Date(parsed.availableFrom),
    } as any);
    res.status(201).json({ listing });
  } catch (error: any) {
    console.error('[Housing] Create listing error:', error);
    res.status(400).json({ error: error?.message || 'Failed to create listing' });
  }
});

router.put('/listings/:id', authenticate, async (req, res) => {
  try {
    const updated = await prisma.womenHousingPortal.update({
      where: { id: req.params.id, ownerId: req.user.id },
      data: {
        ...(req.body?.title ? { title: String(req.body.title) } : {}),
        ...(req.body?.description ? { description: String(req.body.description) } : {}),
        ...(req.body?.suburb ? { suburb: String(req.body.suburb) } : {}),
        ...(req.body?.state ? { state: String(req.body.state) } : {}),
        ...(req.body?.postcode ? { postcode: String(req.body.postcode) } : {}),
        ...(req.body?.rentPerWeek ? { rentPerWeek: Number(req.body.rentPerWeek) } : {}),
        ...(req.body?.bedrooms ? { bedrooms: Number(req.body.bedrooms) } : {}),
        ...(req.body?.bathrooms ? { bathrooms: Number(req.body.bathrooms) } : {}),
      },
    });

    res.json({ listing: updated });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return void res.status(404).json({ error: 'Listing not found' });
    }
    console.error('[Housing] Update listing error:', error);
    res.status(400).json({ error: error?.message || 'Failed to update listing' });
  }
});

router.delete('/listings/:id', authenticate, async (req, res) => {
  try {
    await prisma.womenHousingPortal.delete({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return void res.status(404).json({ error: 'Listing not found' });
    }
    console.error('[Housing] Delete listing error:', error);
    res.status(400).json({ error: error?.message || 'Failed to delete listing' });
  }
});

router.post('/listings/:id/publish', authenticate, async (req, res) => {
  try {
    const listing = await publishListing(req.params.id, req.user.id);
    res.json({ listing });
  } catch (error: any) {
    console.error('[Housing] Publish listing error:', error);
    res.status(400).json({ error: error?.message || 'Failed to publish listing' });
  }
});

router.post('/listings/:id/photos', authenticate, async (req, res) => {
  try {
    const photos = z.array(photoSchema).min(1).parse(req.body?.photos || []);
    const result = await addListingPhotos(req.params.id, req.user.id, photos as any);
    res.status(201).json({ photos: result });
  } catch (error: any) {
    console.error('[Housing] Add photos error:', error);
    res.status(400).json({ error: error?.message || 'Failed to add photos' });
  }
});

router.get('/listings/:id/analytics', authenticate, async (req, res) => {
  try {
    const listing = await prisma.womenHousingPortal.findUnique({
      where: { id: req.params.id },
      select: { id: true, viewCount: true, inquiryCount: true, savedCount: true, createdAt: true },
    });
    if (!listing) return void res.status(404).json({ error: 'Listing not found' });
    res.json({ analytics: listing });
  } catch (error) {
    console.error('[Housing] Listing analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

router.get('/listings/:id/insights', async (req, res) => {
  res.json({
    insights: {
      schoolCatchment: 'Nearby primary school within 2km',
      crimeStats: 'Low reported incidents in the last 12 months',
      transport: 'Bus stop within 350m, train within 2km',
      culturalNotes: 'Community centre nearby',
    },
  });
});

// =============================================================================
// Inquiries
// =============================================================================

router.post('/inquiries', authenticate, async (req, res) => {
  try {
    const parsed = inquirySchema.parse(req.body);
    const inquiry = await sendInquiry(req.user.id, {
      listingId: parsed.listingId,
      message: parsed.message,
      moveInDate: parsed.moveInDate ? new Date(parsed.moveInDate) : undefined,
      occupants: parsed.occupants,
      hasChildren: parsed.hasChildren,
      hasPets: parsed.hasPets,
    });
    res.status(201).json({ inquiry });
  } catch (error: any) {
    console.error('[Housing] Send inquiry error:', error);
    res.status(400).json({ error: error?.message || 'Failed to send inquiry' });
  }
});

router.post('/listings/:id/inquiry', authenticate, async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return void res.status(400).json({ error: 'Message is required' });
    }

    const inquiry = await sendInquiry(req.user.id, {
      listingId: req.params.id,
      message,
      moveInDate: req.body?.moveInDate ? new Date(req.body.moveInDate) : undefined,
      occupants: req.body?.occupants ? Number(req.body.occupants) : undefined,
      hasChildren: Boolean(req.body?.hasChildren),
      hasPets: Boolean(req.body?.hasPets),
    });

    res.status(201).json({ inquiry });
  } catch (error: any) {
    console.error('[Housing] Send inquiry error:', error);
    res.status(400).json({ error: error?.message || 'Failed to send inquiry' });
  }
});
 
router.get('/inquiries/mine', authenticate, async (req, res) => {
  try {
    const inquiries = await getSeekerInquiries(req.user.id, req.query.status as string | undefined);
    res.json({ inquiries });
  } catch (error) {
    console.error('[Housing] Seeker inquiries error:', error);
    res.status(500).json({ error: 'Failed to load inquiries' });
  }
});

router.get('/inquiries/owner', authenticate, async (req, res) => {
  try {
    const inquiries = await getOwnerInquiries(req.user.id, req.query.status as string | undefined);
    res.json({ inquiries });
  } catch (error) {
    console.error('[Housing] Owner inquiries error:', error);
    res.status(500).json({ error: 'Failed to load inquiries' });
  }
});

router.patch('/inquiries/:id', authenticate, async (req, res) => {
  try {
    const status = String(req.body?.status || 'responded') as 'responded' | 'accepted' | 'declined';
    const message = String(req.body?.message || '');
    const inquiry = await respondToInquiry(req.params.id, req.user.id, { message, status });
    res.json({ inquiry });
  } catch (error: any) {
    console.error('[Housing] Respond inquiry error:', error);
    res.status(400).json({ error: error?.message || 'Failed to respond' });
  }
});

// =============================================================================
// Saved listings
// =============================================================================

router.post('/saved/:id', authenticate, async (req, res) => {
  try {
    const save = await saveListing(req.user.id, req.params.id, req.body?.notes);
    res.json({ save });
  } catch (error: any) {
    console.error('[Housing] Save listing error:', error);
    res.status(404).json({ error: error?.message || 'Listing not found' });
  }
});

router.post('/listings/:id/save', authenticate, async (req, res) => {
  try {
    const save = await saveListing(req.user.id, req.params.id, req.body?.notes);
    res.json({ save });
  } catch (error: any) {
    console.error('[Housing] Save listing error:', error);
    res.status(404).json({ error: error?.message || 'Listing not found' });
  }
});

router.delete('/saved/:id', authenticate, async (req, res) => {
  try {
    await unsaveListing(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Housing] Unsave listing error:', error);
    res.status(400).json({ error: error?.message || 'Failed to unsave listing' });
  }
});

router.get('/saved', authenticate, async (req, res) => {
  try {
    const saves = await getSavedListings(req.user.id);
    res.json({ listings: saves, saves });
  } catch (error) {
    console.error('[Housing] Get saved listings error:', error);
    res.status(500).json({ error: 'Failed to load saved listings' });
  }
});

router.get('/my-listings', authenticate, async (req, res) => {
  try {
    const listings = await prisma.womenHousingPortal.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ listings });
  } catch (error) {
    console.error('[Housing] My listings error:', error);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

// =============================================================================
// Seeker profile
// =============================================================================

router.get('/profile', authenticate, async (req, res) => {
  try {
    const profile = await getSeekerProfile(req.user.id);
    res.json({ profile });
  } catch (error) {
    console.error('[Housing] Get seeker profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.post('/profile', authenticate, async (req, res) => {
  try {
    const parsed = seekerSchema.parse(req.body || {});
    const profile = await updateSeekerProfile(req.user.id, {
      ...parsed,
      desiredMoveDate: parsed.desiredMoveDate ? new Date(parsed.desiredMoveDate) : undefined,
    });
    res.json({ profile });
  } catch (error: any) {
    console.error('[Housing] Update seeker profile error:', error);
    res.status(400).json({ error: error?.message || 'Failed to update profile' });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const parsed = seekerSchema.parse(req.body || {});
    const profile = await updateSeekerProfile(req.user.id, {
      ...parsed,
      desiredMoveDate: parsed.desiredMoveDate ? new Date(parsed.desiredMoveDate) : undefined,
    } as any);
    res.status(200).json({ profile });
  } catch (error: any) {
    console.error('[Housing] Update profile error:', error);
    res.status(400).json({ error: error?.message || 'Failed to update profile' });
  }
});

router.get('/seekers', authenticate, async (req, res) => {
  try {
    const profiles = await searchSeekers({
      preferredStates: req.query.preferredStates
        ? String(req.query.preferredStates).split(',').filter(Boolean)
        : undefined,
      maxBudget: req.query.maxBudget ? Number(req.query.maxBudget) : undefined,
      urgency: req.query.urgency as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ profiles });
  } catch (error) {
    console.error('[Housing] Search seekers error:', error);
    res.status(500).json({ error: 'Failed to load seekers' });
  }
});

// =============================================================================
// Agent profiles
// =============================================================================

router.get('/agents', async (_req, res) => {
  try {
    const agents = await prisma.agentProfile.findMany({
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ agents });
  } catch (error) {
    console.error('[Housing] Agents list error:', error);
    res.status(500).json({ error: 'Failed to load agents' });
  }
});

router.get('/agents/me', authenticate, async (req, res) => {
  try {
    const profile = await prisma.agentProfile.findUnique({ where: { userId: req.user.id } });
    res.json({ profile });
  } catch (error) {
    console.error('[Housing] Agent profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.post('/agents/me', authenticate, async (req, res) => {
  try {
    const parsed = agentSchema.parse(req.body || {});
    const profile = await prisma.agentProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...parsed, regions: parsed.regions || [] },
      update: { ...parsed, regions: parsed.regions || [] },
    });
    res.json({ profile });
  } catch (error: any) {
    console.error('[Housing] Agent profile update error:', error);
    res.status(400).json({ error: error?.message || 'Failed to update profile' });
  }
});

// =============================================================================
// Partnerships
// =============================================================================

router.post('/partnerships', authenticate, async (req, res) => {
  try {
    const parsed = partnershipSchema.parse(req.body || {});
    const intention = await prisma.listingPartnershipIntention.create({
      data: {
        userId: req.user.id,
        listingId: parsed.listingId,
        listingType: parsed.listingType,
        message: parsed.message,
      },
    });
    res.status(201).json({ intention });
  } catch (error: any) {
    console.error('[Housing] Partnership create error:', error);
    res.status(400).json({ error: error?.message || 'Failed to create partnership intention' });
  }
});

router.get('/partnerships', authenticate, async (req, res) => {
  try {
    const intentions = await prisma.listingPartnershipIntention.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ intentions });
  } catch (error) {
    console.error('[Housing] Partnership list error:', error);
    res.status(500).json({ error: 'Failed to load partnerships' });
  }
});

router.patch('/partnerships/:id', authenticate, async (req, res) => {
  try {
    const status = String(req.body?.status || 'PENDING');
    const intention = await prisma.listingPartnershipIntention.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ intention });
  } catch (error: any) {
    console.error('[Housing] Partnership update error:', error);
    res.status(400).json({ error: error?.message || 'Failed to update partnership' });
  }
});

// =============================================================================
// Mortgage quotes
// =============================================================================

router.post('/mortgages/quote', authenticate, async (req, res) => {
  try {
    const parsed = mortgageSchema.parse(req.body || {});
    const principal = Math.max(parsed.amount - parsed.deposit, 0);
    const monthlyRate = parsed.interestRate / 100 / 12;
    const months = parsed.termYears * 12;
    const monthlyPayment = monthlyRate === 0
      ? principal / months
      : (monthlyRate * principal) / (1 - Math.pow(1 + monthlyRate, -months));

    const quote = await prisma.mortgageQuote.create({
      data: {
        userId: req.user.id,
        amount: parsed.amount,
        deposit: parsed.deposit,
        termYears: parsed.termYears,
        interestRate: parsed.interestRate,
        monthlyPayment,
        lenderName: parsed.lenderName,
        status: 'DRAFT',
      },
    });

    res.status(201).json({ quote });
  } catch (error: any) {
    console.error('[Housing] Mortgage quote error:', error);
    res.status(400).json({ error: error?.message || 'Failed to create quote' });
  }
});

router.get('/mortgages/quotes', authenticate, async (req, res) => {
  try {
    const quotes = await prisma.mortgageQuote.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ quotes });
  } catch (error) {
    console.error('[Housing] Mortgage quotes error:', error);
    res.status(500).json({ error: 'Failed to load quotes' });
  }
});

// =============================================================================
// Mortgage Calculator Tools (Phase 5 Steps 476-500)
// =============================================================================

/**
 * POST /housing/mortgages/calculate - Calculate mortgage repayments
 */
router.post('/mortgages/calculate', async (req, res) => {
  try {
    const { principal, interestRate, termYears, frequency = 'monthly', extraPayment = 0 } = req.body || {};
    
    if (!principal || !interestRate || !termYears) {
      return void res.status(400).json({ error: 'principal, interestRate, and termYears are required' });
    }

    const monthlyRate = interestRate / 100 / 12;
    const months = termYears * 12;
    
    // Standard mortgage formula
    const monthlyPayment = monthlyRate === 0
      ? principal / months
      : (monthlyRate * principal) / (1 - Math.pow(1 + monthlyRate, -months));

    // Calculate payment frequencies
    const payments = {
      monthly: monthlyPayment,
      fortnightly: monthlyPayment / 2,
      weekly: monthlyPayment / 4,
    };

    // Total interest without extra payments
    const totalInterest = (monthlyPayment * months) - principal;

    // Impact of extra payments
    let extraMonthlyPayment = 0;
    if (frequency === 'fortnightly') {
      extraMonthlyPayment = extraPayment * 26 / 12;
    } else if (frequency === 'weekly') {
      extraMonthlyPayment = extraPayment * 52 / 12;
    } else {
      extraMonthlyPayment = extraPayment;
    }

    const totalMonthlyWithExtra = monthlyPayment + extraMonthlyPayment;
    let remainingBalance = principal;
    let monthsWithExtra = 0;
    let totalPaidWithExtra = 0;

    while (remainingBalance > 0 && monthsWithExtra < months * 2) {
      const interestPortion = remainingBalance * monthlyRate;
      const principalPortion = Math.min(totalMonthlyWithExtra - interestPortion, remainingBalance);
      remainingBalance -= principalPortion;
      totalPaidWithExtra += totalMonthlyWithExtra;
      monthsWithExtra++;
    }

    const interestWithExtra = totalPaidWithExtra - principal;
    const interestSaved = totalInterest - interestWithExtra;
    const monthsSaved = months - monthsWithExtra;

    res.json({
      principal,
      interestRate,
      termYears,
      payments,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalRepayment: Math.round((principal + totalInterest) * 100) / 100,
      withExtraPayments: extraPayment > 0 ? {
        extraPayment,
        frequency,
        newTermMonths: monthsWithExtra,
        interestSaved: Math.round(interestSaved * 100) / 100,
        monthsSaved,
        yearsSaved: Math.round(monthsSaved / 12 * 10) / 10,
      } : null,
    });
  } catch (error) {
    console.error('[Housing] Mortgage calculate error:', error);
    res.status(500).json({ error: 'Failed to calculate mortgage' });
  }
});

/**
 * POST /housing/mortgages/borrowing-capacity - Estimate borrowing capacity
 */
router.post('/mortgages/borrowing-capacity', async (req, res) => {
  try {
    const {
      annualIncome,
      otherIncome = 0,
      monthlyExpenses = 0,
      existingDebts = 0,
      dependents = 0,
      interestRate = 6.5,
    } = req.body || {};

    if (!annualIncome) {
      return void res.status(400).json({ error: 'annualIncome is required' });
    }

    // Basic borrowing capacity calculation
    const totalIncome = annualIncome + otherIncome;
    const monthlyIncome = totalIncome / 12;
    
    // Living expense estimate based on dependents
    const baseExpenses = 1500 + (dependents * 400);
    const totalMonthlyExpenses = Math.max(monthlyExpenses, baseExpenses) + existingDebts;
    
    // Debt service ratio (typically 30-35% of gross income)
    const maxDebtService = monthlyIncome * 0.30;
    const availableForMortgage = Math.max(maxDebtService - existingDebts, 0);
    
    // Calculate max loan from affordable payment
    const monthlyRate = interestRate / 100 / 12;
    const termMonths = 30 * 12; // 30 years
    const maxLoan = monthlyRate === 0
      ? availableForMortgage * termMonths
      : (availableForMortgage * (1 - Math.pow(1 + monthlyRate, -termMonths))) / monthlyRate;

    res.json({
      totalIncome,
      monthlyIncome: Math.round(monthlyIncome),
      estimatedExpenses: Math.round(totalMonthlyExpenses),
      maxMonthlyPayment: Math.round(availableForMortgage),
      estimatedBorrowingCapacity: Math.round(maxLoan / 1000) * 1000, // Round to nearest 1000
      assumptions: {
        interestRate,
        termYears: 30,
        debtServiceRatio: '30%',
      },
      note: 'This is an estimate only. Actual borrowing capacity depends on lender assessment.',
    });
  } catch (error) {
    console.error('[Housing] Borrowing capacity error:', error);
    res.status(500).json({ error: 'Failed to calculate borrowing capacity' });
  }
});

/**
 * POST /housing/mortgages/stamp-duty - Calculate stamp duty by state
 */
router.post('/mortgages/stamp-duty', async (req, res) => {
  try {
    const { propertyValue, state, isFirstHomeBuyer = false, isInvestment = false } = req.body || {};

    if (!propertyValue || !state) {
      return void res.status(400).json({ error: 'propertyValue and state are required' });
    }

    // Simplified stamp duty brackets (real values vary by state)
    const stampDutyRates: Record<string, { brackets: number[]; rates: number[]; fhbThreshold: number }> = {
      NSW: { brackets: [0, 14000, 32000, 85000, 319000, 1064000], rates: [1.25, 1.5, 1.75, 3.5, 4.5, 5.5], fhbThreshold: 800000 },
      VIC: { brackets: [0, 25000, 130000, 960000], rates: [1.4, 2.4, 5, 5.5], fhbThreshold: 750000 },
      QLD: { brackets: [0, 350000, 540000, 1000000], rates: [1.5, 3.5, 4.5, 5.75], fhbThreshold: 700000 },
      WA: { brackets: [0, 120000, 150000, 360000, 725000], rates: [1.9, 2.85, 3.8, 4.75, 5.15], fhbThreshold: 530000 },
      SA: { brackets: [0, 12000, 30000, 50000, 100000, 200000, 250000, 300000, 500000], rates: [1, 2, 3, 3.5, 4, 4.25, 4.75, 5, 5.5], fhbThreshold: 650000 },
      TAS: { brackets: [0, 3000, 25000, 75000, 200000, 375000, 725000], rates: [1.75, 2.25, 3.5, 4, 4.25, 4.5, 4.5], fhbThreshold: 600000 },
      NT: { brackets: [0, 525000, 3000000], rates: [3.99, 4.95, 5.75], fhbThreshold: 650000 },
      ACT: { brackets: [0, 260000, 300000, 500000, 750000, 1000000, 1455000], rates: [0.49, 0.98, 2.48, 4.54, 5.00, 5.01, 5.21], fhbThreshold: 1000000 },
    };

    const stateData = stampDutyRates[state.toUpperCase()];
    if (!stateData) {
      return void res.status(400).json({ error: `Unknown state: ${state}` });
    }

    // Calculate base stamp duty
    let stampDuty = 0;
    let previousBracket = 0;
    
    for (let i = 0; i < stateData.brackets.length; i++) {
      const bracket = stateData.brackets[i];
      const rate = stateData.rates[i] / 100;
      
      if (propertyValue > bracket) {
        const nextBracket = stateData.brackets[i + 1] || propertyValue;
        const taxableAmount = Math.min(propertyValue, nextBracket) - bracket;
        stampDuty += taxableAmount * rate;
      }
    }

    // First home buyer concessions
    let fhbConcession = 0;
    if (isFirstHomeBuyer && propertyValue <= stateData.fhbThreshold) {
      fhbConcession = stampDuty; // Full exemption under threshold
    } else if (isFirstHomeBuyer && propertyValue <= stateData.fhbThreshold * 1.25) {
      fhbConcession = stampDuty * 0.5; // 50% concession
    }

    res.json({
      propertyValue,
      state: state.toUpperCase(),
      stampDuty: Math.round(stampDuty),
      fhbConcession: Math.round(fhbConcession),
      finalStampDuty: Math.round(stampDuty - fhbConcession),
      isFirstHomeBuyer,
      isInvestment,
      note: 'Stamp duty calculations are estimates. Consult your state revenue office for exact figures.',
    });
  } catch (error) {
    console.error('[Housing] Stamp duty error:', error);
    res.status(500).json({ error: 'Failed to calculate stamp duty' });
  }
});

/**
 * GET /housing/mortgages/first-home-schemes - First home buyer schemes info
 */
router.get('/mortgages/first-home-schemes', async (_req, res) => {
  res.json({
    schemes: [
      {
        id: 'fhog',
        name: 'First Home Owner Grant (FHOG)',
        description: 'One-off payment for eligible first home buyers purchasing or building a new home.',
        amount: '$10,000 - $30,000 depending on state',
        eligibility: ['First home buyer', 'Australian citizen or permanent resident', 'New home or substantially renovated'],
        states: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
      },
      {
        id: 'fhlds',
        name: 'First Home Loan Deposit Scheme',
        description: 'Government guarantees part of your deposit, allowing purchase with 5% deposit without LMI.',
        amount: 'Up to 15% guarantee',
        eligibility: ['Single income under $125,000 or couple under $200,000', 'First home buyer', 'Australian citizen'],
        url: 'https://www.housingaustralia.gov.au/support-buy-home/first-home-guarantee',
      },
      {
        id: 'iba',
        name: 'Indigenous Business Australia Home Loans',
        description: 'Home loans specifically for Indigenous Australians with flexible criteria.',
        amount: 'Competitive rates, lower deposits',
        eligibility: ['Aboriginal or Torres Strait Islander', 'Australian citizen or permanent resident'],
        url: 'https://www.iba.gov.au/home-ownership',
      },
      {
        id: 'shared-equity',
        name: 'Shared Equity Schemes',
        description: 'Government co-owns a portion of your home to reduce your mortgage.',
        amount: 'Up to 40% equity share',
        eligibility: ['Income limits apply', 'First home buyer (in some schemes)'],
        states: ['WA', 'VIC'],
      },
    ],
  });
});

/**
 * POST /housing/mortgages/compare - Compare mortgage scenarios
 */
router.post('/mortgages/compare', async (req, res) => {
  try {
    const { scenarios } = req.body || {};

    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return void res.status(400).json({ error: 'scenarios array is required' });
    }

    const results = scenarios.map((scenario: any, index: number) => {
      const { principal, interestRate, termYears, type = 'variable' } = scenario;
      
      if (!principal || !interestRate || !termYears) {
        return { index, error: 'Missing required fields' };
      }

      const monthlyRate = interestRate / 100 / 12;
      const months = termYears * 12;
      const monthlyPayment = monthlyRate === 0
        ? principal / months
        : (monthlyRate * principal) / (1 - Math.pow(1 + monthlyRate, -months));

      const totalRepayment = monthlyPayment * months;
      const totalInterest = totalRepayment - principal;

      return {
        index,
        principal,
        interestRate,
        type,
        termYears,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalInterest: Math.round(totalInterest),
        totalRepayment: Math.round(totalRepayment),
      };
    });

    // Find best option
    const validResults = results.filter((r: any) => !r.error);
    const bestOption = validResults.length > 0
      ? validResults.reduce((best: any, current: any) => 
          current.totalInterest < best.totalInterest ? current : best
        )
      : null;

    res.json({
      scenarios: results,
      bestOption: bestOption?.index,
      recommendation: bestOption ? `Scenario ${bestOption.index + 1} saves the most on interest` : null,
    });
  } catch (error) {
    console.error('[Housing] Mortgage compare error:', error);
    res.status(500).json({ error: 'Failed to compare mortgages' });
  }
});

export default router;


