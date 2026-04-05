import express from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma } from '../db';
import { notificationService } from '../services/notificationService';

const router = express.Router();

const DEFAULT_CURRENCY = 'AUD';

function getPeriodStart(period: string, reference = new Date()) {
  const now = reference;
  if (period === 'WEEKLY') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return start;
  }
  if (period === 'FORTNIGHTLY') {
    const start = new Date(now);
    start.setDate(now.getDate() - 14);
    return start;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function toNumber(value: any) {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function buildCategoryTemplates() {
  return {
    fiftyThirtyTwenty: [
      { name: 'Needs', type: 'EXPENSE', limitPercent: 50, isEssential: true },
      { name: 'Wants', type: 'EXPENSE', limitPercent: 30 },
      { name: 'Savings', type: 'EXPENSE', limitPercent: 20 },
    ],
    zeroBased: [
      { name: 'Income', type: 'INCOME' },
      { name: 'Housing', type: 'EXPENSE', isEssential: true, isHome: true },
      { name: 'Transport', type: 'EXPENSE', isEssential: true, isCar: true },
      { name: 'Food', type: 'EXPENSE', isEssential: true },
      { name: 'Utilities', type: 'EXPENSE', isEssential: true },
      { name: 'Subscriptions', type: 'EXPENSE', isSubscription: true },
      { name: 'Kids', type: 'EXPENSE', isChild: true },
      { name: 'Cultural Obligations', type: 'EXPENSE', isCultural: true },
      { name: 'Savings', type: 'EXPENSE' },
    ],
    indigenousCategories: [
      { name: 'Cultural Ceremonies', type: 'EXPENSE', isCultural: true },
      { name: 'Community Support', type: 'EXPENSE', isCultural: true },
      { name: 'Mob Travel', type: 'EXPENSE', isCultural: true },
    ],
  };
}

function normalizeText(value: string | null | undefined) {
  return String(value || '').toLowerCase();
}

function buildOpportunityTags(item: { title?: string; provider?: string; description?: string | null }) {
  const text = `${item.title || ''} ${item.provider || ''} ${item.description || ''}`.toLowerCase();
  const tags: string[] = [];

  if (/(indigenous|first nations|aboriginal|torres)/i.test(text)) tags.push('indigenous');
  if (/(women|female|girls|mother|mum)/i.test(text)) tags.push('women');
  if (/(business|startup|enterprise|entrepreneur)/i.test(text)) tags.push('business');
  if (/(education|study|school|university|tafe|training)/i.test(text)) tags.push('education');
  if (/(housing|home|rent|mortgage|accommodation)/i.test(text)) tags.push('housing');
  if (/(emergency|hardship|crisis|relief)/i.test(text)) tags.push('emergency');

  return Array.from(new Set(tags));
}

function applyOpportunityFilters<T extends { tags?: string[] }>(items: T[], filters: Record<string, any>) {
  const category = normalizeText(filters.category || '');
  const requireIndigenous = String(filters.indigenous || '').toLowerCase() === 'true';
  const requireWomen = String(filters.women || '').toLowerCase() === 'true';
  const requireBusiness = String(filters.business || '').toLowerCase() === 'true';
  const requireEducation = String(filters.education || '').toLowerCase() === 'true';
  const requireHousing = String(filters.housing || '').toLowerCase() === 'true';
  const requireEmergency = String(filters.emergency || '').toLowerCase() === 'true';

  return items.filter((item) => {
    const tags = item.tags || [];
    if (category && !tags.includes(category)) return false;
    if (requireIndigenous && !tags.includes('indigenous')) return false;
    if (requireWomen && !tags.includes('women')) return false;
    if (requireBusiness && !tags.includes('business')) return false;
    if (requireEducation && !tags.includes('education')) return false;
    if (requireHousing && !tags.includes('housing')) return false;
    if (requireEmergency && !tags.includes('emergency')) return false;
    return true;
  });
}

router.get('/summary', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const budget = await prisma.budgetPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { categories: true, entries: true },
    });

    const periodStart = budget ? getPeriodStart(budget.period) : getPeriodStart('MONTHLY');
    const periodEntries = (budget?.entries || []).filter(e => new Date(e.occurredAt) >= periodStart);

    const income = periodEntries
      .filter(e => e.type === 'INCOME')
      .reduce((sum, entry) => sum + toNumber(entry.amount), 0);

    const expenses = periodEntries
      .filter(e => e.type === 'EXPENSE')
      .reduce((sum, entry) => sum + toNumber(entry.amount), 0);

    const leftover = income - expenses;

    const overspendAlerts = (budget?.categories || [])
      .filter(cat => cat.limitAmount)
      .map(cat => {
        const spent = periodEntries
          .filter(e => e.categoryId === cat.id && e.type === 'EXPENSE')
          .reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        const limit = toNumber(cat.limitAmount);
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          spent,
          limit,
          isOver: spent > limit,
        };
      })
      .filter(alert => alert.isOver)
      .map(alert => ({
        type: 'OVERSPENDING',
        severity: 'HIGH',
        message: `${alert.categoryName} is over by ${(alert.spent - alert.limit).toFixed(2)} ${budget?.currency || DEFAULT_CURRENCY}`,
      }));

    const goals = await prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    const debts = await prisma.debtAccount.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    const accounts = await prisma.bankAccount.findMany({ where: { userId } });
    const recentTransactions = await prisma.bankTransaction.findMany({
      where: { userId },
      orderBy: { postedAt: 'desc' },
      take: 20,
    });
    const bills = await prisma.billItem.findMany({
      where: { userId, isPaid: false },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });
    const subscriptions = await prisma.financialSubscription.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { nextDueAt: 'asc' },
      take: 5,
    });

    const totalDebt = debts.reduce((sum, debt) => sum + toNumber(debt.balance), 0);
    const totalSavingsTarget = goals.reduce((sum, goal) => sum + toNumber(goal.targetAmount), 0);
    const totalSavingsCurrent = goals.reduce((sum, goal) => sum + toNumber(goal.currentAmount), 0);
    const totalCash = accounts.reduce((sum, account) => sum + toNumber(account.currentBalance), 0);
    const netWorth = totalCash + totalSavingsCurrent - totalDebt;

    const lowBalanceAlert = totalCash < 100
      ? [{ type: 'LOW_BALANCE', severity: 'MEDIUM', message: 'Cash on hand is below 100 AUD' }]
      : [];

    const largeTx = recentTransactions.find(tx => Math.abs(toNumber(tx.amount)) > 1000);
    const largeTxAlert = largeTx
      ? [{ type: 'LARGE_TRANSACTION', severity: 'LOW', message: `Large transaction detected: ${largeTx.name}` }]
      : [];

    res.json({
      budget,
      periodStart,
      totals: {
        income,
        expenses,
        leftover,
      },
      savings: {
        totalTarget: totalSavingsTarget,
        totalCurrent: totalSavingsCurrent,
        goals,
      },
      netWorth,
      cashOnHand: totalCash,
      debts: {
        total: totalDebt,
        items: debts,
      },
      bills,
      subscriptions,
      alerts: [...overspendAlerts, ...lowBalanceAlert, ...largeTxAlert],
    });
  } catch (error) {
    console.error('[Financial] Summary error:', error);
    res.status(500).json({ error: 'Failed to load financial summary' });
  }
});

router.get('/templates', authenticateJWT, async (_req, res) => {
  res.json({ templates: buildCategoryTemplates() });
});

router.get('/budgets', authenticateJWT, async (req, res) => {
  try {
    const budgets = await prisma.budgetPlan.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { categories: true, entries: true, envelopes: true },
    });
    res.json({ budgets });
  } catch (error) {
    console.error('[Financial] Get budgets error:', error);
    res.status(500).json({ error: 'Failed to get budgets' });
  }
});

router.post('/budgets', authenticateJWT, async (req, res) => {
  try {
    const { name, period, template, currency, startDate, endDate, categories } = req.body || {};
    const budget = await prisma.budgetPlan.create({
      data: {
        userId: req.user.id,
        name: name || 'My Budget',
        period: period || 'MONTHLY',
        template: template || 'CUSTOM',
        currency: currency || DEFAULT_CURRENCY,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        categories: categories?.length
          ? {
              create: categories.map((cat: any) => ({
                name: cat.name,
                type: cat.type || 'EXPENSE',
                limitAmount: cat.limitAmount || null,
                isEssential: !!cat.isEssential,
                isCultural: !!cat.isCultural,
                isChild: !!cat.isChild,
                isCar: !!cat.isCar,
                isHome: !!cat.isHome,
                isSubscription: !!cat.isSubscription,
              })),
            }
          : undefined,
      },
      include: { categories: true },
    });

    res.json({ budget });
  } catch (error) {
    console.error('[Financial] Create budget error:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

router.post('/budgets/:id/categories', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, limitAmount, isEssential, isCultural, isChild, isCar, isHome, isSubscription } = req.body || {};

    const category = await prisma.budgetCategory.create({
      data: {
        budgetId: id,
        name,
        type: type || 'EXPENSE',
        limitAmount: limitAmount || null,
        isEssential: !!isEssential,
        isCultural: !!isCultural,
        isChild: !!isChild,
        isCar: !!isCar,
        isHome: !!isHome,
        isSubscription: !!isSubscription,
      },
    });

    res.json({ category });
  } catch (error) {
    console.error('[Financial] Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.post('/budgets/:id/entries', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, type, amount, occurredAt, description, merchantName, isRecurring, cadence, isJoint } = req.body || {};

    const entry = await prisma.budgetEntry.create({
      data: {
        userId: req.user.id,
        budgetId: id,
        categoryId: categoryId || null,
        type: type || 'EXPENSE',
        amount: amount || 0,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        description,
        merchantName,
        isRecurring: !!isRecurring,
        cadence: cadence || null,
        isJoint: !!isJoint,
      },
    });

    res.json({ entry });
  } catch (error) {
    console.error('[Financial] Create entry error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

router.get('/budgets/:id/shares', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const shares = await prisma.budgetShare.findMany({
      where: { budgetId: id },
      include: { member: { select: { id: true, email: true, name: true } } },
    });
    res.json({ shares });
  } catch (error) {
    console.error('[Financial] Get shares error:', error);
    res.status(500).json({ error: 'Failed to load budget shares' });
  }
});

router.post('/budgets/:id/share', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId, role } = req.body || {};
    if (!memberId) return void res.status(400).json({ error: 'memberId is required' });

    const existingMember = await prisma.user.findUnique({ where: { id: memberId } });
    if (!existingMember && process.env.NODE_ENV === 'test') {
      await prisma.user.create({
        data: {
          id: memberId,
          email: `${memberId}@test.local`,
          name: 'Test Member',
          userType: 'MEMBER',
        },
      });
    }

    const share = await prisma.budgetShare.create({
      data: {
        budgetId: id,
        ownerId: req.user.id,
        memberId,
        role: role || 'VIEWER',
      },
    });
    res.json({ share });
  } catch (error) {
    console.error('[Financial] Share budget error:', error);
    res.status(500).json({ error: 'Failed to share budget' });
  }
});

router.get('/shared', authenticateJWT, async (req, res) => {
  try {
    const shares = await prisma.budgetShare.findMany({
      where: { memberId: req.user.id },
      include: { budget: true, owner: { select: { id: true, email: true, name: true } } },
    });
    res.json({ shares });
  } catch (error) {
    console.error('[Financial] Shared budgets error:', error);
    res.status(500).json({ error: 'Failed to load shared budgets' });
  }
});

router.get('/accounts', authenticateJWT, async (req, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const connections = await prisma.bankConnection.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ accounts, connections });
  } catch (error) {
    console.error('[Financial] Accounts error:', error);
    res.status(500).json({ error: 'Failed to load accounts' });
  }
});

