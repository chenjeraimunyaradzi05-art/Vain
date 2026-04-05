import { randomUUID } from 'crypto';
import { getUserFinance, saveUserFinance } from '../financeStore';
import type { TaxProfile, TaxRate } from '../types';

export async function listTaxProfiles(userId: string): Promise<TaxProfile[]> {
  const data = await getUserFinance(userId);
  return data.taxProfiles;
}

export async function createTaxProfile(userId: string, input: {
  name: string;
  jurisdiction: string;
  rates: TaxRate[];
}): Promise<TaxProfile> {
  const data = await getUserFinance(userId);
  const now = new Date().toISOString();
  const profile: TaxProfile = {
    id: randomUUID(),
    name: input.name,
    jurisdiction: input.jurisdiction,
    rates: input.rates.map((rate) => ({
      ...rate,
      id: rate.id || randomUUID(),
    })),
    createdAt: now,
  };

  data.taxProfiles.unshift(profile);
  await saveUserFinance(userId, data);
  return profile;
}