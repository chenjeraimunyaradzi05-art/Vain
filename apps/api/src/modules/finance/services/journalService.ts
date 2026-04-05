import { randomUUID } from 'crypto';
import { getUserFinance, saveUserFinance } from '../financeStore';
import { isDateInClosedPeriod } from './periodService';
import type { JournalEntry, JournalLine, LedgerEntry } from '../types';

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validateJournalLines(lines: JournalLine[]): void {
  if (!lines.length) {
    throw new Error('Journal must contain at least one line');
  }
  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of lines) {
    if (!line.account || typeof line.account !== 'string') {
      throw new Error('Journal line missing account');
    }
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    if (debit < 0 || credit < 0) {
      throw new Error('Debit/Credit cannot be negative');
    }
    if (debit > 0 && credit > 0) {
      throw new Error('Line cannot contain both debit and credit');
    }
    debitTotal += debit;
    creditTotal += credit;
  }
  if (round(debitTotal) !== round(creditTotal)) {
    throw new Error('Journal must balance: total debits must equal total credits');
  }
}

export async function createJournalEntry(userId: string, input: {
  date: string;
  description?: string;
  lines: JournalLine[];
  referenceId?: string;
  postedBy?: string;
  currency?: string;
}): Promise<{ journal: JournalEntry; ledgerEntries: LedgerEntry[] }> {
  validateJournalLines(input.lines);
  const data = await getUserFinance(userId);
  if (isDateInClosedPeriod(input.date, data.periods || [])) {
    throw new Error('Journal date falls within a closed period');
  }
  const createdAt = new Date().toISOString();
  const journalId = randomUUID();
  const currency = input.currency || 'AUD';

  const journal: JournalEntry = {
    id: journalId,
    date: input.date,
    description: input.description,
    lines: input.lines,
    referenceId: input.referenceId,
    postedBy: input.postedBy,
    createdAt,
  };

  const ledgerEntries: LedgerEntry[] = input.lines.map((line) => ({
    id: randomUUID(),
    date: input.date,
    account: line.account,
    debit: round(Number(line.debit || 0)),
    credit: round(Number(line.credit || 0)),
    currency,
    memo: line.memo,
    journalId,
    referenceId: input.referenceId,
    entityId: line.entityId,
    taxCategory: line.taxCategory,
    tags: line.tags,
  }));

  data.journals.unshift(journal);
  data.ledgers.unshift(...ledgerEntries);

  await saveUserFinance(userId, data);
  return { journal, ledgerEntries };
}