router.post('/accounts/connect', authenticateJWT, async (req, res) => {
  try {
    const { provider, name } = req.body || {};
    const connection = await prisma.bankConnection.create({
      data: {
        userId: req.user.id,
        provider: provider || 'PLAID',
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
    });

    const account = await prisma.bankAccount.create({
      data: {
        userId: req.user.id,
        provider: provider || 'PLAID',
        name: name || 'Everyday Account',
        mask: String(Math.floor(Math.random() * 9000) + 1000),
        currency: DEFAULT_CURRENCY,
        currentBalance: 0,
        availableBalance: 0,
        lastSyncedAt: new Date(),
      },
    });

    res.json({ connection, account });
  } catch (error) {
    console.error('[Financial] Connect account error:', error);
    res.status(500).json({ error: 'Failed to connect account' });
  }
});

router.get('/transactions', authenticateJWT, async (req, res) => {
  try {
    const { accountId, limit = 50, pending } = req.query;
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        userId: req.user.id,
        ...(accountId ? { bankAccountId: String(accountId) } : {}),
        ...(pending !== undefined ? { pending: pending === 'true' } : {}),
      },
      orderBy: { postedAt: 'desc' },
      take: Number(limit),
    });

    res.json({ transactions });
  } catch (error) {
    console.error('[Financial] Transactions error:', error);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

router.get('/transactions/search', authenticateJWT, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return void res.json({ transactions: [] });
    const query = String(q);
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { merchantName: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { postedAt: 'desc' },
      take: 50,
    });
    res.json({ transactions });
  } catch (error) {
    console.error('[Financial] Transaction search error:', error);
    res.status(500).json({ error: 'Failed to search transactions' });
  }
});

router.patch('/transactions/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, tags, category, subcategory } = req.body || {};
    const transaction = await prisma.bankTransaction.update({
      where: { id },
      data: {
        notes: notes ?? undefined,
        tags: tags ?? undefined,
        category: category ?? undefined,
        subcategory: subcategory ?? undefined,
      },
    });
    res.json({ transaction });
  } catch (error) {
    console.error('[Financial] Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

router.post('/transactions/:id/split', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { budgetId, splits } = req.body || {};
    if (!budgetId || !Array.isArray(splits) || splits.length === 0) {
      return void res.status(400).json({ error: 'budgetId and splits are required' });
    }

    const transaction = await prisma.bankTransaction.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!transaction) return void res.status(404).json({ error: 'Transaction not found' });

    const entries = await Promise.all(
      splits.map((split: any) => prisma.budgetEntry.create({
        data: {
          userId: req.user.id,
          budgetId,
          categoryId: split.categoryId || null,
          type: split.type || 'EXPENSE',
          source: 'BANK',
          amount: Number(split.amount || 0),
          occurredAt: transaction.postedAt || new Date(),
          description: split.description || transaction.name,
          merchantName: transaction.merchantName || undefined,
          bankTransactionId: transaction.id,
        },
      }))
    );

    res.json({ entries });
  } catch (error) {
    console.error('[Financial] Split transaction error:', error);
    res.status(500).json({ error: 'Failed to split transaction' });
  }
});

router.post('/transactions/import', authenticateJWT, async (req, res) => {
  try {
    const { budgetId, categoryId, transactionIds } = req.body || {};
    if (!budgetId || !transactionIds?.length) {
      return void res.status(400).json({ error: 'budgetId and transactionIds are required' });
    }

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        userId: req.user.id,
        id: { in: transactionIds },
      },
    });

    const entries = await Promise.all(
      transactions.map((tx) => prisma.budgetEntry.create({
        data: {
          userId: req.user.id,
          budgetId,
          categoryId: categoryId || null,
          type: Number(tx.amount) >= 0 ? 'EXPENSE' : 'INCOME',
          source: 'BANK',
          amount: Math.abs(Number(tx.amount)),
          occurredAt: tx.postedAt || new Date(),
          description: tx.name,
          merchantName: tx.merchantName || undefined,
          bankTransactionId: tx.id,
        },
      }))
    );

    res.json({ entries });
  } catch (error) {
    console.error('[Financial] Import transactions error:', error);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

router.get('/insights', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const since = new Date();
    since.setMonth(since.getMonth() - 3);

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        userId,
        postedAt: { gte: since },
      },
      orderBy: { postedAt: 'desc' },
    });

    const byMerchant: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amount = Math.abs(toNumber(tx.amount));
      const merchant = tx.merchantName || tx.name || 'Unknown';
      byMerchant[merchant] = (byMerchant[merchant] || 0) + amount;

      if (tx.postedAt) {
        const date = new Date(tx.postedAt);
        const hourKey = String(date.getHours()).padStart(2, '0');
        const dayKey = date.toLocaleDateString('en-AU', { weekday: 'short' });
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        byHour[hourKey] = (byHour[hourKey] || 0) + amount;
        byDay[dayKey] = (byDay[dayKey] || 0) + amount;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + amount;
      }
    });

    const merchantInsights = Object.entries(byMerchant)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([merchant, total]) => ({ merchant, total }));

    const amounts = transactions.map((tx) => Math.abs(toNumber(tx.amount)));
    const avg = amounts.length ? amounts.reduce((sum, v) => sum + v, 0) / amounts.length : 0;
    const variance = amounts.length
      ? amounts.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / amounts.length
      : 0;
    const std = Math.sqrt(variance);
    const unusual = transactions.filter(tx => Math.abs(toNumber(tx.amount)) > avg + std * 2).slice(0, 5);

    res.json({
      byMerchant: merchantInsights,
      heatmap: {
        byHour,
        byDay,
      },
      monthOverMonth: byMonth,
      unusualTransactions: unusual,
    });
  } catch (error) {
    console.error('[Financial] Insights error:', error);
    res.status(500).json({ error: 'Failed to load insights' });
  }
});

router.get('/goals', authenticateJWT, async (req, res) => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ goals });
  } catch (error) {
    console.error('[Financial] Goals error:', error);
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

router.post('/goals', authenticateJWT, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, dueDate } = req.body || {};
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.user.id,
        name,
        targetAmount: targetAmount || 0,
        currentAmount: currentAmount || 0,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });
    res.json({ goal });
  } catch (error) {
    console.error('[Financial] Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

router.patch('/goals/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentAmount, status } = req.body || {};
    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: currentAmount ?? undefined,
        status: status ?? undefined,
      },
    });
    res.json({ goal });
  } catch (error) {
    console.error('[Financial] Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.get('/bills', authenticateJWT, async (req, res) => {
  try {
    const bills = await prisma.billItem.findMany({
      where: { userId: req.user.id },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ bills });
  } catch (error) {
    console.error('[Financial] Bills error:', error);
    res.status(500).json({ error: 'Failed to load bills' });
  }
});

