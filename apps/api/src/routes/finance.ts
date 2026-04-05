/**
 * Finance & Accounting Routes
 * Ledger, Journals, Tax, Inventory, Budgeting, Reporting
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { getUserFinance, saveUserFinance } from '../modules/finance/financeStore';
import { createJournalEntry } from '../modules/finance/services/journalService';
import { listLedgerEntries, calculateTrialBalance } from '../modules/finance/services/ledgerService';
import { calculateTaxLines, summarizeTax, generateTaxInsights } from '../modules/finance/services/taxService';
import { listTaxProfiles, createTaxProfile } from '../modules/finance/services/taxProfileService';
import { listChartOfAccounts, seedDefaultChart, upsertAccount } from '../modules/finance/services/accountsService';
import { buildTaxReport } from '../modules/finance/services/taxReportService';
import { getFinanceSettings, updateFinanceSettings } from '../modules/finance/services/settingsService';
import { createClosingEntry } from '../modules/finance/services/closingService';
import { listPeriods, createPeriod, closePeriod } from '../modules/finance/services/periodService';
import { buildInventoryValuationReport } from '../modules/finance/services/inventoryReportService';
import { buildTaxReturn } from '../modules/finance/services/taxReturnService';
import { listInventory, upsertInventoryItem, applyInventoryTransaction } from '../modules/finance/services/inventoryService';
import { listBudgets, createBudget, updateBudgetActuals } from '../modules/finance/services/budgetService';
import { generateReport } from '../modules/finance/services/reportingService';

const router = Router();

router.use(authenticate);

const journalSchema = z.object({
  date: z.string().datetime(),
  description: z.string().optional(),
  referenceId: z.string().optional(),
  currency: z.string().optional(),
  lines: z.array(z.object({
    account: z.string().min(1),
    debit: z.number().optional().default(0),
    credit: z.number().optional().default(0),
    memo: z.string().optional(),
    taxCategory: z.string().optional(),
    tags: z.array(z.string()).optional(),
    entityId: z.string().optional(),
  })).min(1),
});

const taxCalcSchema = z.object({
  lines: z.array(z.object({
    category: z.string().min(1),
    rate: z.number().min(0),
    amount: z.number(),
    inclusive: z.boolean().optional(),
  })).min(1),
});

const taxProfileSchema = z.object({
  name: z.string().min(1),
  jurisdiction: z.string().min(1),
  rates: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    rate: z.number().min(0),
    inclusive: z.boolean().default(false),
    account: z.string().optional(),
  })).min(1),
});

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  parentCode: z.string().optional(),
  currency: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const settingsSchema = z.object({
  valuationMethod: z.enum(['FIFO', 'LIFO', 'AVG']).optional(),
  defaultCurrency: z.string().optional(),
});

const closingSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  date: z.string().datetime(),
  equityAccount: z.string().optional(),
  description: z.string().optional(),
});

const periodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const inventoryItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  uom: z.string().min(1),
  category: z.string().optional(),
  currency: z.string().optional(),
});

const inventoryTransactionSchema = z.object({
  sku: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'ADJUST']),
  quantity: z.number().positive(),
  unitCost: z.number().optional(),
  date: z.string().datetime().optional(),
  referenceId: z.string().optional(),
  memo: z.string().optional(),
});

const budgetSchema = z.object({
  name: z.string().min(1),
  currency: z.string().optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  categories: z.array(z.object({
    name: z.string().min(1),
    limit: z.number().min(0),
  })).min(1),
});

const budgetActualsSchema = z.object({
  actuals: z.record(z.number()),
});

router.get('/ledger', async (req, res) => {
  try {
    const entries = await listLedgerEntries((req as any).user.id, {
      account: req.query.account ? String(req.query.account) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    });
    res.json({ entries });
  } catch (error) {
    console.error('[finance] ledger error', error);
    res.status(500).json({ error: 'Failed to load ledger entries' });
  }
});

router.get('/trial-balance', async (req, res) => {
  try {
    const entries = await listLedgerEntries((req as any).user.id, {
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    });
    const trialBalance = calculateTrialBalance(entries);
    res.json({ trialBalance });
  } catch (error) {
    console.error('[finance] trial balance error', error);
    res.status(500).json({ error: 'Failed to calculate trial balance' });
  }
});

router.get('/journals', async (req, res) => {
  try {
    const data = await getUserFinance((req as any).user.id);
    res.json({ journals: data.journals });
  } catch (error) {
    console.error('[finance] journals error', error);
    res.status(500).json({ error: 'Failed to load journals' });
  }
});

router.get('/chart', async (req, res) => {
  try {
    const chart = await listChartOfAccounts((req as any).user.id);
    res.json({ chart });
  } catch (error) {
    console.error('[finance] chart error', error);
    res.status(500).json({ error: 'Failed to load chart of accounts' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await getFinanceSettings((req as any).user.id);
    res.json({ settings });
  } catch (error) {
    console.error('[finance] settings error', error);
    res.status(500).json({ error: 'Failed to load finance settings' });
  }
});

router.get('/periods', async (req, res) => {
  try {
    const periods = await listPeriods((req as any).user.id);
    res.json({ periods });
  } catch (error) {
    console.error('[finance] periods error', error);
    res.status(500).json({ error: 'Failed to load periods' });
  }
});

router.post('/periods', async (req, res) => {
  try {
    const input = periodSchema.parse(req.body || {});
    const period = await createPeriod((req as any).user.id, input as any);
    res.status(201).json({ period });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] period create error', error);
    res.status(500).json({ error: 'Failed to create period' });
  }
});

router.post('/periods/:periodId/close', async (req, res) => {
  try {
    const period = await closePeriod((req as any).user.id, req.params.periodId);
    res.json({ period });
  } catch (error) {
    console.error('[finance] period close error', error);
    res.status(500).json({ error: 'Failed to close period' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const input = settingsSchema.parse(req.body || {});
    const settings = await updateFinanceSettings((req as any).user.id, input);
    res.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] settings update error', error);
    res.status(500).json({ error: 'Failed to update finance settings' });
  }
});

router.post('/chart/seed', async (req, res) => {
  try {
    const template = req.query.template ? String(req.query.template).toUpperCase() : 'DEFAULT';
    const chart = await seedDefaultChart((req as any).user.id, template);
    res.status(201).json({ chart });
  } catch (error) {
    console.error('[finance] chart seed error', error);
    res.status(500).json({ error: 'Failed to seed chart of accounts' });
  }
});

router.post('/chart', async (req, res) => {
  try {
    const input = accountSchema.parse(req.body || {});
    const account = await upsertAccount((req as any).user.id, input as any);
    res.status(201).json({ account });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] chart upsert error', error);
    res.status(500).json({ error: 'Failed to save chart account' });
  }
});

router.post('/journals', async (req, res) => {
  try {
    const input = journalSchema.parse(req.body || {});
    const result = await createJournalEntry((req as any).user.id, {
      ...input,
      postedBy: (req as any).user.id,
    } as any);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] journal create error', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.post('/tax/calculate', async (req, res) => {
  try {
    const input = taxCalcSchema.parse(req.body || {});
    const lines = calculateTaxLines(input.lines as any);
    const summary = summarizeTax(lines);
    res.json({ lines, summary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] tax calculate error', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

router.get('/tax/profiles', async (req, res) => {
  try {
    const profiles = await listTaxProfiles((req as any).user.id);
    res.json({ profiles });
  } catch (error) {
    console.error('[finance] tax profiles error', error);
    res.status(500).json({ error: 'Failed to load tax profiles' });
  }
});

router.post('/tax/profiles', async (req, res) => {
  try {
    const input = taxProfileSchema.parse(req.body || {});
    const profile = await createTaxProfile((req as any).user.id, input as any);
    res.status(201).json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] tax profile create error', error);
    res.status(500).json({ error: 'Failed to create tax profile' });
  }
});

router.get('/tax/insights', async (req, res) => {
  try {
    const data = await getUserFinance((req as any).user.id);
    const uncategorized = data.ledgers.filter((entry) => !entry.taxCategory);
    const insights = generateTaxInsights([]);
    if (uncategorized.length > 0) {
      insights.unshift(`There are ${uncategorized.length} ledger entries without a tax category. Tag them to improve return tracking.`);
    }
    res.json({ insights });
  } catch (error) {
    console.error('[finance] tax insights error', error);
    res.status(500).json({ error: 'Failed to generate tax insights' });
  }
});

router.get('/tax/report', async (req, res) => {
  try {
    const data = await getUserFinance((req as any).user.id);
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const entries = data.ledgers.filter((entry) => {
      const date = new Date(entry.date);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });

    const profileId = req.query.profileId ? String(req.query.profileId) : undefined;
    const profile = profileId ? data.taxProfiles.find((p) => p.id === profileId) : data.taxProfiles[0];
    const report = buildTaxReport(entries, profile);

    res.json({ report, profile });
  } catch (error) {
    console.error('[finance] tax report error', error);
    res.status(500).json({ error: 'Failed to build tax report' });
  }
});

router.get('/tax/return', async (req, res) => {
  try {
    const data = await getUserFinance((req as any).user.id);
    const periodStart = req.query.from ? String(req.query.from) : new Date(new Date().getFullYear(), 0, 1).toISOString();
    const periodEnd = req.query.to ? String(req.query.to) : new Date().toISOString();
    const from = new Date(periodStart);
    const to = new Date(periodEnd);

    const entries = data.ledgers.filter((entry) => {
      const date = new Date(entry.date);
      return date >= from && date <= to;
    });

    const profileId = req.query.profileId ? String(req.query.profileId) : undefined;
    const profile = profileId ? data.taxProfiles.find((p) => p.id === profileId) : data.taxProfiles[0];
    const taxReturn = buildTaxReturn(entries, profile, periodStart, periodEnd);
    res.json({ taxReturn, profile });
  } catch (error) {
    console.error('[finance] tax return error', error);
    res.status(500).json({ error: 'Failed to build tax return' });
  }
});

router.get('/inventory/report', async (req, res) => {
  try {
    const asOf = req.query.asOf ? String(req.query.asOf) : undefined;
    const report = await buildInventoryValuationReport((req as any).user.id, asOf);
    res.json({ report });
  } catch (error) {
    console.error('[finance] inventory report error', error);
    res.status(500).json({ error: 'Failed to build inventory report' });
  }
});

router.post('/close-period', async (req, res) => {
  try {
    const input = closingSchema.parse(req.body || {});
    const data = await getUserFinance((req as any).user.id);
    const result = await createClosingEntry((req as any).user.id, {
      entries: data.ledgers,
      from: input.from,
      to: input.to,
      date: input.date,
      description: input.description,
      equityAccount: input.equityAccount,
    });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] close period error', error);
    res.status(500).json({ error: 'Failed to create closing entry' });
  }
});

router.get('/inventory/items', async (req, res) => {
  try {
    const items = await listInventory((req as any).user.id);
    res.json({ items });
  } catch (error) {
    console.error('[finance] inventory list error', error);
    res.status(500).json({ error: 'Failed to load inventory' });
  }
});

router.post('/inventory/items', async (req, res) => {
  try {
    const input = inventoryItemSchema.parse(req.body || {});
    const item = await upsertInventoryItem((req as any).user.id, input as any);
    res.status(201).json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] inventory create error', error);
    res.status(500).json({ error: 'Failed to save inventory item' });
  }
});

router.post('/inventory/transactions', async (req, res) => {
  try {
    const input = inventoryTransactionSchema.parse(req.body || {});
    const result = await applyInventoryTransaction((req as any).user.id, input as any);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] inventory transaction error', error);
    res.status(500).json({ error: 'Failed to apply inventory transaction' });
  }
});

router.get('/budgets', async (req, res) => {
  try {
    const budgets = await listBudgets((req as any).user.id);
    res.json({ budgets });
  } catch (error) {
    console.error('[finance] budgets list error', error);
    res.status(500).json({ error: 'Failed to load budgets' });
  }
});

router.post('/budgets', async (req, res) => {
  try {
    const input = budgetSchema.parse(req.body || {});
    const budget = await createBudget((req as any).user.id, input as any);
    res.status(201).json({ budget });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] budget create error', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

router.patch('/budgets/:budgetId/actuals', async (req, res) => {
  try {
    const input = budgetActualsSchema.parse(req.body || {});
    const budget = await updateBudgetActuals((req as any).user.id, req.params.budgetId, input.actuals);
    res.json({ budget });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('[finance] budget update error', error);
    res.status(500).json({ error: 'Failed to update budget actuals' });
  }
});

router.get('/reports/:type', async (req, res) => {
  try {
    const type = String(req.params.type || '').toUpperCase();
    if (!['PL', 'BS', 'CF', 'TB'].includes(type)) {
      return void res.status(400).json({ error: 'Invalid report type' });
    }
    const report = await generateReport((req as any).user.id, type as any, String(req.query.currency || 'AUD'));
    res.json({ report });
  } catch (error) {
    console.error('[finance] report error', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.post('/seed/demo', async (req, res) => {
  try {
    const data = await getUserFinance((req as any).user.id);
    data.ledgers = [];
    data.journals = [];
    await saveUserFinance((req as any).user.id, data);
    res.json({ ok: true });
  } catch (error) {
    console.error('[finance] seed error', error);
    res.status(500).json({ error: 'Failed to reset finance data' });
  }
});

export default router;
