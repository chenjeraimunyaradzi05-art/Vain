import express from 'express';
import { z } from 'zod';
import auth from '../middleware/auth';
import { prisma } from '../db';

const router = express.Router();

const tafeSchema = z.object({
    institutionName: z.string().min(2),
    institutionType: z.string().min(2),
    courses: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
});

// POST /tafe/profile - create or update institution profile
router.post('/profile', auth.authenticate, async (req, res) => {
    const parse = tafeSchema.safeParse(req.body);
    if (!parse.success)
        return void res.status(400).json({ error: parse.error.flatten() });
    const userId = (req as any).user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });
    try {
        const data = parse.data;
        const profile = await prisma.institutionProfile.upsert({
            where: { userId },
            create: {
                user: { connect: { id: userId } },
                institutionName: data.institutionName,
                institutionType: data.institutionType,
                courses: data.courses,
                address: data.address,
                phone: data.phone
            },
            update: { ...data }
        });
        return void res.json({ profile });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('TAFE profile error:', err);
        return void res.status(500).json({ error: 'Profile save failed' });
    }
});

// GET /tafe/profile
router.get('/profile', auth.authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    if (!userId)
        return void res.status(401).json({ error: 'Unauthorized' });
    try {
        const profile = await prisma.institutionProfile.findUnique({ where: { userId } });
        return void res.json({ profile });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Fetch TAFE profile error:', err);
        return void res.status(500).json({ error: 'Fetch failed' });
    }
});

export default router;