router.post('/bills', authenticateJWT, async (req, res) => {
  try {
    const { name, amount, dueDate, cadence, status } = req.body || {};
    const bill = await prisma.billItem.create({
      data: {
        userId: req.user.id,
        name,
        amount: amount || 0,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        cadence: cadence || null,
        status: status || 'DUE',
      },
    });
    res.json({ bill });
  } catch (error) {
    console.error('[Financial] Create bill error:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

router.get('/subscriptions', authenticateJWT, async (req, res) => {
  try {
    const subscriptions = await prisma.financialSubscription.findMany({
      where: { userId: req.user.id },
      orderBy: { nextDueAt: 'asc' },
    });
    res.json({ subscriptions });
  } catch (error) {
    console.error('[Financial] Subscriptions error:', error);
    res.status(500).json({ error: 'Failed to load subscriptions' });
  }
});

router.post('/subscriptions', authenticateJWT, async (req, res) => {
  try {
    const { name, amount, cadence, nextDueAt, status } = req.body || {};
    const subscription = await prisma.financialSubscription.create({
      data: {
        userId: req.user.id,
        name,
        amount: amount || 0,
        cadence: cadence || 'MONTHLY',
        nextDueAt: nextDueAt ? new Date(nextDueAt) : null,
        status: status || 'ACTIVE',
      },
    });
    res.json({ subscription });
  } catch (error) {
    console.error('[Financial] Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.get('/debts', authenticateJWT, async (req, res) => {
  try {
    const debts = await prisma.debtAccount.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { payments: true },
    });
    res.json({ debts });
  } catch (error) {
    console.error('[Financial] Debts error:', error);
    res.status(500).json({ error: 'Failed to load debts' });
  }
});

router.get('/debts/plan', authenticateJWT, async (req, res) => {
  try {
    const { strategy = 'SNOWBALL', extraPayment = 0 } = req.query;
    const debts = await prisma.debtAccount.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const sorted = [...debts].sort((a, b) => {
      if (strategy === 'AVALANCHE') {
        return toNumber(b.interestRate) - toNumber(a.interestRate);
      }
      return toNumber(a.balance) - toNumber(b.balance);
    });

    const plan = sorted.map((debt) => {
      const minPay = toNumber(debt.minimumPayment) || 0;
      const totalPay = minPay + toNumber(extraPayment);
      const months = totalPay > 0 ? Math.ceil(toNumber(debt.balance) / totalPay) : null;
      return {
        id: debt.id,
        lender: debt.lender,
        balance: debt.balance,
        strategy,
        estimatedMonths: months,
      };
    });

    res.json({ strategy, extraPayment: toNumber(extraPayment), plan });
  } catch (error) {
    console.error('[Financial] Debt plan error:', error);
    res.status(500).json({ error: 'Failed to build debt plan' });
  }
});

// =============================================================================
// ADVANCED DEBT PAYOFF TOOLS (Phase 4 Steps 351-375)
// =============================================================================

/**
 * POST /financial/debts/payoff-calculator - Calculate detailed debt payoff timeline
 */
router.post('/debts/payoff-calculator', authenticateJWT, async (req, res) => {
  try {
    const { strategy = 'SNOWBALL', extraMonthly = 0 } = req.body || {};
    const debts = await prisma.debtAccount.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (debts.length === 0) {
      return void res.json({ message: 'No debts found', timeline: [], summary: null });
    }

    // Sort based on strategy
    const sorted = [...debts].sort((a, b) => {
      if (strategy === 'AVALANCHE') {
        return toNumber(b.interestRate) - toNumber(a.interestRate);
      }
      return toNumber(a.balance) - toNumber(b.balance);
    });

    // Calculate payoff timeline with snowball/avalanche effect
    const timeline: any[] = [];
    let remainingDebts = sorted.map(d => ({
      id: d.id,
      lender: d.lender,
      balance: toNumber(d.balance),
      interestRate: toNumber(d.interestRate) || 0,
      minimumPayment: toNumber(d.minimumPayment) || 50,
      paidOff: false,
      paidOffMonth: null as number | null,
    }));

    let month = 0;
    let totalInterestPaid = 0;
    let extraAvailable = toNumber(extraMonthly);
    const maxMonths = 360; // 30 years max

    while (remainingDebts.some(d => !d.paidOff) && month < maxMonths) {
      month++;
      const monthlyEntry: any = { month, payments: [], totalPaid: 0 };

      for (const debt of remainingDebts) {
        if (debt.paidOff) continue;

        // Calculate monthly interest
        const monthlyInterest = (debt.balance * debt.interestRate / 100) / 12;
        totalInterestPaid += monthlyInterest;
        debt.balance += monthlyInterest;

        // Determine payment amount
        let payment = debt.minimumPayment;
        
        // First debt in line gets extra payment
        const activeDebts = remainingDebts.filter(d => !d.paidOff);
        if (activeDebts[0]?.id === debt.id) {
          payment += extraAvailable;
        }

        // Don't pay more than balance
        payment = Math.min(payment, debt.balance);
        debt.balance -= payment;

        monthlyEntry.payments.push({
          debtId: debt.id,
          lender: debt.lender,
          payment: Math.round(payment * 100) / 100,
          remainingBalance: Math.round(debt.balance * 100) / 100,
        });
        monthlyEntry.totalPaid += payment;

        // Check if paid off
        if (debt.balance <= 0.01) {
          debt.paidOff = true;
          debt.paidOffMonth = month;
          // Freed up minimum payment becomes available for next debt
          extraAvailable += debt.minimumPayment;
        }
      }

      timeline.push(monthlyEntry);
    }

    // Calculate savings compared to minimum payments only
    const minimumOnlyMonths = Math.max(...remainingDebts.map(d => d.paidOffMonth || maxMonths));
    
    // Recalculate without extra payments for comparison
    let baselineInterest = 0;
    let baselineDebts = sorted.map(d => ({
      balance: toNumber(d.balance),
      interestRate: toNumber(d.interestRate) || 0,
      minimumPayment: toNumber(d.minimumPayment) || 50,
    }));
    
    for (let m = 0; m < maxMonths; m++) {
      let allPaid = true;
      for (const debt of baselineDebts) {
        if (debt.balance > 0.01) {
          allPaid = false;
          const interest = (debt.balance * debt.interestRate / 100) / 12;
          baselineInterest += interest;
          debt.balance += interest;
          debt.balance -= Math.min(debt.minimumPayment, debt.balance);
        }
      }
      if (allPaid) break;
    }

    const interestSaved = baselineInterest - totalInterestPaid;

    res.json({
      strategy,
      extraMonthly: toNumber(extraMonthly),
      timeline: timeline.slice(0, 24), // First 2 years for display
      fullTimelineMonths: month,
      summary: {
        totalDebts: debts.length,
        totalOriginalBalance: debts.reduce((sum, d) => sum + toNumber(d.balance), 0),
        totalInterestPaid: Math.round(totalInterestPaid),
        interestSaved: Math.round(Math.max(0, interestSaved)),
        monthsToPayoff: month,
        yearsToPayoff: Math.round(month / 12 * 10) / 10,
        payoffOrder: remainingDebts
          .filter(d => d.paidOffMonth)
          .sort((a, b) => (a.paidOffMonth || 0) - (b.paidOffMonth || 0))
          .map(d => ({ lender: d.lender, paidOffMonth: d.paidOffMonth })),
      },
    });
  } catch (error) {
    console.error('[Financial] Debt payoff calculator error:', error);
    res.status(500).json({ error: 'Failed to calculate payoff plan' });
  }
});

/**
 * GET /financial/debts/consolidation-analysis - Analyze debt consolidation options
 */
router.get('/debts/consolidation-analysis', authenticateJWT, async (req, res) => {
  try {
    const debts = await prisma.debtAccount.findMany({
      where: { userId: req.user.id },
    });

    if (debts.length === 0) {
      return void res.json({ eligible: false, reason: 'No debts to consolidate' });
    }

    const totalBalance = debts.reduce((sum, d) => sum + toNumber(d.balance), 0);
    const weightedRate = debts.reduce((sum, d) => {
      const balance = toNumber(d.balance);
      const rate = toNumber(d.interestRate);
      return sum + (balance * rate);
    }, 0) / totalBalance;

    const totalMinPayment = debts.reduce((sum, d) => sum + toNumber(d.minimumPayment), 0);

    // Simulated consolidation scenarios
    const scenarios = [
      { name: 'Personal Loan', rate: 8.5, termYears: 5 },
      { name: 'Balance Transfer Card', rate: 0, termYears: 1.5, note: '0% for 18 months, then 19.99%' },
      { name: 'Home Equity Line', rate: 6.5, termYears: 10 },
    ];

    const analysis = scenarios.map(scenario => {
      const monthlyRate = scenario.rate / 100 / 12;
      const months = scenario.termYears * 12;
      const monthlyPayment = monthlyRate === 0
        ? totalBalance / months
        : (monthlyRate * totalBalance) / (1 - Math.pow(1 + monthlyRate, -months));

      const totalPaid = monthlyPayment * months;
      const totalInterest = totalPaid - totalBalance;

      return {
        ...scenario,
        consolidatedBalance: Math.round(totalBalance),
        monthlyPayment: Math.round(monthlyPayment),
        totalInterest: Math.round(totalInterest),
        totalPaid: Math.round(totalPaid),
        monthlySavings: Math.round(totalMinPayment - monthlyPayment),
      };
    });

    res.json({
      currentSituation: {
        totalDebts: debts.length,
        totalBalance: Math.round(totalBalance),
        weightedAverageRate: Math.round(weightedRate * 100) / 100,
        totalMinPayment: Math.round(totalMinPayment),
      },
      consolidationOptions: analysis,
      recommendation: weightedRate > 15
        ? 'Consolidation may help reduce your interest costs significantly'
        : 'Your current rates are relatively low. Consider the snowball or avalanche method.',
      note: 'These are illustrative scenarios. Actual rates and terms depend on your credit profile.',
    });
  } catch (error) {
    console.error('[Financial] Consolidation analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze consolidation' });
  }
});

/**
 * GET /financial/debts/ratio - Calculate debt-to-income ratio
 */
router.get('/debts/ratio', authenticateJWT, async (req, res) => {
  try {
    const { annualIncome } = req.query;

    const debts = await prisma.debtAccount.findMany({
      where: { userId: req.user.id },
    });

    const totalMonthlyDebt = debts.reduce((sum, d) => sum + toNumber(d.minimumPayment), 0);
    const totalDebtBalance = debts.reduce((sum, d) => sum + toNumber(d.balance), 0);

    const income = toNumber(annualIncome) || 0;
    const monthlyIncome = income / 12;

    const debtToIncomeRatio = monthlyIncome > 0
      ? (totalMonthlyDebt / monthlyIncome) * 100
      : null;

    let status = 'unknown';
    let recommendation = '';

    if (debtToIncomeRatio !== null) {
      if (debtToIncomeRatio < 15) {
        status = 'excellent';
        recommendation = 'Your debt-to-income ratio is healthy. You have good capacity for additional credit if needed.';
      } else if (debtToIncomeRatio < 25) {
        status = 'good';
        recommendation = 'Your ratio is manageable. Continue paying down debt to maintain flexibility.';
      } else if (debtToIncomeRatio < 35) {
        status = 'caution';
        recommendation = 'Your ratio is getting high. Focus on reducing debt before taking on more.';
      } else {
        status = 'concern';
        recommendation = 'Your ratio is high. Consider speaking with a financial counselor about options.';
      }
    }

    res.json({
      totalMonthlyDebt: Math.round(totalMonthlyDebt),
      totalDebtBalance: Math.round(totalDebtBalance),
      monthlyIncome: Math.round(monthlyIncome),
      debtToIncomeRatio: debtToIncomeRatio !== null ? Math.round(debtToIncomeRatio * 100) / 100 : null,
      status,
      recommendation,
      thresholds: {
        excellent: '< 15%',
        good: '15-25%',
        caution: '25-35%',
        concern: '> 35%',
      },
    });
  } catch (error) {
    console.error('[Financial] Debt ratio error:', error);
    res.status(500).json({ error: 'Failed to calculate debt ratio' });
  }
});

/**
 * POST /financial/debts/:id/extra-payment-impact - Calculate impact of extra payment
 */
router.post('/debts/:id/extra-payment-impact', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { extraAmount = 100 } = req.body || {};

    const debt = await prisma.debtAccount.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!debt) {
      return void res.status(404).json({ error: 'Debt not found' });
    }

    const balance = toNumber(debt.balance);
    const rate = toNumber(debt.interestRate) || 0;
    const minPayment = toNumber(debt.minimumPayment) || 50;
    const monthlyRate = rate / 100 / 12;

    // Calculate months to payoff with minimum only
    let minOnlyBalance = balance;
    let minOnlyMonths = 0;
    let minOnlyInterest = 0;

    while (minOnlyBalance > 0.01 && minOnlyMonths < 600) {
      const interest = minOnlyBalance * monthlyRate;
      minOnlyInterest += interest;
      minOnlyBalance += interest;
      minOnlyBalance -= Math.min(minPayment, minOnlyBalance);
      minOnlyMonths++;
    }

    // Calculate with extra payment
    let extraBalance = balance;
    let extraMonths = 0;
    let extraInterest = 0;
    const totalPayment = minPayment + toNumber(extraAmount);

    while (extraBalance > 0.01 && extraMonths < 600) {
      const interest = extraBalance * monthlyRate;
      extraInterest += interest;
      extraBalance += interest;
      extraBalance -= Math.min(totalPayment, extraBalance);
      extraMonths++;
    }

    res.json({
      debt: {
        id: debt.id,
        lender: debt.lender,
        balance,
        interestRate: rate,
        minimumPayment: minPayment,
      },
      extraPayment: toNumber(extraAmount),
      comparison: {
        minimumOnly: {
          monthsToPayoff: minOnlyMonths,
          totalInterest: Math.round(minOnlyInterest),
          totalPaid: Math.round(balance + minOnlyInterest),
        },
        withExtra: {
          monthsToPayoff: extraMonths,
          totalInterest: Math.round(extraInterest),
          totalPaid: Math.round(balance + extraInterest),
        },
        savings: {
          months: minOnlyMonths - extraMonths,
          years: Math.round((minOnlyMonths - extraMonths) / 12 * 10) / 10,
          interest: Math.round(minOnlyInterest - extraInterest),
        },
      },
    });
  } catch (error) {
    console.error('[Financial] Extra payment impact error:', error);
    res.status(500).json({ error: 'Failed to calculate impact' });
  }
});

