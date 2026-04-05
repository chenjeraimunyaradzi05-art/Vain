import express from 'express';
import { z } from 'zod';
import auth from '../middleware/auth';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { stripe, createConnectedAccount, createAccountLink, createTransfer } from '../lib/stripe';

const router = express.Router();

const mentorTestimonials = new Map<string, any[]>();
const mentorPortfolios = new Map<string, any>();
const mentorBadges = new Map<string, string[]>();

const mentorSchema = z.object({
    phone: z.string().min(6).optional(),
    expertise: z.string().max(500).optional(),
    bio: z.string().max(2000).optional(),
});

const mentorMatchSchema = z.object({
    skills: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
    industry: z.string().optional(),
    experienceLevel: z.enum(['junior', 'mid', 'senior', 'executive']).optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    communicationStyle: z.enum(['direct', 'collaborative', 'coaching', 'structured']).optional(),
    availabilityDays: z.array(z.string()).optional(),
    location: z.string().optional(),
});

function normalizeSkillList(input?: string[] | null) {
    return (input || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function computeMatchScore(mentor: any, preferences: any) {
    let score = 0;
    const mentorSkills = normalizeSkillList(mentor.skills || mentor.expertise || []);
    const targetSkills = normalizeSkillList(preferences.skills || []);

    if (targetSkills.length > 0) {
        const matches = targetSkills.filter((s) => mentorSkills.includes(s));
        score += Math.min(40, matches.length * 10);
    }

    if (preferences.industry && mentor.industry && preferences.industry === mentor.industry) score += 15;
    if (preferences.location && mentor.location && mentor.location.toLowerCase().includes(preferences.location.toLowerCase())) score += 10;
    if (preferences.timezone && mentor.timezone && preferences.timezone === mentor.timezone) score += 10;
    if (preferences.language && mentor.language && mentor.language === preferences.language) score += 10;
    if (preferences.communicationStyle && mentor.communicationStyle && mentor.communicationStyle === preferences.communicationStyle) score += 8;
    if (preferences.experienceLevel && mentor.experienceLevel && mentor.experienceLevel === preferences.experienceLevel) score += 7;

    return Math.min(100, score);
}

// POST /mentor/profile - create or update mentor profile
router.post('/profile', auth.authenticate, async (req: any, res: any) => {
    const parse = mentorSchema.safeParse(req.body);
    if (!parse.success)
        return void res.status(400).json({ error: parse.error.flatten() });
    const userId = req.user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });
    try {
        const profile = await prisma.mentorProfile.upsert({ where: { userId }, create: { userId, ...parse.data }, update: { ...parse.data } });
        return void res.json({ profile });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Mentor profile error:', err);
        return void res.status(500).json({ error: 'Profile save failed' });
    }
});

// GET /mentor/profile - fetch mentor profile
router.get('/profile', auth.authenticate, async (req: any, res: any) => {
    const userId = req.user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });
    try {
        const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
        return void res.json({ profile });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Fetch mentor profile error:', err);
        return void res.status(500).json({ error: 'Fetch failed' });
    }
});

// PATCH /mentor/profile - partial update
router.patch('/profile', auth.authenticate, async (req: any, res: any) => {
    const userId = req.user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });
    const partial = mentorSchema.partial().safeParse(req.body);
    if (!partial.success)
        return void res.status(400).json({ error: partial.error.flatten() });
    try {
        const existing = await prisma.mentorProfile.findUnique({ where: { userId } });
        if (!existing)
            return void res.status(404).json({ error: 'Profile not found' });
        const updated = await prisma.mentorProfile.update({ where: { userId }, data: partial.data });
        return void res.json({ profile: updated });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Patch mentor profile error:', err);
        return void res.status(500).json({ error: 'Update failed' });
    }
});

// =============================================================================
// Phase 7: Mentor Discovery & Matching
// =============================================================================

