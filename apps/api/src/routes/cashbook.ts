/**
 * Cashbook Routes
 * Phase 3 Steps 251-275: Business Accounting & Cashbook
 */

import { Router } from 'express';
import { z } from 'zod';
import { CashbookEntryType } from '@prisma/client';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

const createCashbookSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
});

const createEntrySchema = z.object({
  type: z.nativeEnum(CashbookEntryType),
  amount: z.number(),
  currency: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  occurredAt: z.string().datetime(),
});

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const cashbooks = await prisma.businessCashbook.findMany({
      where: { userId: (req as any).user.id },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ cashbooks });
  } catch (error) {
    console.error('[cashbook] list error', error);
    res.status(500).json({ error: 'Failed to load cashbooks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const input = createCashbookSchema.parse(req.body || {});

    const cashbook = await prisma.businessCashbook.create({
      data: {
        userId: (req as any).user.id,
        name: input.name || 'My Cashbook',
        currency: input.currency || 'AUD',
      },
    });

    res.status(201).json({ cashbook });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[cashbook] create error', error);
    res.status(500).json({ error: 'Failed to create cashbook' });
  }
});

router.get('/:cashbookId', async (req, res) => {
  try {
    const cashbook = await prisma.businessCashbook.findFirst({
      where: { id: req.params.cashbookId, userId: (req as any).user.id },
      include: {
        entries: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!cashbook) {
      return void res.status(404).json({ error: 'Cashbook not found' });
    }

    res.json({ cashbook });
  } catch (error) {
    console.error('[cashbook] get error', error);
    res.status(500).json({ error: 'Failed to load cashbook' });
  }
});

router.get('/:cashbookId/entries', async (req, res) => {
  try {
    const cashbookId = req.params.cashbookId;

    const cashbook = await prisma.businessCashbook.findFirst({
      where: { id: cashbookId, userId: (req as any).user.id },
      select: { id: true },
    });

    if (!cashbook) {
      return void res.status(404).json({ error: 'Cashbook not found' });
    }

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const entries = await prisma.businessCashbookEntry.findMany({
      where: {
        cashbookId,
        userId: (req as any).user.id,
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });

    res.json({ entries });
  } catch (error) {
    console.error('[cashbook] entries list error', error);
    res.status(500).json({ error: 'Failed to load cashbook entries' });
  }
});

router.get('/:cashbookId/summary', async (req, res) => {
  try {
    const cashbookId = req.params.cashbookId;

    const cashbook = await prisma.businessCashbook.findFirst({
      where: { id: cashbookId, userId: (req as any).user.id },
      select: { id: true, currency: true },
    });

    if (!cashbook) {
      return void res.status(404).json({ error: 'Cashbook not found' });
    }

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      return void res.status(400).json({ error: 'Invalid date range' });
    }

    const entries = await prisma.businessCashbookEntry.findMany({
      where: {
        cashbookId,
        userId: (req as any).user.id,
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'asc' },
      take: 1000,
    });

    let incomeTotal = 0;
    let expenseTotal = 0;
    const byMonth: Record<string, { month: string; income: number; expense: number; net: number }> = {};

    for (const entry of entries) {
      const amount = Number(entry.amount || 0);
      const monthKey = entry.occurredAt.toISOString().slice(0, 7);
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { month: monthKey, income: 0, expense: 0, net: 0 };
      }
      if (entry.type === 'INCOME') {
        incomeTotal += amount;
        byMonth[monthKey].income += amount;
        byMonth[monthKey].net += amount;
      } else {
        expenseTotal += amount;
        byMonth[monthKey].expense += amount;
        byMonth[monthKey].net -= amount;
      }
    }

    res.json({
      currency: cashbook.currency || 'AUD',
      totals: {
        income: incomeTotal,
        expense: expenseTotal,
        net: incomeTotal - expenseTotal,
      },
      monthly: Object.values(byMonth),
      count: entries.length,
    });
  } catch (error) {
    console.error('[cashbook] summary error', error);
    res.status(500).json({ error: 'Failed to load cashbook summary' });
  }
});

router.get('/:cashbookId/categories', async (req, res) => {
  try {
    const cashbookId = req.params.cashbookId;

    const cashbook = await prisma.businessCashbook.findFirst({
      where: { id: cashbookId, userId: (req as any).user.id },
      select: { id: true, currency: true },
    });

    if (!cashbook) {
      return void res.status(404).json({ error: 'Cashbook not found' });
    }

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      return void res.status(400).json({ error: 'Invalid date range' });
    }

    const grouped = await prisma.businessCashbookEntry.groupBy({
      by: ['category', 'type'],
      where: {
        cashbookId,
        userId: (req as any).user.id,
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
      orderBy: { category: 'asc' },
    });

    const categories = grouped.map((row) => ({
      category: row.category || 'Uncategorized',
      type: row.type,
      amount: Number(row._sum.amount || 0),
    }));

    res.json({ currency: cashbook.currency || 'AUD', categories });
  } catch (error) {
    console.error('[cashbook] categories error', error);
    res.status(500).json({ error: 'Failed to load category breakdown' });
  }
});

router.get('/:cashbookId/export/csv', async (req, res) => {
  try {
    const cashbookId = req.params.cashbookId;

    const cashbook = await prisma.businessCashbook.findFirst({
      where: { id: cashbookId, userId: (req as any).user.id },
      select: { id: true, name: true },
    });

    if (!cashbook) {
      return void res.status(404).json({ error: 'Cashbook not found' });
    }

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      return void res.status(400).json({ error: 'Invalid date range' });
    }

    const entries = await prisma.businessCashbookEntry.findMany({
      where: {
        cashbookId,
        userId: (req as any).user.id,
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 2000,
    });

    const header = ['type', 'amount', 'currency', 'category', 'description', 'occurredAt'];
    const escape = (v: any) => `"${String(v ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    for (const entry of entries) {
      const row = [
        entry.type,
        entry.amount,
        entry.currency,
        entry.category || '',
        entry.description || '',
        entry.occurredAt.toISOString(),
      ];
      lines.push(row.map((v) => escape(v)).join(','));
    }

    const safeFileName = String(cashbook.name || 'cashbook')
      .replace(/[^a-z0-9\- _]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName || 'cashbook'}.csv"`);
    res.status(200).send(lines.join('\n'));
  } catch (error) {
    console.error('[cashbook] export csv error', error);
    res.status(500).json({ error: 'Failed to export cashbook' });
  }
});