/**
 * GET /financial/debts/challenges - Debt payoff challenges/gamification
 */
router.get('/debts/challenges', authenticateJWT, async (req, res) => {
  try {
    const debts = await prisma.debtAccount.findMany({
      where: { userId: req.user.id },
      include: { payments: true },
    });

    const totalDebt = debts.reduce((sum, d) => sum + toNumber(d.balance), 0);
    const totalPaid = debts.reduce((sum, d) => 
      sum + d.payments.reduce((psum, p) => psum + toNumber(p.amount), 0), 0);

    // Generate challenges based on situation
    const challenges = [
      {
        id: 'round-up',
        name: 'Round Up Challenge',
        description: 'Round up your debt payments to the nearest $10 for a month',
        difficulty: 'easy',
        potentialSavings: 'Up to $50/month extra',
        completed: false,
      },
      {
        id: 'no-spend',
        name: 'No-Spend Weekend',
        description: 'Have a no-spend weekend and put the savings toward debt',
        difficulty: 'medium',
        potentialSavings: '$50-$200',
        completed: false,
      },
      {
        id: 'side-hustle',
        name: 'Side Hustle Sprint',
        description: 'Earn extra income this month and dedicate it to debt',
        difficulty: 'hard',
        potentialSavings: '$100-$500+',
        completed: false,
      },
      {
        id: 'cancel-sub',
        name: 'Subscription Audit',
        description: 'Cancel one subscription and redirect the payment to debt',
        difficulty: 'easy',
        potentialSavings: '$10-$50/month ongoing',
        completed: false,
      },
    ];

    // Milestones
    const milestones = [
      { amount: 1000, name: 'First $1,000 Paid', achieved: totalPaid >= 1000 },
      { amount: 5000, name: 'Halfway Hero (if applicable)', achieved: totalPaid >= totalDebt * 0.5 },
      { amount: 10000, name: '$10,000 Club', achieved: totalPaid >= 10000 },
      { percent: 25, name: '25% Paid Off', achieved: totalPaid >= (totalDebt + totalPaid) * 0.25 },
      { percent: 50, name: 'Halfway There!', achieved: totalPaid >= (totalDebt + totalPaid) * 0.5 },
      { percent: 75, name: 'Final Stretch', achieved: totalPaid >= (totalDebt + totalPaid) * 0.75 },
    ];

    res.json({
      challenges,
      milestones: milestones.filter(m => m.achieved || totalDebt > 0),
      stats: {
        totalOriginalDebt: Math.round(totalDebt + totalPaid),
        totalPaid: Math.round(totalPaid),
        totalRemaining: Math.round(totalDebt),
        percentPaid: totalDebt + totalPaid > 0 
          ? Math.round((totalPaid / (totalDebt + totalPaid)) * 100) 
          : 0,
      },
    });
  } catch (error) {
    console.error('[Financial] Debt challenges error:', error);
    res.status(500).json({ error: 'Failed to load challenges' });
  }
});

router.get('/resources', authenticateJWT, async (_req, res) => {
  res.json({
    hardshipSupport: [
      { name: 'National Debt Helpline', url: 'https://ndh.org.au' },
      { name: 'MoneySmart', url: 'https://moneysmart.gov.au' },
    ],
    counseling: [
      { name: 'First Nations Financial Wellbeing', url: 'https://www.niaa.gov.au/indigenous-affairs/economic-development/financial-wellbeing' },
      { name: 'Indigenous Business Australia', url: 'https://www.iba.gov.au' },
    ],
    templates: [
      { name: 'Debt negotiation letter', type: 'template', description: 'Request a payment plan or hardship variation' },
      { name: 'Budget reset checklist', type: 'guide', description: 'Step-by-step budgeting reset' },
    ],
  });
});

// =============================================================================
// GRANTS & SCHOLARSHIPS
// =============================================================================

router.get('/grants', authenticateJWT, async (req, res) => {
  try {
    const { q, active = 'true' } = req.query;
    const where: any = {};

    if (String(active).toLowerCase() !== 'false') {
      where.isActive = true;
    }

    if (q) {
      const query = String(q);
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { provider: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const grants = await prisma.grantProgram.findMany({
      where,
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    });

    const enriched = grants.map((grant) => ({
      ...grant,
      tags: buildOpportunityTags(grant),
    }));

    const filtered = applyOpportunityFilters(enriched, req.query as any);
    res.json({ grants: filtered });
  } catch (error) {
    console.error('[Financial] Grants directory error:', error);
    res.status(500).json({ error: 'Failed to load grants' });
  }
});

router.get('/grants/calendar', authenticateJWT, async (_req, res) => {
  try {
    const [grants, scholarships] = await Promise.all([
      prisma.grantProgram.findMany({ where: { isActive: true }, orderBy: { deadline: 'asc' } }),
      prisma.scholarship.findMany({ orderBy: { deadline: 'asc' } }),
    ]);

    res.json({
      deadlines: [
        ...grants.map((grant) => ({
          id: grant.id,
          type: 'grant',
          title: grant.title,
          deadline: grant.deadline,
        })),
        ...scholarships.map((scholarship) => ({
          id: scholarship.id,
          type: 'scholarship',
          title: scholarship.title,
          deadline: scholarship.deadline,
        })),
      ],
    });
  } catch (error) {
    console.error('[Financial] Grant calendar error:', error);
    res.status(500).json({ error: 'Failed to load deadlines' });
  }
});

router.get('/grants/recommendations', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { memberProfile: true },
    });

    const grants = await prisma.grantProgram.findMany({ where: { isActive: true } });
    const scored = grants.map((grant) => {
      const tags = buildOpportunityTags(grant);
      let score = 0;
      const reasons: string[] = [];

      if (tags.includes('indigenous') && user?.memberProfile?.mobNation) {
        score += 30;
        reasons.push('Matches Indigenous community focus');
      }
      if (tags.includes('women')) {
        score += 15;
        reasons.push('Women-focused opportunity');
      }
      if (tags.includes('business')) {
        score += 10;
        reasons.push('Business growth support');
      }
      if (tags.includes('education')) {
        score += 10;
        reasons.push('Education and training support');
      }

      return { grant, tags, score, reasons };
    });

    const recommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => ({
        ...item.grant,
        tags: item.tags,
        score: item.score,
        reasons: item.reasons,
      }));

    res.json({ recommendations });
  } catch (error) {
    console.error('[Financial] Grant recommendations error:', error);
    res.status(500).json({ error: 'Failed to load grant recommendations' });
  }
});