// GET /mentor/search - Search mentors with filters
router.get('/search', async (req: any, res: any) => {
    const { skills, location, industry, experienceLevel, language, timezone, page = '1', limit = '20' } = req.query || {};
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    try {
        const where: any = { active: true };
        if (skills) where.skills = { contains: String(skills), mode: 'insensitive' };
        if (location) where.location = { contains: String(location), mode: 'insensitive' };
        if (industry) where.industry = { contains: String(industry), mode: 'insensitive' };
        
        // Note: experienceLevel, language, timezone are not in Schema currently, ignored or handled via bio search?
        // if (experienceLevel) where.bio = { contains: String(experienceLevel) };

        const [profiles, total] = await Promise.all([
            prisma.mentorProfile.findMany({
                where,
                skip,
                take: limitNum,
                include: { user: true },
            }),
            prisma.mentorProfile.count({ where }),
        ]);

        const mentors = profiles.map((p) => ({
            id: p.userId,
            name: p.name || p.user.name,
            avatar: p.avatar || p.avatarUrl || p.user.avatarUrl,
            bio: p.bio,
            skills: p.skills ? p.skills.split(',').map(s => s.trim()) : [],
            location: p.location,
            title: p.title,
            industry: p.industry,
        }));

        return void res.json({
            mentors,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        console.error('Mentor search error:', err);
        return void res.status(500).json({ error: 'Failed to search mentors' });
    }
});

// POST /mentor/match - Match mentors based on preferences
router.post('/match', auth.authenticate, async (req: any, res: any) => {
    const parse = mentorMatchSchema.safeParse(req.body || {});
    if (!parse.success) return void res.status(400).json({ error: parse.error.flatten() });

    try {
        const profiles = await prisma.mentorProfile.findMany({
            where: { active: true },
            include: { user: true },
            take: 100,
        });

        const mentors = profiles.map(p => ({
            id: p.userId,
            name: p.name || p.user.name,
            avatar: p.avatar || p.avatarUrl || p.user.avatarUrl,
            bio: p.bio,
            skills: p.skills ? p.skills.split(',').map(s => s.trim()) : [],
            location: p.location,
            industry: p.industry,
            // Mapping missing fields to null or bio check
            experienceLevel: null,
            language: null,
            timezone: null,
            communicationStyle: null
        }));

        const scored = mentors.map((mentor: any) => ({
            mentor,
            score: computeMatchScore(mentor, parse.data),
        })).sort((a, b) => b.score - a.score);

        res.json({ matches: scored.slice(0, 20) });
    } catch (err) {
        console.error('Mentor match error:', err);
        res.status(500).json({ error: 'Failed to compute mentor matches' });
    }
});

// GET /mentor/recommendations - Personalized mentor recommendations
router.get('/recommendations', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user?.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                userSkills: { include: { skill: true } },
                memberProfile: true
            },
        });

        const preferences = {
            skills: user?.userSkills.map(s => s.skill.name) || [],
            goals: user?.memberProfile?.careerInterest ? [user.memberProfile.careerInterest] : [],
            location: undefined, // Location not reliably available on User
        };

        const profiles = await prisma.mentorProfile.findMany({
            where: { active: true },
            take: 80,
            include: { user: true }
        });

        const mentors = profiles.map(p => ({
            id: p.userId,
            name: p.name || p.user.name,
            avatar: p.avatar || p.avatarUrl || p.user.avatarUrl,
            bio: p.bio,
            skills: p.skills ? p.skills.split(',').map(s => s.trim()) : [],
            location: p.location,
        }));

        const scored = mentors.map((mentor: any) => ({
            mentor,
            score: computeMatchScore(mentor, preferences),
        })).sort((a, b) => b.score - a.score);

        res.json({ recommendations: scored.slice(0, 12) });
    } catch (err) {
        console.error('Mentor recommendations error:', err);
        res.status(500).json({ error: 'Failed to load recommendations' });
    }
});

