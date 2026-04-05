import fs from 'fs/promises';
import path from 'path';
import type { FinanceStore, UserFinanceData } from './types';

const APP_ROOT = path.resolve(__dirname, '../../..');
const DATA_DIR = path.join(APP_ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'finance-store.json');

const defaultUserData = (): UserFinanceData => ({
  settings: {
    valuationMethod: 'FIFO',
    defaultCurrency: 'AUD',
  },
  periods: [],
  chartOfAccounts: [],
  ledgers: [],
  journals: [],
  taxProfiles: [],
  inventoryItems: [],
  inventoryLots: [],
  inventoryTransactions: [],
  budgets: [],
  cashflows: [],
  reports: [],
});

const defaultStore: FinanceStore = {
  users: {},
};

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(defaultStore, null, 2));
  }
}

export async function loadFinanceStore(): Promise<FinanceStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  try {
    const parsed = JSON.parse(raw) as FinanceStore;
    return parsed && parsed.users ? parsed : defaultStore;
  } catch {
    return defaultStore;
  }
}

export async function saveFinanceStore(store: FinanceStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getUserFinance(userId: string): Promise<UserFinanceData> {
  const store = await loadFinanceStore();
  if (!store.users[userId]) {
    store.users[userId] = defaultUserData();
    await saveFinanceStore(store);
  }
  return store.users[userId];
}

export async function saveUserFinance(userId: string, data: UserFinanceData): Promise<void> {
  const store = await loadFinanceStore();
  store.users[userId] = data;
  await saveFinanceStore(store);
}