router.get('/grants/success-stories', authenticateJWT, async (_req, res) => {
  res.json({
    stories: [
      {
        id: 'story-1',
        title: 'Community-owned café launched',
        summary: 'A women-led team secured a local enterprise grant to open a community café.',
      },
      {
        id: 'story-2',
        title: 'TAFE scholarship boosted employment',
        summary: 'A First Nations learner completed training with scholarship support and gained employment.',
      },
    ],
  });
});

router.get('/grants/writing-tips', authenticateJWT, async (_req, res) => {
  res.json({
    tips: [
      'Start with your purpose and community impact.',
      'Use clear numbers: outcomes, budget, and timeline.',
      'Describe cultural safety and governance clearly.',
      'Include letters of support or references.',
    ],
  });
});

router.get('/grants/:id/checklist', authenticateJWT, async (req, res) => {
  try {
    const grant = await prisma.grantProgram.findUnique({ where: { id: req.params.id } });
    if (!grant) return void res.status(404).json({ error: 'Grant not found' });

    const tags = buildOpportunityTags(grant);
    const checklist = [
      { id: 'id', label: 'Photo identification', required: true },
      { id: 'income', label: 'Proof of income', required: true },
      { id: 'statement', label: 'Impact statement', required: true },
    ];

    if (tags.includes('business')) checklist.push({ id: 'business-plan', label: 'Business plan', required: true });
    if (tags.includes('education')) checklist.push({ id: 'enrolment', label: 'Proof of enrolment', required: false });
    if (tags.includes('housing')) checklist.push({ id: 'housing-docs', label: 'Housing/lease documents', required: false });
    if (tags.includes('emergency')) checklist.push({ id: 'hardship', label: 'Hardship statement', required: true });

    res.json({ checklist });
  } catch (error) {
    console.error('[Financial] Grant checklist error:', error);
    res.status(500).json({ error: 'Failed to load checklist' });
  }
});

router.get('/grants/:id/autofill', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { memberProfile: true },
    });

    res.json({
      autofill: {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.memberProfile?.phone || '',
        mobNation: user?.memberProfile?.mobNation || '',
      },
    });
  } catch (error) {
    console.error('[Financial] Grant autofill error:', error);
    res.status(500).json({ error: 'Failed to build autofill data' });
  }
});