// GET /mentor/compare?ids=1,2,3 - Compare mentors
router.get('/compare', async (req: any, res: any) => {
    const ids = String(req.query.ids || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

    if (ids.length < 2) return void res.status(400).json({ error: 'Provide at least two mentor ids to compare' });

    try {
        const profiles = await prisma.mentorProfile.findMany({
            where: { userId: { in: ids } },
            include: { user: true }
        });

        const mentors = profiles.map(p => ({
            id: p.userId,
            name: p.name || p.user.name,
            avatar: p.avatar || p.avatarUrl || p.user.avatarUrl,
            bio: p.bio,
            skills: p.skills ? p.skills.split(',').map(s => s.trim()) : [],
            location: p.location,
            industry: p.industry,
            // Mapping missing fields
            experienceLevel: null,
            language: null,
            timezone: null,
            communicationStyle: null
        }));

        res.json({ mentors });
    } catch (err) {
        console.error('Mentor compare error:', err);
        res.status(500).json({ error: 'Failed to compare mentors' });
    }
});

// GET /mentor/:id/portfolio - Public mentor portfolio
router.get('/:id/portfolio', async (req: any, res: any) => {
    const { id } = req.params;
    const portfolio = mentorPortfolios.get(id) || { headline: null, achievements: [], introVideoUrl: null, testimonials: [] };
    res.json({ portfolio });
});

// POST /mentor/portfolio - Update own portfolio
router.post('/portfolio', auth.authenticate, async (req: any, res: any) => {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const { headline, achievements, introVideoUrl } = req.body || {};
    const existing = mentorPortfolios.get(userId) || { achievements: [], testimonials: [] };

    const updated = {
        ...existing,
        headline: headline ?? existing.headline ?? null,
        achievements: Array.isArray(achievements) ? achievements : existing.achievements || [],
        introVideoUrl: introVideoUrl ?? existing.introVideoUrl ?? null,
    };

    mentorPortfolios.set(userId, updated);
    res.json({ portfolio: updated });
});

// GET /mentor/:id/testimonials - List mentor testimonials
router.get('/:id/testimonials', async (req: any, res: any) => {
    const { id } = req.params;
    const testimonials = mentorTestimonials.get(id) || [];
    res.json({ testimonials });
});

// POST /mentor/:id/testimonials - Add a testimonial
router.post('/:id/testimonials', auth.authenticate, async (req: any, res: any) => {
    const { id } = req.params;
    const { rating, feedback, menteeName } = req.body || {};
    if (!rating || rating < 1 || rating > 5) return void res.status(400).json({ error: 'Rating must be 1-5' });

    const testimonials = mentorTestimonials.get(id) || [];
    const entry = {
        id: `${Date.now()}`,
        rating,
        feedback: feedback || null,
        menteeName: menteeName || 'Anonymous',
        createdAt: new Date().toISOString(),
    };
    testimonials.unshift(entry);
    mentorTestimonials.set(id, testimonials.slice(0, 50));

    res.status(201).json({ testimonial: entry });
});

// GET /mentor/:id/badges - Mentor badges (e.g., First Nations badge)
router.get('/:id/badges', async (req: any, res: any) => {
    const { id } = req.params;
    const badges = mentorBadges.get(id) || [];
    res.json({ badges });
});

// POST /mentor/badges - Update own badges
router.post('/badges', auth.authenticate, async (req: any, res: any) => {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });
    const { badges } = req.body || {};
    const sanitized = Array.isArray(badges) ? badges.map((b) => String(b)) : [];
    mentorBadges.set(userId, sanitized);
    res.json({ badges: sanitized });
});

// =============================================================================
// STRIPE CONNECT - Mentor Onboarding & Payouts
// =============================================================================

// POST /mentor/connect - Create connected Stripe account for mentor (if not present)
router.post('/connect', auth.authenticate, async (req: any, res: any) => {
    const userId = req.user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });

    try {
        const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
        if (!profile)
            return void res.status(404).json({ error: 'Mentor profile not found' });

        if (profile.stripeAccountId) {
            return void res.json({ message: 'Connected account already exists', accountId: profile.stripeAccountId });
        }

        // Create connected account in Stripe
        if (!stripe) {
            return void res.status(400).json({ error: 'Stripe not configured' });
        }

        const account = await createConnectedAccount({ email: req.user.email });

        // Save account id on mentor profile
        const updated = await prisma.mentorProfile.update({ where: { userId }, data: { stripeAccountId: account.id } });

        res.json({ account: { id: account.id, status: account?.capabilities }, profile: updated });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Create connect account error:', err);
        return void res.status(500).json({ error: 'Failed to create connected account' });
    }
});

// GET /mentor/connect/link - Get account onboarding link
router.get('/connect/link', auth.authenticate, async (req: any, res: any) => {
    const userId = req.user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });

    try {
        const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
        if (!profile || !profile.stripeAccountId)
            return void res.status(404).json({ error: 'Connected account not found' });

        if (!stripe) return void res.status(400).json({ error: 'Stripe not configured' });

        const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
        const refreshUrl = `${frontend}/mentor/billing?refresh=1`;
        const returnUrl = `${frontend}/mentor/billing?return=1`;

        const link = await createAccountLink({ accountId: profile.stripeAccountId, refreshUrl, returnUrl });

        res.json({ url: link.url });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Get connect link error:', err);
        return void res.status(500).json({ error: 'Failed to create onboarding link' });
    }
});

// POST /mentor/payouts - Request a payout transfer to connected account (amount in cents)
router.post('/payouts', auth.authenticate, async (req: any, res: any) => {
    const userId = req.user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });

    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0)
        return void res.status(400).json({ error: 'Invalid amount' });

    try {
        const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
        if (!profile || !profile.stripeAccountId)
            return void res.status(404).json({ error: 'Connected account not found' });

        if (!stripe) return void res.status(400).json({ error: 'Stripe not configured' });

        // Create transfer to connected account
        const transfer = await createTransfer({ amount, currency: 'aud', destinationAccountId: profile.stripeAccountId, metadata: { userId } });

        // Record mentor earning
        const earning = await prisma.mentorEarning.create({ data: { mentorId: userId, amount, status: 'paid' } });

        res.json({ transfer, earning });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Payout error:', err);
        return void res.status(500).json({ error: 'Failed to create payout' });
    }
});

export default router;


