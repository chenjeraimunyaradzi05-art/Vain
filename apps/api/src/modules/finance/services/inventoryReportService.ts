import type { InventoryValuationReport } from '../types';
import { getUserFinance } from '../financeStore';

function round(value: number): number {
  return Number(value.toFixed(2));
}

export async function buildInventoryValuationReport(userId: string, asOf?: string): Promise<InventoryValuationReport> {
  const data = await getUserFinance(userId);
  const valuationMethod = data.settings?.valuationMethod || 'FIFO';
  const reportAsOf = asOf || new Date().toISOString();

  const items = data.inventoryItems.map((item) => {
    const quantity = Number(item.quantityOnHand || 0);
    const unitCost = Number(item.averageCost || 0);
    const value = round(quantity * unitCost);
    return {
      sku: item.sku,
      name: item.name,
      quantity: round(quantity),
      unitCost: round(unitCost),
      value,
    };
  });

  const totalValue = round(items.reduce((sum, line) => sum + line.value, 0));

  return {
    asOf: reportAsOf,
    valuationMethod,
    totalValue,
    items,
  };
}