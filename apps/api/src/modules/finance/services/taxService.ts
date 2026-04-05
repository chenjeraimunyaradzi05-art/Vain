export interface TaxCalculationInput {
  category: string;
  rate: number;
  amount: number;
  inclusive?: boolean;
}

export interface TaxCalculationLine {
  category: string;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  inclusive: boolean;
}

export function calculateTaxLines(lines: TaxCalculationInput[]): TaxCalculationLine[] {
  return lines.map((line) => {
    const rate = Number(line.rate || 0);
    const amount = Number(line.amount || 0);
    const inclusive = Boolean(line.inclusive);
    const multiplier = rate / 100;

    if (inclusive && multiplier > 0) {
      const taxableAmount = amount / (1 + multiplier);
      const taxAmount = amount - taxableAmount;
      return {
        category: line.category,
        rate,
        taxableAmount: Number(taxableAmount.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        inclusive,
      };
    }

    const taxAmount = amount * multiplier;
    return {
      category: line.category,
      rate,
      taxableAmount: Number(amount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      inclusive,
    };
  });
}

export function summarizeTax(lines: TaxCalculationLine[]): {
  totalTax: number;
  totalTaxable: number;
  byCategory: Record<string, { taxable: number; tax: number; rate: number }>;
} {
  const summary: Record<string, { taxable: number; tax: number; rate: number }> = {};
  let totalTax = 0;
  let totalTaxable = 0;

  for (const line of lines) {
    if (!summary[line.category]) {
      summary[line.category] = { taxable: 0, tax: 0, rate: line.rate };
    }
    summary[line.category].taxable += line.taxableAmount;
    summary[line.category].tax += line.taxAmount;
    totalTax += line.taxAmount;
    totalTaxable += line.taxableAmount;
  }

  return {
    totalTax: Number(totalTax.toFixed(2)),
    totalTaxable: Number(totalTaxable.toFixed(2)),
    byCategory: summary,
  };
}

export function generateTaxInsights(lines: TaxCalculationLine[]): string[] {
  const insights: string[] = [];
  const summary = summarizeTax(lines);

  if (summary.totalTaxable > 0 && summary.totalTax === 0) {
    insights.push('No tax detected across taxable lines. Confirm GST/VAT settings are applied where required.');
  }

  const lowRateCategories = Object.entries(summary.byCategory)
    .filter(([, value]) => value.rate === 0)
    .map(([category]) => category);

  if (lowRateCategories.length > 0) {
    insights.push(`Categories with 0% tax rate: ${lowRateCategories.join(', ')}. Review if these should be exempt or taxable.`);
  }

  insights.push('Track deductible expenses by category to simplify year-end tax reporting.');
  insights.push('Reconcile tax collected vs tax paid monthly to avoid end-of-year surprises.');

  return insights;
}