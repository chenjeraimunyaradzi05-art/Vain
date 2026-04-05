import type { LedgerEntry, TaxProfile } from '../types';
import { buildTaxReport } from './taxReportService';

export interface TaxReturnSummary {
  periodStart: string;
  periodEnd: string;
  jurisdiction?: string;
  totalTaxable: number;
  totalTax: number;
  lines: Array<{ category: string; taxableAmount: number; taxAmount: number; rate: number }>;
  notes: string[];
}

export function buildTaxReturn(entries: LedgerEntry[], profile: TaxProfile | undefined, periodStart: string, periodEnd: string): TaxReturnSummary {
  const report = buildTaxReport(entries, profile);
  const notes = [
    'Review tax categories for uncategorized transactions before filing.',
    'Compare tax collected vs tax paid for the period to confirm cash obligations.',
  ];

  return {
    periodStart,
    periodEnd,
    jurisdiction: profile?.jurisdiction,
    totalTaxable: report.totalTaxable,
    totalTax: report.totalTax,
    lines: report.lines,
    notes,
  };
}