import { getUserFinance, saveUserFinance } from '../financeStore';
import type { FinanceSettings, InventoryValuationMethod } from '../types';

export async function getFinanceSettings(userId: string): Promise<FinanceSettings> {
  const data = await getUserFinance(userId);
  return data.settings;
}

export async function updateFinanceSettings(userId: string, input: Partial<FinanceSettings>): Promise<FinanceSettings> {
  const data = await getUserFinance(userId);
  data.settings = {
    ...data.settings,
    ...input,
  };
  await saveUserFinance(userId, data);
  return data.settings;
}

export async function setValuationMethod(userId: string, method: InventoryValuationMethod): Promise<FinanceSettings> {
  return updateFinanceSettings(userId, { valuationMethod: method });
}