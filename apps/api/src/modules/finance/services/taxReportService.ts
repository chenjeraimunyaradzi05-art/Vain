import type { LedgerEntry, TaxProfile } from '../types';

export interface TaxReportLine {
  category: string;
  taxableAmount: number;
  taxAmount: number;
  rate: number;
}

export interface TaxReportSummary {
  totalTaxable: number;
  totalTax: number;
  lines: TaxReportLine[];
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function resolveRate(profile: TaxProfile | undefined, category: string): number {
  if (!profile) return 0;
  const rate = profile.rates.find((r) => r.name.toLowerCase() === category.toLowerCase());
  return rate ? rate.rate : 0;
}

export function buildTaxReport(entries: LedgerEntry[], profile?: TaxProfile): TaxReportSummary {
  const grouped: Record<string, number> = {};

  for (const entry of entries) {
    if (!entry.taxCategory) continue;
    const net = Number(entry.debit || 0) - Number(entry.credit || 0);
    const amount = Math.abs(net);
    grouped[entry.taxCategory] = (grouped[entry.taxCategory] || 0) + amount;
  }

  const lines: TaxReportLine[] = Object.entries(grouped).map(([category, taxableAmount]) => {
    const rate = resolveRate(profile, category);
    const taxAmount = round((taxableAmount * rate) / 100);
    return {
      category,
      taxableAmount: round(taxableAmount),
      taxAmount,
      rate,
    };
  });

  const totalTaxable = round(lines.reduce((sum, line) => sum + line.taxableAmount, 0));
  const totalTax = round(lines.reduce((sum, line) => sum + line.taxAmount, 0));

  return {
    totalTaxable,
    totalTax,
    lines,
  };
}