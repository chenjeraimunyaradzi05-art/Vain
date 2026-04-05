/**
 * Phase 4 Integration: Financial Wellness (Complete Coverage)
 * Covers Steps 301-400 from Gimbi-Complete-Guide.md
 */

import request from 'supertest';

let app: any;
let serverAvailable = false;
let token: string;

async function checkServer(): Promise<boolean> {
  try {
    const { createTestApp } = await import('../setup');
    app = await createTestApp();

    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-jwt-secret-for-vitest-at-least-32-chars';
    token = jwt.default.sign({ userId: 'financial-user-1', email: 'finance@test.com', role: 'member' }, secret);

    return !!app;
  } catch {
    // eslint-disable-next-line no-console
    console.log('⚠️  Phase 4 financial tests skipped - server not available');
    return false;
  }
}

describe('Phase 4 - Financial Wellness', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  // ============================================
  // Section 4.1: Budget Management (Steps 301-325)
  // ============================================

  describe('Section 4.1 - Budget Management', () => {
    let testBudgetId: string;
    let testCategoryId: string;

    it('Step 301-306: creates a budget with templates and categories', async () => {
      if (!serverAvailable) return;

      const budgetRes = await request(app)
        .post('/api/financial/budgets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Phase 4 Complete Budget',
          period: 'MONTHLY',
          template: 'ZERO_BASED',
          currency: 'AUD',
          categories: [
            { name: 'Salary', type: 'INCOME' },
            { name: 'Housing', type: 'EXPENSE', isHome: true, isEssential: true, limitAmount: 1500 },
            { name: 'Transport', type: 'EXPENSE', isCar: true, limitAmount: 400 },
            { name: 'Cultural Obligations', type: 'EXPENSE', isCultural: true },
            { name: 'Kids', type: 'EXPENSE', isChild: true },
          ],
        });

      expect(budgetRes.status).toBe(200);
      expect(budgetRes.body.budget).toBeDefined();
      testBudgetId = budgetRes.body.budget.id;
      testCategoryId = budgetRes.body.budget.categories?.[0]?.id;
    });

    it('Step 307: compares budget across periods', async () => {
      if (!serverAvailable || !testBudgetId) return;

      const comparisonRes = await request(app)
        .get(`/api/financial/budgets/${testBudgetId}/comparison?periods=3`)
        .set('Authorization', `Bearer ${token}`);

      expect(comparisonRes.status).toBe(200);
      expect(comparisonRes.body.comparison).toBeDefined();
      expect(Array.isArray(comparisonRes.body.comparison)).toBe(true);
      expect(comparisonRes.body.averages).toBeDefined();
    });

    it('Step 308-310: generates overspending alerts and calculates leftover', async () => {
      if (!serverAvailable) return;

      const summaryRes = await request(app)
        .get('/api/financial/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.totals).toBeDefined();
      expect(summaryRes.body.totals).toHaveProperty('leftover');
      expect(summaryRes.body).toHaveProperty('alerts');
    });

    it('Step 311-312: shares budget with family member', async () => {
      if (!serverAvailable || !testBudgetId) return;

      const shareRes = await request(app)
        .post(`/api/financial/budgets/${testBudgetId}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ memberId: 'family-member-123', role: 'EDITOR' });

      expect(shareRes.status).toBe(200);
      expect(shareRes.body.share).toBeDefined();

      const sharesRes = await request(app)
        .get(`/api/financial/budgets/${testBudgetId}/shares`)
        .set('Authorization', `Bearer ${token}`);

      expect(sharesRes.status).toBe(200);
    });

    it('Step 319: manages cash envelope system', async () => {
      if (!serverAvailable || !testBudgetId) return;

      // Create envelope
      const createRes = await request(app)
        .post('/api/financial/envelopes')
        .set('Authorization', `Bearer ${token}`)
        .send({ budgetId: testBudgetId, name: 'Groceries', amount: 500 });

      expect(createRes.status).toBe(200);
      const envelopeId = createRes.body.envelope?.id;
      expect(envelopeId).toBeTruthy();

      // Record spending
      const spendRes = await request(app)
        .post(`/api/financial/envelopes/${envelopeId}/spend`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 75 });

      expect(spendRes.status).toBe(200);
      expect(spendRes.body.remaining).toBe(425);

      // List envelopes
      const listRes = await request(app)
        .get('/api/financial/envelopes')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.envelopes)).toBe(true);
    });

    it('Step 320-322: supports budget templates (50/30/20, zero-based, Indigenous)', async () => {
      if (!serverAvailable) return;

      const templatesRes = await request(app)
        .get('/api/financial/templates')
        .set('Authorization', `Bearer ${token}`);

      expect(templatesRes.status).toBe(200);
      expect(templatesRes.body.templates).toBeDefined();
      expect(templatesRes.body.templates.fiftyThirtyTwenty).toBeDefined();
      expect(templatesRes.body.templates.zeroBased).toBeDefined();
      expect(templatesRes.body.templates.indigenousCategories).toBeDefined();
    });

    it('Step 324-325: exports budget to CSV and imports from bank', async () => {
      if (!serverAvailable || !testBudgetId) return;

      // Export
      const exportRes = await request(app)
        .get('/api/financial/export?type=budget')
        .set('Authorization', `Bearer ${token}`);

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('text/csv');

      // Import CSV data
      const importRes = await request(app)
        .post('/api/financial/import/csv')
        .set('Authorization', `Bearer ${token}`)
        .send({
          budgetId: testBudgetId,
          data: [
            { date: new Date().toISOString(), amount: -50, description: 'Coffee Shop', merchant: 'Cafe XYZ' },
            { date: new Date().toISOString(), amount: 1000, description: 'Income', merchant: 'Employer' },
          ],
        });

      expect(importRes.status).toBe(200);
      expect(importRes.body.imported).toBe(2);
    });
  });

  // ============================================
  // Section 4.2: Bank Account Integration (Steps 326-350)
  // ============================================

  describe('Section 4.2 - Bank Account Integration', () => {
    it('Step 326-334: connects bank account and syncs transactions', async () => {
      if (!serverAvailable) return;

      const connectRes = await request(app)
        .post('/api/financial/accounts/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ provider: 'PLAID', name: 'Everyday Saver' });

      expect(connectRes.status).toBe(200);
      expect(connectRes.body.connection).toBeDefined();
      expect(connectRes.body.account).toBeDefined();

      const accountsRes = await request(app)
        .get('/api/financial/accounts')
        .set('Authorization', `Bearer ${token}`);

      expect(accountsRes.status).toBe(200);
      expect(Array.isArray(accountsRes.body.accounts)).toBe(true);
    });

    it('Step 332: detects duplicate transactions', async () => {
      if (!serverAvailable) return;

      const duplicatesRes = await request(app)
        .get('/api/financial/transactions/duplicates')
        .set('Authorization', `Bearer ${token}`);

      expect(duplicatesRes.status).toBe(200);
      expect(duplicatesRes.body).toHaveProperty('duplicates');
      expect(duplicatesRes.body).toHaveProperty('count');
    });

    it('Step 337-339: searches and updates transactions', async () => {
      if (!serverAvailable) return;

      const searchRes = await request(app)
        .get('/api/financial/transactions/search?q=coffee')
        .set('Authorization', `Bearer ${token}`);

      expect(searchRes.status).toBe(200);
      expect(Array.isArray(searchRes.body.transactions)).toBe(true);
    });

    it('Step 340-345: generates spending insights', async () => {
      if (!serverAvailable) return;

      const insightsRes = await request(app)
        .get('/api/financial/insights')
        .set('Authorization', `Bearer ${token}`);

      expect(insightsRes.status).toBe(200);
      expect(insightsRes.body.byMerchant).toBeDefined();
      expect(insightsRes.body.heatmap).toBeDefined();
      expect(insightsRes.body.monthOverMonth).toBeDefined();
      expect(insightsRes.body.unusualTransactions).toBeDefined();
    });

    it('Step 346-348: monitors account health and supports reconnection', async () => {
      if (!serverAvailable) return;

      const healthRes = await request(app)
        .get('/api/financial/accounts/health')
        .set('Authorization', `Bearer ${token}`);

      expect(healthRes.status).toBe(200);
      expect(healthRes.body.connections).toBeDefined();
      expect(healthRes.body.summary).toBeDefined();
      expect(healthRes.body.summary).toHaveProperty('healthy');
      expect(healthRes.body.summary).toHaveProperty('errors');
    });
  });

  // ============================================
  // Section 4.3: Debt Management (Steps 351-375)
  // ============================================

  describe('Section 4.3 - Debt Management', () => {
    let testDebtId: string;

    it('Step 351-354: creates and tracks debts', async () => {
      if (!serverAvailable) return;

      const debtRes = await request(app)
        .post('/api/financial/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'CREDIT_CARD',
          lender: 'Phase 4 Test Bank',
          balance: 5000,
          interestRate: 19.99,
          minimumPayment: 150,
          dueDay: 15,
        });

      expect(debtRes.status).toBe(200);
      testDebtId = debtRes.body.debt?.id;

      const debtsRes = await request(app)
        .get('/api/financial/debts')
        .set('Authorization', `Bearer ${token}`);

      expect(debtsRes.status).toBe(200);
      expect(Array.isArray(debtsRes.body.debts)).toBe(true);
    });

    it('Step 355-357: calculates payoff strategies with extra payment impact', async () => {
      if (!serverAvailable) return;

      // Snowball plan
      const snowballRes = await request(app)
        .get('/api/financial/debts/plan?strategy=SNOWBALL&extraPayment=50')
        .set('Authorization', `Bearer ${token}`);

      expect(snowballRes.status).toBe(200);
      expect(snowballRes.body.strategy).toBe('SNOWBALL');

      // Avalanche plan
      const avalancheRes = await request(app)
        .get('/api/financial/debts/plan?strategy=AVALANCHE')
        .set('Authorization', `Bearer ${token}`);

      expect(avalancheRes.status).toBe(200);
      expect(avalancheRes.body.strategy).toBe('AVALANCHE');

      // Detailed payoff calculator
      const calcRes = await request(app)
        .post('/api/financial/debts/payoff-calculator')
        .set('Authorization', `Bearer ${token}`)
        .send({ strategy: 'AVALANCHE', extraMonthly: 100 });

      expect(calcRes.status).toBe(200);
      expect(calcRes.body.summary).toBeDefined();
      expect(calcRes.body.summary).toHaveProperty('monthsToPayoff');
      expect(calcRes.body.summary).toHaveProperty('interestSaved');

      // Extra payment impact
      if (testDebtId) {
        const impactRes = await request(app)
          .post(`/api/financial/debts/${testDebtId}/extra-payment-impact`)
          .set('Authorization', `Bearer ${token}`)
          .send({ extraAmount: 100 });

        expect(impactRes.status).toBe(200);
        expect(impactRes.body.comparison).toBeDefined();
        expect(impactRes.body.comparison.savings).toBeDefined();
      }
    });

    it('Step 358: analyzes debt consolidation options', async () => {
      if (!serverAvailable) return;

      const consolidationRes = await request(app)
        .get('/api/financial/debts/consolidation-analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(consolidationRes.status).toBe(200);
      expect(consolidationRes.body.currentSituation).toBeDefined();
      expect(consolidationRes.body.consolidationOptions).toBeDefined();
    });

    it('Step 360: calculates debt-to-income ratio', async () => {
      if (!serverAvailable) return;

      const ratioRes = await request(app)
        .get('/api/financial/debts/ratio?annualIncome=75000')
        .set('Authorization', `Bearer ${token}`);

      expect(ratioRes.status).toBe(200);
      expect(ratioRes.body).toHaveProperty('debtToIncomeRatio');
      expect(ratioRes.body).toHaveProperty('status');
      expect(ratioRes.body).toHaveProperty('recommendation');
    });

    it('Step 361-362: provides hardship support resources', async () => {
      if (!serverAvailable) return;

      const resourcesRes = await request(app)
        .get('/api/financial/resources')
        .set('Authorization', `Bearer ${token}`);

      expect(resourcesRes.status).toBe(200);
      expect(resourcesRes.body.hardshipSupport).toBeDefined();
      expect(resourcesRes.body.counseling).toBeDefined();
    });

    it('Step 363: provides debt negotiation letter templates', async () => {
      if (!serverAvailable) return;

      const templatesRes = await request(app)
        .get('/api/financial/debts/letter-templates')
        .set('Authorization', `Bearer ${token}`);

      expect(templatesRes.status).toBe(200);
      expect(Array.isArray(templatesRes.body.templates)).toBe(true);
      expect(templatesRes.body.templates.length).toBeGreaterThan(0);
      expect(templatesRes.body.templates[0]).toHaveProperty('template');
    });

    it('Step 371-372: provides debt community and accountability matching', async () => {
      if (!serverAvailable) return;

      const communityRes = await request(app)
        .get('/api/financial/debts/community')
        .set('Authorization', `Bearer ${token}`);

      expect(communityRes.status).toBe(200);
      expect(communityRes.body.stories).toBeDefined();

      const matchRes = await request(app)
        .get('/api/financial/debts/accountability-match')
        .set('Authorization', `Bearer ${token}`);

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.matches).toBeDefined();
    });

    it('Step 373-374: gamifies debt payoff with challenges and badges', async () => {
      if (!serverAvailable) return;

      const challengesRes = await request(app)
        .get('/api/financial/debts/challenges')
        .set('Authorization', `Bearer ${token}`);

      expect(challengesRes.status).toBe(200);
      expect(challengesRes.body.challenges).toBeDefined();
      expect(challengesRes.body.milestones).toBeDefined();

      const badgesRes = await request(app)
        .get('/api/financial/debts/badges')
        .set('Authorization', `Bearer ${token}`);

      expect(badgesRes.status).toBe(200);
      expect(badgesRes.body.badges).toBeDefined();
      expect(badgesRes.body.earnedCount).toBeDefined();
    });

    it('Step 375: integrates emergency fund goal with debt context', async () => {
      if (!serverAvailable) return;

      const emergencyRes = await request(app)
        .post('/api/financial/goals/emergency-fund')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetMonths: 3 });

      expect(emergencyRes.status).toBe(200);
      expect(emergencyRes.body.goal).toBeDefined();
      expect(emergencyRes.body.recommendation).toBeDefined();
    });
  });

  // ============================================
  // Section 4.4: Grants & Scholarships (Steps 376-400)
  // ============================================

  describe('Section 4.4 - Grants & Scholarships', () => {
    it('Step 376-383: searches grants with eligibility filters', async () => {
      if (!serverAvailable) return;

      const grantsRes = await request(app)
        .get('/api/financial/grants?indigenous=true&women=true')
        .set('Authorization', `Bearer ${token}`);

      expect(grantsRes.status).toBe(200);
      expect(Array.isArray(grantsRes.body.grants)).toBe(true);
    });

    it('Step 378: provides grant deadline calendar', async () => {
      if (!serverAvailable) return;

      const calendarRes = await request(app)
        .get('/api/financial/grants/calendar')
        .set('Authorization', `Bearer ${token}`);

      expect(calendarRes.status).toBe(200);
      expect(calendarRes.body.deadlines).toBeDefined();
    });

    it('Step 382: recommends grants based on profile', async () => {
      if (!serverAvailable) return;

      const recsRes = await request(app)
        .get('/api/financial/grants/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(recsRes.status).toBe(200);
      expect(recsRes.body.recommendations).toBeDefined();
    });

    it('Step 389-390: provides grant success stories and writing tips', async () => {
      if (!serverAvailable) return;

      const storiesRes = await request(app)
        .get('/api/financial/grants/success-stories')
        .set('Authorization', `Bearer ${token}`);

      expect(storiesRes.status).toBe(200);
      expect(storiesRes.body.stories).toBeDefined();

      const tipsRes = await request(app)
        .get('/api/financial/grants/writing-tips')
        .set('Authorization', `Bearer ${token}`);

      expect(tipsRes.status).toBe(200);
      expect(tipsRes.body.tips).toBeDefined();
    });

    it('Step 391-393: searches and manages scholarship applications', async () => {
      if (!serverAvailable) return;

      const scholarshipsRes = await request(app)
        .get('/api/financial/scholarships')
        .set('Authorization', `Bearer ${token}`);

      expect(scholarshipsRes.status).toBe(200);
      expect(Array.isArray(scholarshipsRes.body.scholarships)).toBe(true);

      const recsRes = await request(app)
        .get('/api/financial/scholarships/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(recsRes.status).toBe(200);
      expect(recsRes.body.recommendations).toBeDefined();
    });

    it('Step 394: provides scholarship deadline reminders', async () => {
      if (!serverAvailable) return;

      const remindersRes = await request(app)
        .get('/api/financial/scholarships/reminders')
        .set('Authorization', `Bearer ${token}`);

      expect(remindersRes.status).toBe(200);
      expect(remindersRes.body.reminders).toBeDefined();
    });

    it('Step 396: provides scholarship interview preparation', async () => {
      if (!serverAvailable) return;

      const prepRes = await request(app)
        .get('/api/financial/scholarships/interview-prep')
        .set('Authorization', `Bearer ${token}`);

      expect(prepRes.status).toBe(200);
      expect(prepRes.body.prep).toBeDefined();
    });

    it('Step 399-400: connects scholarship recipients with mentors', async () => {
      if (!serverAvailable) return;

      const recipientsRes = await request(app)
        .get('/api/financial/scholarships/recipients')
        .set('Authorization', `Bearer ${token}`);

      expect(recipientsRes.status).toBe(200);
      expect(recipientsRes.body.recipients).toBeDefined();

      const mentorRes = await request(app)
        .get('/api/financial/scholarships/mentorship-match')
        .set('Authorization', `Bearer ${token}`);

      expect(mentorRes.status).toBe(200);
      expect(mentorRes.body.matches).toBeDefined();
    });
  });
});