router.post('/:cashbookId/entries', async (req, res) => {
  try {
    const cashbookId = req.params.cashbookId;
    const input = createEntrySchema.parse(req.body || {});

    const cashbook = await prisma.businessCashbook.findFirst({
      where: { id: cashbookId, userId: (req as any).user.id },
      select: { id: true, currency: true },
    });

    if (!cashbook) {
      return void res.status(404).json({ error: 'Cashbook not found' });
    }

    const entry = await prisma.businessCashbookEntry.create({
      data: {
        cashbookId,
        userId: (req as any).user.id,
        type: input.type,
        amount: input.amount as any,
        currency: input.currency || cashbook.currency || 'AUD',
        category: input.category,
        description: input.description,
        occurredAt: new Date(input.occurredAt),
      },
    });

    res.status(201).json({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[cashbook] create entry error', error);
    res.status(500).json({ error: 'Failed to create cashbook entry' });
  }
});

router.delete('/entries/:entryId', async (req, res) => {
  try {
    const entry = await prisma.businessCashbookEntry.findFirst({
      where: { id: req.params.entryId, userId: (req as any).user.id },
      select: { id: true },
    });

    if (!entry) {
      return void res.status(404).json({ error: 'Cashbook entry not found' });
    }

    await prisma.businessCashbookEntry.delete({ where: { id: req.params.entryId } });
    res.status(204).send();
  } catch (error) {
    console.error('[cashbook] delete entry error', error);
    res.status(500).json({ error: 'Failed to delete cashbook entry' });
  }
});

export default router;

