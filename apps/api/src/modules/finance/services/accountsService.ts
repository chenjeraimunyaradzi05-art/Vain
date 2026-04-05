import { randomUUID } from 'crypto';
import { getUserFinance, saveUserFinance } from '../financeStore';
import type { ChartAccount, AccountType } from '../types';

export async function listChartOfAccounts(userId: string): Promise<ChartAccount[]> {
  const data = await getUserFinance(userId);
  return data.chartOfAccounts;
}

const templates: Record<string, Array<Omit<ChartAccount, 'id' | 'createdAt'>>> = {
  DEFAULT: [
    { code: 'Asset:Cash', name: 'Cash', type: 'ASSET' },
    { code: 'Asset:Bank', name: 'Bank Accounts', type: 'ASSET' },
    { code: 'Asset:AccountsReceivable', name: 'Accounts Receivable', type: 'ASSET' },
    { code: 'Asset:Inventory', name: 'Inventory', type: 'ASSET' },
    { code: 'Liability:AccountsPayable', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: 'Liability:TaxPayable', name: 'Tax Payable', type: 'LIABILITY' },
    { code: 'Equity:OwnerEquity', name: 'Owner Equity', type: 'EQUITY' },
    { code: 'Equity:RetainedEarnings', name: 'Retained Earnings', type: 'EQUITY' },
    { code: 'Income:Sales', name: 'Sales Revenue', type: 'INCOME' },
    { code: 'Income:Other', name: 'Other Income', type: 'INCOME' },
    { code: 'Expense:COGS', name: 'Cost of Goods Sold', type: 'EXPENSE' },
    { code: 'Expense:Operating', name: 'Operating Expenses', type: 'EXPENSE' },
    { code: 'Expense:Marketing', name: 'Marketing', type: 'EXPENSE' },
    { code: 'Expense:Payroll', name: 'Payroll', type: 'EXPENSE' },
  ],
  SOLE_TRADER: [
    { code: 'Asset:Cash', name: 'Cash', type: 'ASSET' },
    { code: 'Asset:Bank', name: 'Bank Accounts', type: 'ASSET' },
    { code: 'Asset:AccountsReceivable', name: 'Accounts Receivable', type: 'ASSET' },
    { code: 'Liability:TaxPayable', name: 'Tax Payable', type: 'LIABILITY' },
    { code: 'Equity:OwnerEquity', name: 'Owner Equity', type: 'EQUITY' },
    { code: 'Equity:RetainedEarnings', name: 'Retained Earnings', type: 'EQUITY' },
    { code: 'Income:Sales', name: 'Sales Revenue', type: 'INCOME' },
    { code: 'Expense:Operating', name: 'Operating Expenses', type: 'EXPENSE' },
    { code: 'Expense:Vehicle', name: 'Vehicle Expenses', type: 'EXPENSE' },
    { code: 'Expense:HomeOffice', name: 'Home Office', type: 'EXPENSE' },
  ],
  PARTNERSHIP: [
    { code: 'Asset:Cash', name: 'Cash', type: 'ASSET' },
    { code: 'Asset:Bank', name: 'Bank Accounts', type: 'ASSET' },
    { code: 'Asset:AccountsReceivable', name: 'Accounts Receivable', type: 'ASSET' },
    { code: 'Liability:AccountsPayable', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: 'Liability:TaxPayable', name: 'Tax Payable', type: 'LIABILITY' },
    { code: 'Equity:PartnerCapital', name: 'Partner Capital', type: 'EQUITY' },
    { code: 'Equity:RetainedEarnings', name: 'Retained Earnings', type: 'EQUITY' },
    { code: 'Income:Sales', name: 'Sales Revenue', type: 'INCOME' },
    { code: 'Expense:Operating', name: 'Operating Expenses', type: 'EXPENSE' },
  ],
  COMPANY: [
    { code: 'Asset:Cash', name: 'Cash', type: 'ASSET' },
    { code: 'Asset:Bank', name: 'Bank Accounts', type: 'ASSET' },
    { code: 'Asset:AccountsReceivable', name: 'Accounts Receivable', type: 'ASSET' },
    { code: 'Asset:Inventory', name: 'Inventory', type: 'ASSET' },
    { code: 'Liability:AccountsPayable', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: 'Liability:PayrollPayable', name: 'Payroll Payable', type: 'LIABILITY' },
    { code: 'Liability:TaxPayable', name: 'Tax Payable', type: 'LIABILITY' },
    { code: 'Equity:ShareCapital', name: 'Share Capital', type: 'EQUITY' },
    { code: 'Equity:RetainedEarnings', name: 'Retained Earnings', type: 'EQUITY' },
    { code: 'Income:Sales', name: 'Sales Revenue', type: 'INCOME' },
    { code: 'Income:Other', name: 'Other Income', type: 'INCOME' },
    { code: 'Expense:COGS', name: 'Cost of Goods Sold', type: 'EXPENSE' },
    { code: 'Expense:Operating', name: 'Operating Expenses', type: 'EXPENSE' },
    { code: 'Expense:Payroll', name: 'Payroll', type: 'EXPENSE' },
  ],
};

export async function seedDefaultChart(userId: string, template: string = 'DEFAULT'): Promise<ChartAccount[]> {
  const data = await getUserFinance(userId);
  if (data.chartOfAccounts.length > 0) {
    return data.chartOfAccounts;
  }

  const now = new Date().toISOString();
  const seed = templates[template] || templates.DEFAULT;

  data.chartOfAccounts = seed.map((account) => ({
    ...account,
    id: randomUUID(),
    createdAt: now,
  }));

  await saveUserFinance(userId, data);
  return data.chartOfAccounts;
}

export async function upsertAccount(userId: string, input: {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  currency?: string;
  tags?: string[];
}): Promise<ChartAccount> {
  const data = await getUserFinance(userId);
  const existing = data.chartOfAccounts.find((account) => account.code === input.code);
  const now = new Date().toISOString();

  if (existing) {
    existing.name = input.name || existing.name;
    existing.type = input.type || existing.type;
    existing.parentCode = input.parentCode ?? existing.parentCode;
    existing.currency = input.currency ?? existing.currency;
    existing.tags = input.tags ?? existing.tags;
    await saveUserFinance(userId, data);
    return existing;
  }

  const account: ChartAccount = {
    id: randomUUID(),
    code: input.code,
    name: input.name,
    type: input.type,
    parentCode: input.parentCode,
    currency: input.currency,
    tags: input.tags,
    createdAt: now,
  };

  data.chartOfAccounts.unshift(account);
  await saveUserFinance(userId, data);
  return account;
}