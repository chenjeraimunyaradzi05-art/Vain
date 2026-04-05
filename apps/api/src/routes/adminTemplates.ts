import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { prisma } from '../db';
import { z } from 'zod';

const router = express.Router();

function getMentorshipAdminStore() {
  const prismaClient = prisma as any;

  if (prismaClient.mentorship?.findMany) {
    return {
      list: () =>
        prismaClient.mentorship.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      countTotal: () => prismaClient.mentorship.count(),
      countActive: () =>
        prismaClient.mentorship.count({
          where: { status: { in: ['active', 'ACTIVE'] } },
        }),
    };
  }

  if (prismaClient.mentorSession?.findMany) {
    return {
      list: () =>
        prismaClient.mentorSession.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            mentor: { select: { id: true, firstName: true, lastName: true, email: true } },
            mentee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
      countTotal: () => prismaClient.mentorSession.count(),
      countActive: () =>
        prismaClient.mentorSession.count({
          where: { status: { in: ['SCHEDULED', 'CONFIRMED'] } },
        }),
    };
  }

  return null;
}

// GET /admin/mentorships - list mentorships (admin)
router.get('/mentorships', authenticate, requireAdmin, async (req, res) => {
  try {
    const store = getMentorshipAdminStore();
    if (!store) {
      return void res.json({ mentorships: [] });
    }

    const mentorships = await store.list();
    return void res.json({ mentorships });
  } catch (err) {
    console.error('list mentorships error', err);
    return void res.status(500).json({ error: 'Failed to fetch mentorships' });
  }
});

// GET /admin/mentorships/analytics - mentorship analytics (admin)
router.get('/mentorships/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const store = getMentorshipAdminStore();
    if (!store) {
      return void res.json({ total: 0, active: 0 });
    }

    const [total, active] = await Promise.all([store.countTotal(), store.countActive()]);
    return void res.json({ total, active });
  } catch (err) {
    console.error('mentorship analytics error', err);
    return void res.status(500).json({ error: 'Failed to fetch mentorship analytics' });
  }
});

// GET /admin/email-templates - list templates
router.get('/email-templates', authenticate, requireAdmin, async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } });
    return void res.json({ templates });
  } catch (err) {
    console.error('list templates error', err);
    return void res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /admin/email-templates/:key
router.get('/email-templates/:key', authenticate, requireAdmin, async (req, res) => {
  const key = req.params.key;
  try {
    const t = await prisma.emailTemplate.findUnique({ where: { key } });
    if (!t) return void res.status(404).json({ error: 'Not found' });
    return void res.json({ template: t });
  } catch (err) {
    console.error('get template error', err);
    return void res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// PATCH /admin/email-templates/:key - update template
router.patch('/email-templates/:key', authenticate, requireAdmin, async (req, res) => {
  const key = req.params.key;
  const schema = z.object({
    subject: z.string().min(1).optional(),
    text: z.string().optional(),
    html: z.string().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return void res.status(400).json({ error: parse.error.flatten() });
  try {
    const existing = await prisma.emailTemplate.findUnique({ where: { key } });
    if (!existing) return void res.status(404).json({ error: 'Not found' });
    const updated = await prisma.emailTemplate.update({ where: { key }, data: { ...parse.data } });
    return void res.json({ template: updated });
  } catch (err) {
    console.error('update template error', err);
    return void res.status(500).json({ error: 'Failed to update template' });
  }
});

export default router;
