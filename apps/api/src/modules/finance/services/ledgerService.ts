import type { LedgerEntry } from '../types';
import { getUserFinance } from '../financeStore';

export async function listLedgerEntries(userId: string, options?: {
  account?: string;
  from?: string;
  to?: string;
}): Promise<LedgerEntry[]> {
  const data = await getUserFinance(userId);
  let entries = [...data.ledgers];

  if (options?.account) {
    entries = entries.filter((entry) => entry.account === options.account);
  }

  if (options?.from) {
    const fromDate = new Date(options.from);
    entries = entries.filter((entry) => new Date(entry.date) >= fromDate);
  }

  if (options?.to) {
    const toDate = new Date(options.to);
    entries = entries.filter((entry) => new Date(entry.date) <= toDate);
  }

  return entries;
}

export function calculateTrialBalance(entries: LedgerEntry[]): Array<{
  account: string;
  debit: number;
  credit: number;
  net: number;
}> {
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const entry of entries) {
    const current = totals.get(entry.account) || { debit: 0, credit: 0 };
    current.debit += Number(entry.debit || 0);
    current.credit += Number(entry.credit || 0);
    totals.set(entry.account, current);
  }

  return Array.from(totals.entries()).map(([account, total]) => ({
    account,
    debit: Number(total.debit.toFixed(2)),
    credit: Number(total.credit.toFixed(2)),
    net: Number((total.debit - total.credit).toFixed(2)),
  }));
}