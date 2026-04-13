/**
 * POSTING ENGINE — Double-Entry Ledger
 * 
 * Core business rules enforced:
 * 1. Zero-Sum: Every transaction must satisfy SUM(journal_entries.amount) = 0
 * 2. Immutability: Once posted_at is set, no UPDATE/DELETE allowed
 * 3. Corrections use the Contra Pattern (reverse + new)
 * 
 * Amount convention:
 *   Positive (+) = Debit
 *   Negative (-) = Credit
 */

import { prisma } from '@/lib/db';
import { Prisma, EntryType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// TYPES
// ============================================================

export interface JournalLine {
  accountId: string;
  amount: number;         // positive = debit, negative = credit
  entryType: EntryType;   // Dr or Cr (must match sign)
  taxCode?: string;
  warehouseId?: string;
  costLayerId?: string;
}

export interface CreateTransactionInput {
  description?: string;
  referenceId?: string;
  invoiceId?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  lines: JournalLine[];
  postImmediately?: boolean;  // set posted_at = now()
}

export interface TransactionResult {
  transactionId: string;
  postedAt: Date | null;
  lineCount: number;
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate zero-sum constraint.
 * The SUM of all line amounts MUST equal exactly 0.
 */
function validateZeroSum(lines: JournalLine[]): void {
  if (lines.length < 2) {
    throw new PostingError('A transaction must have at least 2 journal entries');
  }

  const sum = lines.reduce((acc, line) => acc + line.amount, 0);
  
  // Tolerance for floating-point: must be within ±0.001
  if (Math.abs(sum) > 0.001) {
    throw new PostingError(
      `Zero-sum violation: entries sum to ${sum.toFixed(4)} (must be 0). ` +
      `Debits and credits must balance exactly.`
    );
  }
}

/**
 * Validate that entry_type matches the sign of amount.
 * Dr entries must have positive amounts, Cr entries must have negative amounts.
 */
function validateEntryTypes(lines: JournalLine[]): void {
  for (const line of lines) {
    if (line.entryType === 'Dr' && line.amount < 0) {
      throw new PostingError(
        `Debit entry for account ${line.accountId} has negative amount (${line.amount}). ` +
        `Debit entries must be positive.`
      );
    }
    if (line.entryType === 'Cr' && line.amount > 0) {
      throw new PostingError(
        `Credit entry for account ${line.accountId} has positive amount (${line.amount}). ` +
        `Credit entries must be negative.`
      );
    }
    if (line.amount === 0) {
      throw new PostingError(
        `Zero-amount entry for account ${line.accountId}. All entries must have non-zero amounts.`
      );
    }
  }
}

/**
 * Validate that all referenced accounts exist.
 */
async function validateAccounts(accountIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(accountIds)];
  const existing = await prisma.account.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });

  if (existing.length !== uniqueIds.length) {
    const found = new Set(existing.map((a) => a.id));
    const missing = uniqueIds.filter((id) => !found.has(id));
    throw new PostingError(`Account(s) not found: ${missing.join(', ')}`);
  }
}

// ============================================================
// POSTING ENGINE
// ============================================================

/**
 * Create a balanced ledger transaction with journal entries.
 * Runs in a single atomic database transaction.
 * 
 * @param input - transaction data with journal lines
 * @returns the created transaction ID and post status
 * @throws PostingError if validation fails
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<TransactionResult> {
  // Pre-validate
  validateZeroSum(input.lines);
  validateEntryTypes(input.lines);
  await validateAccounts(input.lines.map((l) => l.accountId));

  const txId = uuidv4();
  const postedAt = input.postImmediately ? new Date() : null;

  // Atomic database transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the transaction header
    const transaction = await tx.transaction.create({
      data: {
        id: txId,
        description: input.description,
        referenceId: input.referenceId,
        invoiceId: input.invoiceId,
        createdBy: input.createdBy,
        metadata: input.metadata as Prisma.InputJsonValue,
        postedAt,
      },
    });

    // Create all journal entries
    await tx.journalEntry.createMany({
      data: input.lines.map((line) => ({
        id: uuidv4(),
        transactionId: txId,
        accountId: line.accountId,
        amount: new Prisma.Decimal(line.amount),
        entryType: line.entryType,
        taxCode: line.taxCode,
        warehouseId: line.warehouseId,
        costLayerId: line.costLayerId,
      })),
    });

    return transaction;
  });

  return {
    transactionId: result.id,
    postedAt: result.postedAt,
    lineCount: input.lines.length,
  };
}

/**
 * Post an existing draft transaction (set posted_at = now()).
 * Once posted, the transaction becomes immutable.
 */