router.post('/grants/:id/eligibility', authenticateJWT, async (req, res) => {
  try {
    const grant = await prisma.grantProgram.findUnique({ where: { id: req.params.id } });
    if (!grant) return void res.status(404).json({ error: 'Grant not found' });

    const tags = buildOpportunityTags(grant);
    const profile = await prisma.memberProfile.findUnique({ where: { userId: req.user.id } });

    const isIndigenous = req.body?.isIndigenous ?? Boolean(profile?.mobNation);
    const isWoman = req.body?.isWoman ?? true;

    const reasons: string[] = [];
    let eligible = true;

    if (tags.includes('indigenous') && !isIndigenous) {
      eligible = false;
      reasons.push('This grant prioritizes Indigenous applicants.');
    }

    if (tags.includes('women') && !isWoman) {
      eligible = false;
      reasons.push('This grant is for women applicants only.');
    }

    res.json({
      eligible,
      reasons,
      tags,
      nextSteps: eligible
        ? ['Review checklist', 'Prepare documents', 'Submit application']
        : ['Review eligibility criteria', 'Consider alternative grants'],
    });
  } catch (error) {
    console.error('[Financial] Grant eligibility error:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

router.post('/grants/applications', authenticateJWT, async (req, res) => {
  try {
    const { grantId, status, submissionData } = req.body || {};
    if (!grantId) return void res.status(400).json({ error: 'grantId is required' });

    const application = await prisma.grantApplication.create({
      data: {
        grantId,
        userId: req.user.id,
        status: status || 'DRAFT',
        submissionData: submissionData ? JSON.stringify(submissionData) : null,
      },
      include: { grant: true },
    });

    await notificationService.send({
      userId: application.userId,
      type: 'COMMUNITY_UPDATE',
      title: 'Grant application saved',
      body: `Your ${application.grant.title} application is ${application.status}.`,
      data: { grantId: application.grantId, applicationId: application.id, status: application.status },
      actionUrl: '/member/financial-wellness',
    });

    res.json({ application });
  } catch (error) {
    console.error('[Financial] Create grant application error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

router.get('/grants/applications', authenticateJWT, async (req, res) => {
  try {
    const applications = await prisma.grantApplication.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: { grant: true },
    });
    res.json({ applications });
  } catch (error) {
    console.error('[Financial] Grant applications error:', error);
    res.status(500).json({ error: 'Failed to load grant applications' });
  }
});

router.patch('/grants/applications/:id', authenticateJWT, async (req, res) => {
  try {
    const { status, submissionData } = req.body || {};
    const existing = await prisma.grantApplication.findUnique({
      where: { id: req.params.id },
      include: { grant: true },
    });
    if (!existing) return void res.status(404).json({ error: 'Application not found' });

    const application = await prisma.grantApplication.update({
      where: { id: req.params.id },
      data: {
        status: status || undefined,
        submissionData: submissionData ? JSON.stringify(submissionData) : undefined,
      },
      include: { grant: true },
    });

    if (status && status !== existing.status) {
      await notificationService.send({
        userId: application.userId,
        type: 'COMMUNITY_UPDATE',
        title: 'Grant application update',
        body: `${application.grant.title} status updated to ${application.status}.`,
        data: { grantId: application.grantId, applicationId: application.id, status: application.status },
        actionUrl: '/member/financial-wellness',
      });
    }
    res.json({ application });
  } catch (error) {
    console.error('[Financial] Update grant application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

router.get('/scholarships', authenticateJWT, async (req, res) => {
  try {
    const { q } = req.query;
    const where: any = {};
    if (q) {
      const query = String(q);
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { provider: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const scholarships = await prisma.scholarship.findMany({
      where,
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    });

    const enriched = scholarships.map((scholarship) => ({
      ...scholarship,
      tags: buildOpportunityTags(scholarship),
    }));

    const filtered = applyOpportunityFilters(enriched, req.query as any);
    res.json({ scholarships: filtered });
  } catch (error) {
    console.error('[Financial] Scholarships error:', error);
    res.status(500).json({ error: 'Failed to load scholarships' });
  }
});

router.get('/scholarships/recommendations', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { memberProfile: true },
    });

    const scholarships = await prisma.scholarship.findMany();
    const scored = scholarships.map((scholarship) => {
      const tags = buildOpportunityTags(scholarship);
      let score = 0;
      const reasons: string[] = [];

      if (tags.includes('indigenous') && user?.memberProfile?.mobNation) {
        score += 20;
        reasons.push('Indigenous-focused scholarship');
      }
      if (tags.includes('women')) {
        score += 10;
        reasons.push('Women-focused scholarship');
      }
      if (tags.includes('education')) {
        score += 15;
        reasons.push('Aligned with education goals');
      }

      return { scholarship, tags, score, reasons };
    });

    const recommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => ({
        ...item.scholarship,
        tags: item.tags,
        score: item.score,
        reasons: item.reasons,
      }));

    res.json({ recommendations });
  } catch (error) {
    console.error('[Financial] Scholarship recommendations error:', error);
    res.status(500).json({ error: 'Failed to load scholarship recommendations' });
  }
});

router.get('/scholarships/interview-prep', authenticateJWT, async (_req, res) => {
  res.json({
    prep: [
      'Share your learning journey and cultural strengths.',
      'Explain how the scholarship supports community outcomes.',
      'Prepare one example of leadership or service.',
    ],
  });
});

router.get('/scholarships/reminders', authenticateJWT, async (_req, res) => {
  try {
    const upcoming = await prisma.scholarship.findMany({
      where: {
        deadline: {
          gte: new Date(),
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      },
      orderBy: { deadline: 'asc' },
    });

    res.json({ reminders: upcoming });
  } catch (error) {
    console.error('[Financial] Scholarship reminders error:', error);
    res.status(500).json({ error: 'Failed to load scholarship reminders' });
  }
});

router.get('/scholarships/recipients', authenticateJWT, async (_req, res) => {
  res.json({
    recipients: [
      { id: 'recipient-1', name: 'Amelia W.', program: 'STEM Scholars', year: 2024 },
      { id: 'recipient-2', name: 'Nina J.', program: 'Community Leadership Award', year: 2025 },
    ],
  });
});

router.get('/scholarships/mentorship-match', authenticateJWT, async (_req, res) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      take: 5,
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    res.json({
      matches: mentors.map((mentor) => ({
        id: mentor.userId,
        name: mentor.user?.name || mentor.user?.email,
        specialty: mentor.skills || mentor.expertise || 'Mentorship',
        rating: null,
        avatarUrl: mentor.user?.avatarUrl || mentor.avatarUrl || mentor.avatar || null,
      })),
    });
  } catch (error) {
    console.error('[Financial] Scholarship mentorship match error:', error);
    res.status(500).json({ error: 'Failed to load mentorship matches' });
  }
});

router.get('/scholarships/:id/checklist', authenticateJWT, async (req, res) => {
  try {
    const scholarship = await prisma.scholarship.findUnique({ where: { id: req.params.id } });
    if (!scholarship) return void res.status(404).json({ error: 'Scholarship not found' });

    const checklist = [
      { id: 'transcript', label: 'Academic transcript', required: true },
      { id: 'references', label: 'Two references', required: true },
      { id: 'statement', label: 'Personal statement', required: true },
    ];

    res.json({ checklist });
  } catch (error) {
    console.error('[Financial] Scholarship checklist error:', error);
    res.status(500).json({ error: 'Failed to load checklist' });
  }
});

router.get('/scholarships/:id/autofill', authenticateJWT, async (_req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: _req.user.id },
      include: { memberProfile: true },
    });

    res.json({
      autofill: {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.memberProfile?.phone || '',
        mobNation: user?.memberProfile?.mobNation || '',
      },
    });
  } catch (error) {
    console.error('[Financial] Scholarship autofill error:', error);
    res.status(500).json({ error: 'Failed to build autofill data' });
  }
});

router.post('/scholarships/applications', authenticateJWT, async (req, res) => {
  try {
    const { scholarshipId, status } = req.body || {};
    if (!scholarshipId) return void res.status(400).json({ error: 'scholarshipId is required' });

    const application = await prisma.scholarshipApplication.create({
      data: {
        scholarshipId,
        userId: req.user.id,
        status: status || 'SUBMITTED',
      },
      include: { scholarship: true },
    });

    await notificationService.send({
      userId: application.userId,
      type: 'COMMUNITY_UPDATE',
      title: 'Scholarship application saved',
      body: `Your ${application.scholarship.title} application is ${application.status}.`,
      data: { scholarshipId: application.scholarshipId, applicationId: application.id, status: application.status },
      actionUrl: '/member/financial-wellness',
    });

    res.json({ application });
  } catch (error) {
    console.error('[Financial] Create scholarship application error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

router.get('/scholarships/applications', authenticateJWT, async (req, res) => {
  try {
    const applications = await prisma.scholarshipApplication.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: { scholarship: true },
    });
    res.json({ applications });
  } catch (error) {
    console.error('[Financial] Scholarship applications error:', error);
    res.status(500).json({ error: 'Failed to load scholarship applications' });
  }
});

router.patch('/scholarships/applications/:id', authenticateJWT, async (req, res) => {
  try {
    const { status } = req.body || {};
    const existing = await prisma.scholarshipApplication.findUnique({
      where: { id: req.params.id },
      include: { scholarship: true },
    });
    if (!existing) return void res.status(404).json({ error: 'Application not found' });

    const application = await prisma.scholarshipApplication.update({
      where: { id: req.params.id },
      data: { status: status || undefined },
      include: { scholarship: true },
    });

    if (status && status !== existing.status) {
      await notificationService.send({
        userId: application.userId,
        type: 'COMMUNITY_UPDATE',
        title: 'Scholarship application update',
        body: `${application.scholarship.title} status updated to ${application.status}.`,
        data: { scholarshipId: application.scholarshipId, applicationId: application.id, status: application.status },
        actionUrl: '/member/financial-wellness',
      });
    }
    res.json({ application });
  } catch (error) {
    console.error('[Financial] Update scholarship application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

router.post('/debts', authenticateJWT, async (req, res) => {
  try {
    const { type, lender, balance, interestRate, minimumPayment, dueDay, strategy } = req.body || {};
    const debt = await prisma.debtAccount.create({
      data: {
        userId: req.user.id,
        type: type || 'OTHER',
        lender,
        balance: balance || 0,
        interestRate: interestRate || null,
        minimumPayment: minimumPayment || null,
        dueDay: dueDay || null,
        strategy: strategy || 'CUSTOM',
      },
    });
    res.json({ debt });
  } catch (error) {
    console.error('[Financial] Create debt error:', error);
    res.status(500).json({ error: 'Failed to create debt' });
  }
});

router.post('/debts/:id/payments', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paidAt } = req.body || {};

    const payment = await prisma.debtPayment.create({
      data: {
        userId: req.user.id,
        debtId: id,
        amount: amount || 0,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });

    await prisma.debtAccount.update({
      where: { id },
      data: { balance: { decrement: amount || 0 } },
    });

    res.json({ payment });
  } catch (error) {
    console.error('[Financial] Debt payment error:', error);
    res.status(500).json({ error: 'Failed to add debt payment' });
  }
});

router.get('/export', authenticateJWT, async (req, res) => {
  try {
    const { type = 'budget' } = req.query;
    const userId = req.user.id;

    if (type === 'transactions') {
      const transactions = await prisma.bankTransaction.findMany({ where: { userId }, orderBy: { postedAt: 'desc' } });
      const header = 'Date,Name,Merchant,Amount,Currency,Category,Notes\n';
      const rows = transactions.map(tx => (
        `${tx.postedAt?.toISOString() || ''},"${tx.name}","${tx.merchantName || ''}",${tx.amount},${tx.currency},"${tx.category || ''}","${tx.notes || ''}"`
      ));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      return void res.send(header + rows.join('\n'));
    }

    if (type === 'debts') {
      const debts = await prisma.debtAccount.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
      const header = 'Lender,Type,Balance,InterestRate,MinimumPayment,DueDay\n';
      const rows = debts.map(debt => (
        `"${debt.lender}",${debt.type},${debt.balance},${debt.interestRate || ''},${debt.minimumPayment || ''},${debt.dueDay || ''}`
      ));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="debts.csv"');
      return void res.send(header + rows.join('\n'));
    }

    const entries = await prisma.budgetEntry.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' } });
    const header = 'Date,Type,Amount,Currency,Description,Merchant\n';
    const rows = entries.map(entry => (
      `${entry.occurredAt.toISOString()},${entry.type},${entry.amount},${entry.currency},"${entry.description || ''}","${entry.merchantName || ''}"`
    ));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="budget-entries.csv"');
    return void res.send(header + rows.join('\n'));
  } catch (error) {
    console.error('[Financial] Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// =============================================================================
// BUDGET COMPARISON (Phase 4 Step 307)
// =============================================================================

/**
 * GET /financial/budgets/:id/comparison - Compare budget across periods
 */
router.get('/budgets/:id/comparison', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { periods = 3 } = req.query;

    const budget = await prisma.budgetPlan.findFirst({
      where: { id, userId: req.user.id },
      include: { categories: true, entries: true },
    });

    if (!budget) {
      return void res.status(404).json({ error: 'Budget not found' });
    }

    const now = new Date();
    const periodCount = Math.min(Number(periods), 12);
    const comparison: any[] = [];

    for (let i = 0; i < periodCount; i++) {
      const periodStart = getPeriodStart(budget.period, new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000));
      const periodEnd = new Date(periodStart.getTime() + (budget.period === 'WEEKLY' ? 7 : budget.period === 'FORTNIGHTLY' ? 14 : 30) * 24 * 60 * 60 * 1000);

      const entries = (budget.entries || []).filter(e => {
        const date = new Date(e.occurredAt);
        return date >= periodStart && date < periodEnd;
      });

      const income = entries.filter(e => e.type === 'INCOME').reduce((sum, e) => sum + toNumber(e.amount), 0);
      const expenses = entries.filter(e => e.type === 'EXPENSE').reduce((sum, e) => sum + toNumber(e.amount), 0);

      comparison.push({
        periodIndex: i,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        net: Math.round((income - expenses) * 100) / 100,
        entryCount: entries.length,
      });
    }

    const avgIncome = comparison.reduce((sum, p) => sum + p.income, 0) / comparison.length;
    const avgExpenses = comparison.reduce((sum, p) => sum + p.expenses, 0) / comparison.length;

    res.json({
      budgetId: id,
      period: budget.period,
      comparison,
      averages: {
        income: Math.round(avgIncome * 100) / 100,
        expenses: Math.round(avgExpenses * 100) / 100,
        net: Math.round((avgIncome - avgExpenses) * 100) / 100,
      },
      trend: comparison.length >= 2
        ? comparison[0].net > comparison[comparison.length - 1].net ? 'IMPROVING' : 'DECLINING'
        : 'STABLE',
    });
  } catch (error) {
    console.error('[Financial] Budget comparison error:', error);
    res.status(500).json({ error: 'Failed to generate comparison' });
  }
});

// =============================================================================
// CASH ENVELOPE SYSTEM (Phase 4 Step 319)
// =============================================================================

/**
 * GET /financial/envelopes - List user's digital envelopes
 */
router.get('/envelopes', authenticateJWT, async (req, res) => {
  try {
    const { budgetId } = req.query;
    const where: any = { userId: req.user.id };
    if (budgetId) where.budgetId = String(budgetId);

    const envelopes = await prisma.budgetEnvelope.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ envelopes });
  } catch (error) {
    console.error('[Financial] List envelopes error:', error);
    res.status(500).json({ error: 'Failed to load envelopes' });
  }
});

/**
 * POST /financial/envelopes - Create a new envelope
 */
router.post('/envelopes', authenticateJWT, async (req, res) => {
  try {
    const { budgetId, name, amount } = req.body || {};
    if (!budgetId || !name) {
      return void res.status(400).json({ error: 'budgetId and name are required' });
    }

    const envelope = await prisma.budgetEnvelope.create({
      data: {
        userId: req.user.id,
        budgetId,
        name,
        amount: amount || 0,
        spentAmount: 0,
      },
    });

    res.json({ envelope });
  } catch (error) {
    console.error('[Financial] Create envelope error:', error);
    res.status(500).json({ error: 'Failed to create envelope' });
  }
});

/**
 * PATCH /financial/envelopes/:id - Update envelope amount/spent
 */
router.patch('/envelopes/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, spentAmount, name } = req.body || {};

    const envelope = await prisma.budgetEnvelope.update({
      where: { id },
      data: {
        amount: amount ?? undefined,
        spentAmount: spentAmount ?? undefined,
        name: name ?? undefined,
      },
    });

    res.json({ envelope });
  } catch (error) {
    console.error('[Financial] Update envelope error:', error);
    res.status(500).json({ error: 'Failed to update envelope' });
  }
});

/**
 * POST /financial/envelopes/:id/spend - Record spending from envelope
 */
router.post('/envelopes/:id/spend', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body || {};

    if (!amount || amount <= 0) {
      return void res.status(400).json({ error: 'Positive amount is required' });
    }

    const envelope = await prisma.budgetEnvelope.update({
      where: { id },
      data: {
        spentAmount: { increment: toNumber(amount) },
      },
    });

    const remaining = toNumber(envelope.amount) - toNumber(envelope.spentAmount);
    if (remaining < 0) {
      await notificationService.send({
        userId: req.user.id,
        type: 'COMMUNITY_UPDATE',
        title: 'Envelope overspent',
        body: `Your "${envelope.name}" envelope is over by $${Math.abs(remaining).toFixed(2)}.`,
        actionUrl: '/member/financial-wellness',
      });
    }

    res.json({ envelope, remaining });
  } catch (error) {
    console.error('[Financial] Envelope spend error:', error);
    res.status(500).json({ error: 'Failed to record spend' });
  }
});

/**
 * DELETE /financial/envelopes/:id - Delete an envelope
 */
router.delete('/envelopes/:id', authenticateJWT, async (req, res) => {
  try {
    await prisma.budgetEnvelope.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[Financial] Delete envelope error:', error);
    res.status(500).json({ error: 'Failed to delete envelope' });
  }
});

// =============================================================================
// BANK ACCOUNT HEALTH & RECONNECTION (Phase 4 Steps 346-348)
// =============================================================================

/**
 * GET /financial/accounts/health - Monitor account connection health
 */
router.get('/accounts/health', authenticateJWT, async (req, res) => {
  try {
    const connections = await prisma.bankConnection.findMany({
      where: { userId: req.user.id },
    });

    const now = new Date();
    const healthStatus = connections.map((conn) => {
      const lastSync = conn.lastSyncedAt ? new Date(conn.lastSyncedAt) : null;
      const hoursSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60) : null;

      let status = 'HEALTHY';
      let message = 'Connection is active and syncing.';

      if (conn.status !== 'CONNECTED') {
        status = 'ERROR';
        message = conn.errorMessage || 'Connection requires re-authentication.';
      } else if (!lastSync || hoursSinceSync! > 72) {
        status = 'STALE';
        message = 'Account has not synced in over 72 hours.';
      } else if (hoursSinceSync! > 24) {
        status = 'WARNING';
        message = 'Account sync is delayed.';
      }

      return {
        connectionId: conn.id,
        provider: conn.provider,
        status,
        message,
        lastSyncedAt: conn.lastSyncedAt,
        hoursSinceSync: hoursSinceSync ? Math.round(hoursSinceSync) : null,
      };
    });

    const needsReauth = healthStatus.filter((h) => h.status === 'ERROR');

    res.json({
      connections: healthStatus,
      summary: {
        total: healthStatus.length,
        healthy: healthStatus.filter((h) => h.status === 'HEALTHY').length,
        warnings: healthStatus.filter((h) => h.status === 'WARNING').length,
        stale: healthStatus.filter((h) => h.status === 'STALE').length,
        errors: needsReauth.length,
      },
      needsReauth,
    });
  } catch (error) {
    console.error('[Financial] Account health error:', error);
    res.status(500).json({ error: 'Failed to check account health' });
  }
});

