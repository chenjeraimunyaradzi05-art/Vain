import { randomUUID } from 'crypto';
import { getUserFinance, saveUserFinance } from '../financeStore';
import type { FinancialReportSnapshot, LedgerEntry, ReportType } from '../types';

function groupByAccount(entries: LedgerEntry[]): Record<string, { debit: number; credit: number; net: number }> {
  return entries.reduce((acc, entry) => {
    if (!acc[entry.account]) {
      acc[entry.account] = { debit: 0, credit: 0, net: 0 };
    }
    acc[entry.account].debit += Number(entry.debit || 0);
    acc[entry.account].credit += Number(entry.credit || 0);
    acc[entry.account].net = acc[entry.account].debit - acc[entry.account].credit;
    return acc;
  }, {} as Record<string, { debit: number; credit: number; net: number }>);
}

function filterByPrefix(entries: LedgerEntry[], prefix: string): LedgerEntry[] {
  return entries.filter((entry) => entry.account.startsWith(prefix));
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export function buildProfitAndLoss(entries: LedgerEntry[]): {
  income: Record<string, number>;
  expenses: Record<string, number>;
  netProfit: number;
} {
  const incomeEntries = filterByPrefix(entries, 'Income:');
  const expenseEntries = filterByPrefix(entries, 'Expense:');

  const incomeTotals = groupByAccount(incomeEntries);
  const expenseTotals = groupByAccount(expenseEntries);

  const income = Object.fromEntries(Object.entries(incomeTotals).map(([account, total]) => [account, round(-total.net)]));
  const expenses = Object.fromEntries(Object.entries(expenseTotals).map(([account, total]) => [account, round(total.net)]));

  const totalIncome = Object.values(income).reduce((sum, value) => sum + value, 0);
  const totalExpenses = Object.values(expenses).reduce((sum, value) => sum + value, 0);

  return {
    income,
    expenses,
    netProfit: round(totalIncome - totalExpenses),
  };
}

export function buildBalanceSheet(entries: LedgerEntry[]): {
  assets: Record<string, number>;
  liabilities: Record<string, number>;
  equity: Record<string, number>;
} {
  const assets = groupByAccount(filterByPrefix(entries, 'Asset:'));
  const liabilities = groupByAccount(filterByPrefix(entries, 'Liability:'));
  const equity = groupByAccount(filterByPrefix(entries, 'Equity:'));

  return {
    assets: Object.fromEntries(Object.entries(assets).map(([account, total]) => [account, round(total.net)])),
    liabilities: Object.fromEntries(Object.entries(liabilities).map(([account, total]) => [account, round(-total.net)])),
    equity: Object.fromEntries(Object.entries(equity).map(([account, total]) => [account, round(-total.net)])),
  };
}

export function buildCashflow(entries: LedgerEntry[]): {
  operating: Record<string, number>;
  investing: Record<string, number>;
  financing: Record<string, number>;
  netCash: number;
} {
  const cashEntries = entries.filter((entry) => entry.account.startsWith('Cash:') || (entry.tags || []).includes('cash'));
  const grouped = groupByAccount(cashEntries);
  const operating: Record<string, number> = {};
  for (const [account, total] of Object.entries(grouped)) {
    operating[account] = round(total.net);
  }

  const netCash = Object.values(operating).reduce((sum, value) => sum + value, 0);
  return {
    operating,
    investing: {},
    financing: {},
    netCash: round(netCash),
  };
}

export async function generateReport(userId: string, type: ReportType, currency: string): Promise<FinancialReportSnapshot> {
  const data = await getUserFinance(userId);
  let reportData: Record<string, unknown> = {};

  if (type === 'PL') {
    reportData = buildProfitAndLoss(data.ledgers);
  } else if (type === 'BS') {
    reportData = buildBalanceSheet(data.ledgers);
  } else if (type === 'CF') {
    reportData = buildCashflow(data.ledgers);
  } else if (type === 'TB') {
    reportData = groupByAccount(data.ledgers);
  }

  const snapshot: FinancialReportSnapshot = {
    id: randomUUID(),
    type,
    currency,
    generatedAt: new Date().toISOString(),
    data: reportData,
  };

  data.reports.unshift(snapshot);
  await saveUserFinance(userId, data);
  return snapshot;
}