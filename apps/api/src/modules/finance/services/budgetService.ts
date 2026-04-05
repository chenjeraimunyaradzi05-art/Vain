import { randomUUID } from 'crypto';
import { getUserFinance, saveUserFinance } from '../financeStore';
import type { BudgetPlan } from '../types';

export async function listBudgets(userId: string): Promise<BudgetPlan[]> {
  const data = await getUserFinance(userId);
  return data.budgets;
}

export async function createBudget(userId: string, input: {
  name: string;
  currency?: string;
  periodStart: string;
  periodEnd: string;
  categories: Array<{ name: string; limit: number }>;
}): Promise<BudgetPlan> {
  const data = await getUserFinance(userId);
  const now = new Date().toISOString();
  const plan: BudgetPlan = {
    id: randomUUID(),
    name: input.name,
    currency: input.currency || 'AUD',
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    categories: input.categories.map((category) => ({
      id: randomUUID(),
      name: category.name,
      limit: Number(category.limit || 0),
      actual: 0,
    })),
    createdAt: now,
  };

  data.budgets.unshift(plan);
  await saveUserFinance(userId, data);
  return plan;
}

export async function updateBudgetActuals(userId: string, budgetId: string, actuals: Record<string, number>): Promise<BudgetPlan> {
  const data = await getUserFinance(userId);
  const budget = data.budgets.find((plan) => plan.id === budgetId);
  if (!budget) {
    throw new Error('Budget not found');
  }

  for (const category of budget.categories) {
    if (actuals[category.name] !== undefined) {
      category.actual = Number(actuals[category.name] || 0);
    }
  }

  await saveUserFinance(userId, data);
  return budget;
}