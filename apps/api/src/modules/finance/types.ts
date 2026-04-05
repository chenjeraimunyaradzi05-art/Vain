export type CurrencyCode = string;

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  inclusive: boolean;
  account?: string;
}

export interface TaxProfile {
  id: string;
  name: string;
  jurisdiction: string;
  rates: TaxRate[];
  createdAt: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  currency?: CurrencyCode;
  tags?: string[];
  createdAt: string;
}

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
  memo?: string;
  taxCategory?: string;
  tags?: string[];
  entityId?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description?: string;
  lines: JournalLine[];
  referenceId?: string;
  postedBy?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  account: string;
  debit: number;
  credit: number;
  currency: CurrencyCode;
  memo?: string;
  journalId?: string;
  referenceId?: string;
  entityId?: string;
  taxCategory?: string;
  tags?: string[];
}

export type InventoryTransactionType = 'IN' | 'OUT' | 'ADJUST';

export type InventoryValuationMethod = 'FIFO' | 'LIFO' | 'AVG';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  uom: string;
  category?: string;
  quantityOnHand: number;
  averageCost: number;
  currency: CurrencyCode;
  updatedAt: string;
}

export interface InventoryLot {
  id: string;
  sku: string;
  quantity: number;
  unitCost: number;
  receivedAt: string;
}

export interface InventoryTransaction {
  id: string;
  sku: string;
  type: InventoryTransactionType;
  quantity: number;
  unitCost?: number;
  date: string;
  referenceId?: string;
  memo?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  actual: number;
}

export interface BudgetPlan {
  id: string;
  name: string;
  currency: CurrencyCode;
  periodStart: string;
  periodEnd: string;
  categories: BudgetCategory[];
  createdAt: string;
}

export interface CashflowLine {
  category: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashflowSnapshot {
  id: string;
  currency: CurrencyCode;
  periodStart: string;
  periodEnd: string;
  inflows: number;
  outflows: number;
  net: number;
  lines: CashflowLine[];
  generatedAt: string;
}

export type ReportType = 'PL' | 'BS' | 'CF' | 'TB';

export interface FinancialReportSnapshot {
  id: string;
  type: ReportType;
  currency: CurrencyCode;
  generatedAt: string;
  data: Record<string, unknown>;
}

export interface FinanceSettings {
  valuationMethod: InventoryValuationMethod;
  defaultCurrency: CurrencyCode;
}

export type PeriodStatus = 'OPEN' | 'CLOSED';

export interface FinancePeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  closedAt?: string;
}

export interface InventoryValuationReport {
  asOf: string;
  valuationMethod: InventoryValuationMethod;
  totalValue: number;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    value: number;
  }>;
}

export interface UserFinanceData {
  settings: FinanceSettings;
  periods: FinancePeriod[];
  chartOfAccounts: ChartAccount[];
  ledgers: LedgerEntry[];
  journals: JournalEntry[];
  taxProfiles: TaxProfile[];
  inventoryItems: InventoryItem[];
  inventoryLots: InventoryLot[];
  inventoryTransactions: InventoryTransaction[];
  budgets: BudgetPlan[];
  cashflows: CashflowSnapshot[];
  reports: FinancialReportSnapshot[];
}

export interface FinanceStore {
  users: Record<string, UserFinanceData>;
}