import { randomUUID } from 'crypto';
import { getUserFinance, saveUserFinance } from '../financeStore';
import type { FinancePeriod, PeriodStatus } from '../types';

export async function listPeriods(userId: string): Promise<FinancePeriod[]> {
  const data = await getUserFinance(userId);
  return data.periods;
}

export async function createPeriod(userId: string, input: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<FinancePeriod> {
  const data = await getUserFinance(userId);
  const period: FinancePeriod = {
    id: randomUUID(),
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    status: 'OPEN',
  };
  data.periods.unshift(period);
  await saveUserFinance(userId, data);
  return period;
}

export async function closePeriod(userId: string, periodId: string): Promise<FinancePeriod> {
  const data = await getUserFinance(userId);
  const period = data.periods.find((p) => p.id === periodId);
  if (!period) {
    throw new Error('Period not found');
  }
  period.status = 'CLOSED';
  period.closedAt = new Date().toISOString();
  await saveUserFinance(userId, data);
  return period;
}

export function isDateInClosedPeriod(dateIso: string, periods: FinancePeriod[]): boolean {
  const date = new Date(dateIso);
  return periods.some((period) => {
    if (period.status !== 'CLOSED') return false;
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    return date >= start && date <= end;
  });
}