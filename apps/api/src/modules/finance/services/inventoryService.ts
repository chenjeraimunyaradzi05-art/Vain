import { randomUUID } from 'crypto';
import { getUserFinance, saveUserFinance } from '../financeStore';
import type { InventoryItem, InventoryLot, InventoryTransaction, InventoryTransactionType } from '../types';

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sortLots(lots: InventoryLot[], method: 'FIFO' | 'LIFO'): InventoryLot[] {
  const sorted = [...lots].sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
  return method === 'LIFO' ? sorted.reverse() : sorted;
}

export async function listInventory(userId: string): Promise<InventoryItem[]> {
  const data = await getUserFinance(userId);
  return data.inventoryItems;
}

export async function upsertInventoryItem(userId: string, input: {
  sku: string;
  name: string;
  uom: string;
  category?: string;
  currency?: string;
}): Promise<InventoryItem> {
  const data = await getUserFinance(userId);
  const existing = data.inventoryItems.find((item) => item.sku === input.sku);
  const now = new Date().toISOString();

  if (existing) {
    existing.name = input.name || existing.name;
    existing.uom = input.uom || existing.uom;
    existing.category = input.category ?? existing.category;
    existing.currency = input.currency || existing.currency;
    existing.updatedAt = now;
    await saveUserFinance(userId, data);
    return existing;
  }

  const item: InventoryItem = {
    id: randomUUID(),
    sku: input.sku,
    name: input.name,
    uom: input.uom,
    category: input.category,
    quantityOnHand: 0,
    averageCost: 0,
    currency: input.currency || 'AUD',
    updatedAt: now,
  };

  data.inventoryItems.unshift(item);
  await saveUserFinance(userId, data);
  return item;
}

export async function applyInventoryTransaction(userId: string, input: {
  sku: string;
  type: InventoryTransactionType;
  quantity: number;
  unitCost?: number;
  date?: string;
  referenceId?: string;
  memo?: string;
}): Promise<{ transaction: InventoryTransaction; item: InventoryItem }> {
  const data = await getUserFinance(userId);
  const item = data.inventoryItems.find((i) => i.sku === input.sku);
  if (!item) {
    throw new Error('Inventory item not found');
  }

  const valuationMethod = data.settings?.valuationMethod || 'FIFO';

  const qty = Number(input.quantity || 0);
  if (qty <= 0) {
    throw new Error('Quantity must be greater than zero');
  }

  const transaction: InventoryTransaction = {
    id: randomUUID(),
    sku: input.sku,
    type: input.type,
    quantity: qty,
    unitCost: input.unitCost,
    date: input.date || new Date().toISOString(),
    referenceId: input.referenceId,
    memo: input.memo,
  };

  if (input.type === 'IN') {
    const unitCost = Number(input.unitCost || 0);
    if (unitCost <= 0) {
      throw new Error('Unit cost is required for inventory IN');
    }
    const lot: InventoryLot = {
      id: randomUUID(),
      sku: input.sku,
      quantity: qty,
      unitCost,
      receivedAt: transaction.date,
    };
    data.inventoryLots.push(lot);
    item.quantityOnHand = round(item.quantityOnHand + qty);
    const totalValue = item.averageCost * (item.quantityOnHand - qty) + unitCost * qty;
    item.averageCost = round(totalValue / item.quantityOnHand);
  }

  if (input.type === 'OUT') {
    if (item.quantityOnHand < qty) {
      throw new Error('Insufficient stock');
    }
    let remaining = qty;
    if (valuationMethod === 'FIFO' || valuationMethod === 'LIFO') {
      const lots = sortLots(data.inventoryLots.filter((lot) => lot.sku === input.sku && lot.quantity > 0), valuationMethod);
      for (const lot of lots) {
        if (remaining <= 0) break;
        const consumed = Math.min(lot.quantity, remaining);
        lot.quantity = round(lot.quantity - consumed);
        remaining -= consumed;
      }

      if (remaining > 0) {
        throw new Error('Insufficient stock for lot allocation');
      }
    }
    item.quantityOnHand = round(item.quantityOnHand - qty);
  }

  if (input.type === 'ADJUST') {
    item.quantityOnHand = round(item.quantityOnHand + qty);
  }

  item.updatedAt = new Date().toISOString();
  data.inventoryTransactions.unshift(transaction);
  await saveUserFinance(userId, data);
  return { transaction, item };
}