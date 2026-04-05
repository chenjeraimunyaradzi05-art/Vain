import { createJournalEntry } from './journalService';
import type { LedgerEntry } from '../types';

function round(value: number): number {
  return Number(value.toFixed(2));
}

function filterByRange(entries: LedgerEntry[], from?: Date, to?: Date): LedgerEntry[] {
  return entries.filter((entry) => {
    const date = new Date(entry.date);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

export async function createClosingEntry(userId: string, input: {
  entries: LedgerEntry[];
  from?: string;
  to?: string;
  date: string;
  description?: string;
  equityAccount?: string;
}): Promise<{ journalId: string; netIncome: number }> {
  const fromDate = input.from ? new Date(input.from) : undefined;
  const toDate = input.to ? new Date(input.to) : undefined;
  const periodEntries = filterByRange(input.entries, fromDate, toDate);

  const incomeTotals: Record<string, number> = {};
  const expenseTotals: Record<string, number> = {};

  for (const entry of periodEntries) {
    const net = Number(entry.debit || 0) - Number(entry.credit || 0);
    if (entry.account.startsWith('Income:')) {
      incomeTotals[entry.account] = (incomeTotals[entry.account] || 0) + net;
    }
    if (entry.account.startsWith('Expense:')) {
      expenseTotals[entry.account] = (expenseTotals[entry.account] || 0) + net;
    }
  }

  const lines: Array<{ account: string; debit: number; credit: number }> = [];
  let netIncome = 0;

  for (const [account, net] of Object.entries(incomeTotals)) {
    const creditBalance = round(-net);
    if (creditBalance > 0) {
      lines.push({ account, debit: creditBalance, credit: 0 });
      netIncome += creditBalance;
    }
  }

  for (const [account, net] of Object.entries(expenseTotals)) {
    const debitBalance = round(net);
    if (debitBalance > 0) {
      lines.push({ account, debit: 0, credit: debitBalance });
      netIncome -= debitBalance;
    }
  }

  const equityAccount = input.equityAccount || 'Equity:RetainedEarnings';
  if (netIncome > 0) {
    lines.push({ account: equityAccount, debit: 0, credit: round(netIncome) });
  } else if (netIncome < 0) {
    lines.push({ account: equityAccount, debit: round(Math.abs(netIncome)), credit: 0 });
  }

  const journal = await createJournalEntry(userId, {
    date: input.date,
    description: input.description || 'Closing entry',
    lines,
    referenceId: 'closing-entry',
    currency: 'AUD',
  });

  return { journalId: journal.journal.id, netIncome: round(netIncome) };
}