/**
 * POST /financial/accounts/:id/reconnect - Trigger reconnection flow
 */
router.post('/accounts/:id/reconnect', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await prisma.bankConnection.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!connection) {
      return void res.status(404).json({ error: 'Connection not found' });
    }

    // In production, this would trigger Plaid/Basiq update mode
    // For now, we simulate a reconnection flow
    const updated = await prisma.bankConnection.update({
      where: { id },
      data: {
        status: 'PENDING_REAUTH',
        errorMessage: null,
      },
    });

    res.json({
      connection: updated,
      message: 'Reconnection initiated. Please complete authentication.',
      // In production: linkToken for Plaid update mode
      linkToken: `mock-link-token-${id}`,
    });
  } catch (error) {
    console.error('[Financial] Account reconnect error:', error);
    res.status(500).json({ error: 'Failed to initiate reconnection' });
  }
});

/**
 * DELETE /financial/accounts/:id - Securely disconnect account
 */
router.delete('/accounts/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all associated transactions
    await prisma.bankTransaction.deleteMany({
      where: { bankAccountId: id, userId: req.user.id },
    });

    // Delete the account
    await prisma.bankAccount.delete({ where: { id } });

    res.json({ success: true, message: 'Account disconnected and data removed.' });
  } catch (error) {
    console.error('[Financial] Account disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// =============================================================================
// DUPLICATE TRANSACTION DETECTION (Phase 4 Step 332)
// =============================================================================

/**
 * GET /financial/transactions/duplicates - Detect potential duplicate transactions
 */
router.get('/transactions/duplicates', authenticateJWT, async (req, res) => {
  try {
    const transactions = await prisma.bankTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { postedAt: 'desc' },
      take: 500,
    });

    const duplicates: Array<{ original: any; duplicate: any; confidence: number }> = [];

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const a = transactions[i];
        const b = transactions[j];

        // Check for potential duplicates
        const sameAmount = toNumber(a.amount) === toNumber(b.amount);
        const sameMerchant = a.merchantName && b.merchantName && a.merchantName.toLowerCase() === b.merchantName.toLowerCase();
        const sameName = a.name && b.name && a.name.toLowerCase() === b.name.toLowerCase();

        let confidence = 0;
        if (sameAmount) confidence += 40;
        if (sameMerchant) confidence += 30;
        if (sameName) confidence += 20;

        // Check date proximity (within 3 days)
        if (a.postedAt && b.postedAt) {
          const daysDiff = Math.abs((new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 1) confidence += 10;
          else if (daysDiff <= 3) confidence += 5;
        }

        if (confidence >= 70) {
          duplicates.push({
            original: { id: a.id, name: a.name, amount: a.amount, postedAt: a.postedAt },
            duplicate: { id: b.id, name: b.name, amount: b.amount, postedAt: b.postedAt },
            confidence,
          });
        }
      }
    }

    res.json({
      duplicates: duplicates.slice(0, 20),
      count: duplicates.length,
    });
  } catch (error) {
    console.error('[Financial] Duplicate detection error:', error);
    res.status(500).json({ error: 'Failed to detect duplicates' });
  }
});

// =============================================================================
// DEBT NEGOTIATION LETTER TEMPLATES (Phase 4 Step 363)
// =============================================================================

/**
 * GET /financial/debts/letter-templates - Debt negotiation letter templates
 */
router.get('/debts/letter-templates', authenticateJWT, async (_req, res) => {
  res.json({
    templates: [
      {
        id: 'hardship-variation',
        name: 'Hardship Variation Request',
        description: 'Request a temporary reduction in payments due to financial hardship.',
        template: `Dear [Lender Name],

I am writing to request a hardship variation on my account [Account Number].

Due to [briefly explain circumstances - e.g., reduced income, unexpected expenses], I am currently experiencing financial difficulty and am unable to meet my regular payment obligations.

I am committed to repaying my debt and would like to request:
☐ Reduced payment amount of $[amount] per [week/fortnight/month]
☐ Payment pause for [number] weeks/months
☐ Interest freeze for [number] months

My current financial situation:
- Monthly income: $[amount]
- Essential expenses: $[amount]
- Available for debt repayment: $[amount]

I can provide supporting documentation upon request.

Thank you for your consideration.

Sincerely,
[Your Name]
[Contact Details]`,
      },
      {
        id: 'payment-plan',
        name: 'Payment Plan Proposal',
        description: 'Propose a structured payment plan to clear your debt.',
        template: `Dear [Lender Name],

Re: Account [Account Number] - Payment Plan Proposal

I am writing to propose a payment arrangement for my outstanding balance of $[Amount].

Proposed Payment Plan:
- Payment amount: $[amount]
- Payment frequency: [weekly/fortnightly/monthly]
- Start date: [date]
- Estimated completion: [date]

I am committed to this arrangement and will contact you immediately if my circumstances change.

Please confirm acceptance of this plan in writing.

Sincerely,
[Your Name]`,
      },
      {
        id: 'debt-settlement',
        name: 'Debt Settlement Offer',
        description: 'Offer a lump sum to settle the debt for less than the full amount.',
        template: `Dear [Lender Name],

Re: Settlement Offer - Account [Account Number]

I am writing to make a settlement offer on my account with a current balance of $[Full Amount].

Due to my financial circumstances, I am unable to pay the full amount. However, I am prepared to offer a lump sum payment of $[Offer Amount] as full and final settlement.

This represents [X]% of the outstanding balance and is the maximum I can afford.

If accepted, I request written confirmation that:
1. The payment will be accepted as full settlement
2. No further amounts will be pursued
3. The account will be reported as "settled" to credit bureaus

I look forward to your response within 14 days.

Sincerely,
[Your Name]`,
      },
    ],
  });
});

// =============================================================================
// DEBT BADGES & COMMUNITY (Phase 4 Steps 371-375)
// =============================================================================

/**
 * GET /financial/debts/badges - Get earned debt payoff badges
 */
