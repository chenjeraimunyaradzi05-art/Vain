import express from 'express';
import { CompanyService } from '../services/companyService';
import { validateRequest } from '../middleware/validate';
import { companyProfileSchema } from '../schemas/company';
import { authenticate, optionalAuth } from '../middleware/auth';
import { prisma } from '../db';

const router = express.Router();

router.get('/', optionalAuth(), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const industry = req.query.industry ? String(req.query.industry) : undefined;

    const where: any = {};
    if (industry) {
      where.industry = { contains: industry, mode: 'insensitive' };
    }

    const [companies, total] = await Promise.all([
      prisma.companyProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.companyProfile.count({ where }),
    ]);

    res.json({
      data: companies,
      meta: { page, limit, total },
    });
  } catch (error) {
    console.error('[Companies] list error:', error);
    res.json({ data: [], meta: { page: 1, limit: 20, total: 0 } });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const name = String(req.body?.name || req.body?.companyName || '').trim();
    const industry = String(req.body?.industry || 'Other').trim();
    const description = req.body?.description ? String(req.body.description) : undefined;

    if (!name) {
      return void res.status(400).json({ error: 'Company name is required' });
    }

    const profile = await prisma.companyProfile.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        companyName: name,
        industry,
        description,
      },
      update: {
        companyName: name,
        industry,
        description,
      },
    });

    res.status(201).json({ company: profile });
  } catch (error) {
    console.error('[Companies] create error:', error);
    res.status(400).json({ error: 'Failed to create company' });
  }
});

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const profile = await CompanyService.getProfile(userId);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.post('/profile', authenticate, validateRequest(companyProfileSchema), async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const profile = await CompanyService.updateProfile(userId, req.body);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', authenticate, validateRequest(companyProfileSchema), async (req, res, next) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    // Reuse update logic as upsert handles both
    const profile = await CompanyService.updateProfile(userId, req.body);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', optionalAuth(), async (req, res) => {
  try {
    const company = await prisma.companyProfile.findUnique({
      where: { id: req.params.id },
    });

    if (!company) {
      return void res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company });
  } catch (error) {
    console.error('[Companies] get error:', error);
    res.status(500).json({ error: 'Failed to load company' });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user?.userType === 'ADMIN' || req.user?.role === 'ADMIN';
    const where: any = { id: req.params.id };
    if (!isAdmin) {
      where.userId = req.user!.id;
    }

    const updated = await prisma.companyProfile.update({
      where,
      data: {
        ...(req.body?.name ? { companyName: String(req.body.name) } : {}),
        ...(req.body?.companyName ? { companyName: String(req.body.companyName) } : {}),
        ...(req.body?.industry ? { industry: String(req.body.industry) } : {}),
        ...(req.body?.description ? { description: String(req.body.description) } : {}),
      },
    });

    res.json({ company: updated });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return void res.status(404).json({ error: 'Company not found' });
    }
    console.error('[Companies] update error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user?.userType === 'ADMIN' || req.user?.role === 'ADMIN';
    const where: any = { id: req.params.id };
    if (!isAdmin) {
      where.userId = req.user!.id;
    }

    await prisma.companyProfile.delete({ where });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return void res.status(404).json({ error: 'Company not found' });
    }
    console.error('[Companies] delete error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;