export async function postTransaction(transactionId: string): Promise<Date> {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) {
    throw new PostingError(`Transaction ${transactionId} not found`);
  }

  if (tx.postedAt) {
    throw new PostingError(
      `Transaction ${transactionId} is already posted at ${tx.postedAt.toISOString()}. ` +
      `Posted transactions are immutable.`
    );
  }

  const postedAt = new Date();
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { postedAt },
  });

  return postedAt;
}

// ============================================================
// CONTRA ENTRIES (CORRECTIONS)
// ============================================================

/**
 * Create a reversing (contra) transaction that negates the original.
 * Then create a new corrected transaction.
 * 
 * This is the ONLY way to "correct" a posted transaction.
 * Direct UPDATE/DELETE is forbidden.
 */
export async function createContraEntry(
  originalTransactionId: string,
  correctedLines: JournalLine[],
  reason: string,
  createdBy?: string
): Promise<{ reversalId: string; correctedId: string }> {
  // Fetch original transaction and its entries
  const original = await prisma.transaction.findUnique({
    where: { id: originalTransactionId },
    include: { journalEntries: true },
  });

  if (!original) {
    throw new PostingError(`Original transaction ${originalTransactionId} not found`);
  }

  if (!original.postedAt) {
    throw new PostingError(
      `Transaction ${originalTransactionId} is not posted. ` +
      `Only posted transactions need contra entries. Draft transactions can be deleted.`
    );
  }

  // Step 1: Create reversing transaction (negate all original lines)
  const reversalLines: JournalLine[] = original.journalEntries.map((entry) => ({
    accountId: entry.accountId,
    amount: -Number(entry.amount), // Negate
    entryType: entry.entryType === 'Dr' ? 'Cr' as EntryType : 'Dr' as EntryType,
  }));

  const reversal = await createTransaction({
    description: `REVERSAL: ${reason} (contra for ${originalTransactionId})`,
    referenceId: originalTransactionId,
    createdBy,
    metadata: {
      contraType: 'reversal',
      originalTransactionId,
      reason,
    },
    lines: reversalLines,
    postImmediately: true,
  });

  // Step 2: Create the corrected transaction
  const corrected = await createTransaction({
    description: `CORRECTION: ${reason} (replaces ${originalTransactionId})`,
    referenceId: originalTransactionId,
    createdBy,
    metadata: {
      contraType: 'correction',
      originalTransactionId,
      reversalTransactionId: reversal.transactionId,
      reason,
    },
    lines: correctedLines,
    postImmediately: true,
  });

  return {
    reversalId: reversal.transactionId,
    correctedId: corrected.transactionId,
  };
}

/**
 * Create ONLY a reversing (contra) transaction to void an original.
 */
export async function reverseTransaction(
  originalTransactionId: string,
  reason: string,
  createdBy?: string
): Promise<string> {
  const original = await prisma.transaction.findUnique({
    where: { id: originalTransactionId },
    include: { journalEntries: true },
  });

  if (!original) throw new PostingError(`Transaction ${originalTransactionId} not found`);
  if (!original.postedAt) throw new PostingError(`Transaction ${originalTransactionId} is not posted`);

  const reversalLines: JournalLine[] = original.journalEntries.map((entry) => ({
    accountId: entry.accountId,
    amount: -Number(entry.amount),
    entryType: entry.entryType === 'Dr' ? 'Cr' : 'Dr',
  }));

  const reversal = await createTransaction({
    description: `VOID: ${reason} (reversal of ${originalTransactionId})`,
    referenceId: originalTransactionId,
    createdBy,
    metadata: { contraType: 'void', originalTransactionId, reason },
    lines: reversalLines,
    postImmediately: true,
  });

  return reversal.transactionId;
}

// ============================================================
// CUSTOM ERROR
// ============================================================

export class PostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostingError';
  }
}