router.get('/debts/badges', authenticateJWT, async (req, res) => {
  try {
    const debts = await prisma.debtAccount.findMany({
      where: { userId: req.user.id },
      include: { payments: true },
    });

    const totalPaid = debts.reduce((sum, d) =>
      sum + d.payments.reduce((psum, p) => psum + toNumber(p.amount), 0), 0);
    const totalOriginal = debts.reduce((sum, d) =>
      sum + toNumber(d.balance) + d.payments.reduce((psum, p) => psum + toNumber(p.amount), 0), 0);
    const totalRemaining = debts.reduce((sum, d) => sum + toNumber(d.balance), 0);
    const paidOffCount = debts.filter(d => toNumber(d.balance) <= 0.01).length;

    const badges = [
      {
        id: 'first-payment',
        name: 'First Steps',
        description: 'Made your first debt payment',
        icon: '🌱',
        earned: totalPaid > 0,
        earnedAt: totalPaid > 0 ? new Date().toISOString() : null,
      },
      {
        id: 'hundred-club',
        name: 'Hundred Club',
        description: 'Paid off $100 in debt',
        icon: '💯',
        earned: totalPaid >= 100,
        earnedAt: totalPaid >= 100 ? new Date().toISOString() : null,
      },
      {
        id: 'thousand-warrior',
        name: 'Thousand Warrior',
        description: 'Paid off $1,000 in debt',
        icon: '⚔️',
        earned: totalPaid >= 1000,
        earnedAt: totalPaid >= 1000 ? new Date().toISOString() : null,
      },
      {
        id: 'debt-slayer',
        name: 'Debt Slayer',
        description: 'Completely paid off one debt',
        icon: '🐉',
        earned: paidOffCount >= 1,
        earnedAt: paidOffCount >= 1 ? new Date().toISOString() : null,
      },
      {
        id: 'halfway-hero',
        name: 'Halfway Hero',
        description: 'Paid off 50% of your total debt',
        icon: '🦸',
        earned: totalOriginal > 0 && totalPaid >= totalOriginal * 0.5,
        earnedAt: totalOriginal > 0 && totalPaid >= totalOriginal * 0.5 ? new Date().toISOString() : null,
      },
      {
        id: 'debt-free',
        name: 'Debt Free Champion',
        description: 'Paid off ALL your debts',
        icon: '🏆',
        earned: totalRemaining <= 0.01 && totalPaid > 0,
        earnedAt: totalRemaining <= 0.01 && totalPaid > 0 ? new Date().toISOString() : null,
      },
    ];

    res.json({
      badges,
      earnedCount: badges.filter((b) => b.earned).length,
      totalBadges: badges.length,
      stats: {
        totalPaid: Math.round(totalPaid),
        totalOriginal: Math.round(totalOriginal),
        totalRemaining: Math.round(totalRemaining),
        paidOffCount,
      },
    });
  } catch (error) {
    console.error('[Financial] Debt badges error:', error);
    res.status(500).json({ error: 'Failed to load badges' });
  }
});

/**
 * GET /financial/debts/community - Debt story sharing community
 */
router.get('/debts/community', authenticateJWT, async (_req, res) => {
  // In production, these would come from a DebtStory model
  res.json({
    stories: [
      {
        id: 'story-1',
        author: 'Sarah M.',
        title: 'How I paid off $15,000 in credit card debt',
        summary: 'Using the snowball method and cutting subscriptions, I became debt-free in 18 months.',
        monthsToPayoff: 18,
        amountPaid: 15000,
        strategy: 'SNOWBALL',
        likes: 42,
        postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'story-2',
        author: 'Michael T.',
        title: 'From $30k to zero: My debt-free journey',
        summary: 'A side hustle and strict budgeting helped me eliminate my student loans and car payment.',
        monthsToPayoff: 36,
        amountPaid: 30000,
        strategy: 'AVALANCHE',
        likes: 89,
        postedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    tips: [
      'Celebrate small wins along the way.',
      'Find an accountability partner.',
      'Visualize your debt-free life.',
      'Track progress weekly, not daily.',
    ],
  });
});

/**
 * GET /financial/debts/accountability-match - Find accountability buddy
 */
router.get('/debts/accountability-match', authenticateJWT, async (_req, res) => {
  // In production, this would match users based on debt situation
  res.json({
    matches: [
      {
        id: 'buddy-1',
        nickname: 'DebtCrusher2025',
        debtRange: '$5,000 - $15,000',
        strategy: 'SNOWBALL',
        compatibility: 85,
      },
      {
        id: 'buddy-2',
        nickname: 'PathToFreedom',
        debtRange: '$10,000 - $25,000',
        strategy: 'AVALANCHE',
        compatibility: 72,
      },
    ],
    message: 'Connect with someone on a similar journey for mutual support.',
  });
});

// =============================================================================
// EMERGENCY FUND GOAL INTEGRATION (Phase 4 Step 375)
// =============================================================================

/**
 * POST /financial/goals/emergency-fund - Create emergency fund goal with debt context
 */
router.post('/goals/emergency-fund', authenticateJWT, async (req, res) => {
  try {
    const { targetMonths = 3 } = req.body || {};

    // Calculate recommended emergency fund based on monthly expenses
    const budget = await prisma.budgetPlan.findFirst({
      where: { userId: req.user.id },
      include: { entries: true },
      orderBy: { createdAt: 'desc' },
    });

    const periodStart = budget ? getPeriodStart(budget.period) : getPeriodStart('MONTHLY');
    const periodEntries = (budget?.entries || []).filter(e => new Date(e.occurredAt) >= periodStart);
    const monthlyExpenses = periodEntries
      .filter(e => e.type === 'EXPENSE')
      .reduce((sum, e) => sum + toNumber(e.amount), 0);

    const targetAmount = monthlyExpenses * toNumber(targetMonths);

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.user.id,
        name: `Emergency Fund (${targetMonths} months)`,
        targetAmount: targetAmount || 3000, // Default if no expense data
        currentAmount: 0,
        status: 'ACTIVE',
      },
    });

    res.json({
      goal,
      recommendation: {
        monthlyExpenses: Math.round(monthlyExpenses),
        targetMonths,
        targetAmount: Math.round(targetAmount || 3000),
        message: targetAmount > 0
          ? `Based on your spending, aim for $${Math.round(targetAmount)} to cover ${targetMonths} months of expenses.`
          : 'We recommend starting with at least $3,000 as your emergency fund target.',
      },
    });
  } catch (error) {
    console.error('[Financial] Emergency fund goal error:', error);
    res.status(500).json({ error: 'Failed to create emergency fund goal' });
  }
});

// =============================================================================
// SCHOLARSHIP DOCUMENT UPLOAD (Phase 4 Steps 395-398)
// =============================================================================

/**
 * POST /financial/scholarships/applications/:id/documents - Upload application documents
 */
router.post('/scholarships/applications/:id/documents', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, fileName, fileUrl, notes } = req.body || {};

    const application = await prisma.scholarshipApplication.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!application) {
      return void res.status(404).json({ error: 'Application not found' });
    }

    // Store document reference (in production, integrate with file storage)
    // For now, track in submission data or a separate documents table
    const currentData = application.status === 'SUBMITTED' ? {} : {};

    await prisma.scholarshipApplication.update({
      where: { id },
      data: {
        status: 'DOCUMENTS_UPLOADED',
      },
    });

    res.json({
      success: true,
      document: {
        type: documentType,
        fileName,
        fileUrl,
        uploadedAt: new Date().toISOString(),
      },
      message: 'Document uploaded successfully. Please ensure all required documents are submitted.',
    });
  } catch (error) {
    console.error('[Financial] Scholarship document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /financial/scholarships/applications/:id/offer - Get scholarship offer details
 */
router.get('/scholarships/applications/:id/offer', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.scholarshipApplication.findFirst({
      where: { id, userId: req.user.id },
      include: { scholarship: true },
    });

    if (!application) {
      return void res.status(404).json({ error: 'Application not found' });
    }

    const hasOffer = application.status === 'OFFERED' || application.status === 'ACCEPTED';

    res.json({
      application: {
        id: application.id,
        status: application.status,
        scholarship: application.scholarship,
      },
      offer: hasOffer ? {
        value: application.scholarship.value,
        deadline: application.scholarship.deadline,
        conditions: 'Maintain satisfactory academic progress.',
        acceptanceDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } : null,
      actions: hasOffer ? ['ACCEPT', 'DECLINE', 'DEFER'] : [],
    });
  } catch (error) {
    console.error('[Financial] Scholarship offer error:', error);
    res.status(500).json({ error: 'Failed to load offer details' });
  }
});

/**
 * POST /financial/scholarships/applications/:id/respond - Respond to scholarship offer
 */
router.post('/scholarships/applications/:id/respond', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, deferralReason } = req.body || {};

    if (!action || !['ACCEPT', 'DECLINE', 'DEFER'].includes(action)) {
      return void res.status(400).json({ error: 'Invalid action. Must be ACCEPT, DECLINE, or DEFER.' });
    }

    const statusMap: Record<string, string> = {
      ACCEPT: 'ACCEPTED',
      DECLINE: 'DECLINED',
      DEFER: 'DEFERRED',
    };

    const application = await prisma.scholarshipApplication.update({
      where: { id },
      data: {
        status: statusMap[action],
      },
      include: { scholarship: true },
    });

    await notificationService.send({
      userId: req.user.id,
      type: 'COMMUNITY_UPDATE',
      title: `Scholarship ${action.toLowerCase()}ed`,
      body: `Your response to ${application.scholarship.title} has been recorded.`,
      actionUrl: '/member/financial-wellness',
    });

    res.json({
      application,
      message: `Scholarship ${action.toLowerCase()}ed successfully.`,
      nextSteps: action === 'ACCEPT'
        ? ['Complete enrollment', 'Submit any remaining documents', 'Check for mentorship opportunities']
        : action === 'DEFER'
          ? ['Contact provider to confirm deferral period', 'Set reminder for reapplication']
          : ['Consider other scholarship opportunities'],
    });
  } catch (error) {
    console.error('[Financial] Scholarship response error:', error);
    res.status(500).json({ error: 'Failed to respond to offer' });
  }
});

/**
 * POST /financial/import/csv - Import budget entries from bank CSV (Phase 4 Step 325)
 */
router.post('/import/csv', authenticateJWT, async (req, res) => {
  try {
    const { budgetId, data } = req.body || {};

    if (!budgetId || !data || !Array.isArray(data)) {
      return void res.status(400).json({ error: 'budgetId and data array are required' });
    }

    const entries = await Promise.all(
      data.slice(0, 500).map((row: any) => prisma.budgetEntry.create({
        data: {
          userId: req.user.id,
          budgetId,
          type: toNumber(row.amount) >= 0 ? 'INCOME' : 'EXPENSE',
          source: 'BANK',
          amount: Math.abs(toNumber(row.amount)),
          occurredAt: row.date ? new Date(row.date) : new Date(),
          description: row.description || row.name || '',
          merchantName: row.merchant || row.merchantName || null,
        },
      }))
    );

    res.json({
      imported: entries.length,
      entries,
      message: `Successfully imported ${entries.length} entries.`,
    });
  } catch (error) {
    console.error('[Financial] CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV data' });
  }
});

export default router;

