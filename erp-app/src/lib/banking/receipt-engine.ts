/**
 * RECEIPT & PAYMENT POSTING ENGINE
 * 
 * Handles atomic posting of incoming receipts (AR settlement) 
 * and outgoing payments (AP settlement) mapped directly to bank accounts.
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createTransaction, type JournalLine } from '@/lib/ledger';

// ============================================================
// TYPES
// ============================================================

export interface CreateReceiptInput {
  clientId: string;
  bankAccountId: string;
  date: string;
  amount: number;
  paymentMode: 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'Cash';
  referenceNumber?: string;
  notes?: string;
  // Account config for journal posting
  arAccountId: string; // The Accounts Receivable account to credit
  tdsAmount?: number;
  invoiceId?: string;
  createdBy?: string;
  status?: 'draft' | 'posted';
}

export interface CreatePaymentInput {
  clientId: string; // The vendor's client ID
  bankAccountId: string;
  date: string;
  amount: number;
  paymentMode: 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'Cash';
  referenceNumber?: string;
  notes?: string;
  // Account config for journal posting
  apAccountId: string; // The Accounts Payable account to debit
  createdBy?: string;
}

export interface PostedSettlementResult {
  id: string;
  documentNumber: string;
  transactionId: string;
  amount: number;
}

// ============================================================
// AUTO NUMBERING
// ============================================================

async function generateDocumentNumber(type: 'receipt' | 'payment', dateStr: string): Promise<string> {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  
  if (type === 'receipt') {
    const count = await prisma.receipt.count({
      where: {
        date: {
          gte: new Date(year, d.getMonth(), 1),
          lt: new Date(year, d.getMonth() + 1, 1),
        },
      },
    });
    return `RCT/${year}/${String(count + 1).padStart(4, '0')}`;
  } else {
    const count = await prisma.payment.count({
      where: {
        date: {
          gte: new Date(year, d.getMonth(), 1),
          lt: new Date(year, d.getMonth() + 1, 1),
        },
      },
    });
    return `PAY/${year}/${String(count + 1).padStart(4, '0')}`;
  }
}

// ============================================================
// POST RECEIPT (Incoming Funds)
// ============================================================
export async function postReceipt(input: CreateReceiptInput): Promise<PostedSettlementResult> {
  if (input.amount <= 0) throw new Error('Receipt amount must be positive');

  // Verify Bank Account and map it to a Ledger Account ID
  const bank = await prisma.bankAccount.findUnique({
    where: { id: input.bankAccountId },
    select: { accountId: true, bankName: true },
  });

  if (!bank) throw new Error('Bank account not found');

  const receiptId = uuidv4();
  const receiptNumber = await generateDocumentNumber('receipt', input.date);
  const isDraft = input.status === 'draft';

  let transactionId = '';

  if (!isDraft) {
    // Journal setup: Dr Bank / Cr Accounts Receivable
    const journalLines: JournalLine[] = [
      {
        accountId: bank.accountId,
        amount: input.amount, // Positive = Dr
        entryType: 'Dr',
      },
      {
        accountId: input.arAccountId,
        amount: -input.amount, // Negative = Cr
        entryType: 'Cr',
      }
    ];

    // Atomic transaction
    const txResult = await createTransaction({
      description: `Receipt ${receiptNumber} via ${input.paymentMode}${input.referenceNumber ? ` (Ref: ${input.referenceNumber})` : ''}`,
      metadata: { receiptId },
      createdBy: input.createdBy,
      lines: journalLines,
      postImmediately: true,
    });
    transactionId = txResult.transactionId;
  }

  await prisma.receipt.create({
    data: {
      id: receiptId,
      receiptNumber,
      date: new Date(input.date),
      clientId: input.clientId,
      bankAccountId: input.bankAccountId,
      amount: new Prisma.Decimal(input.amount),
      tdsAmount: input.tdsAmount ? new Prisma.Decimal(input.tdsAmount) : null,
      paymentMode: input.paymentMode,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      status: isDraft ? 'draft' : 'posted',
      invoiceId: input.invoiceId,
    },
  });

  // ── Invoice Settlement ────────────────────────────────────────────────
  // If this receipt is linked to an invoice and is posted, check if the
  // invoice is now fully settled (receipt amount >= 95% of invoice total).
  // If so, mark the invoice as 'cancelled' (the only "terminal" status
  // in the schema that removes it from AR — pending a paid status migration).
  if (!isDraft && input.invoiceId) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        select: { totalAmount: true, status: true },
      });
      if (invoice && invoice.status === 'posted') {
        const invoiceTotal = Number(invoice.totalAmount);
        const grossReceived = input.amount + (input.tdsAmount || 0);
        if (grossReceived >= invoiceTotal * 0.95) {
          await prisma.invoice.update({
            where: { id: input.invoiceId },
            data: { status: 'cancelled' }, // 'cancelled' = fully settled/paid in current schema
          });
        }
      }
    } catch (err) {
      // Non-fatal — log but don't fail the receipt posting
      console.warn('Invoice settlement update failed:', err);
    }
  }

  return {
    id: receiptId,
    documentNumber: receiptNumber,
    transactionId: transactionId,
    amount: input.amount,
  };
}

// ============================================================
// POST PAYMENT (Outgoing Funds)
// ============================================================
export async function postPayment(input: CreatePaymentInput): Promise<PostedSettlementResult> {
  if (input.amount <= 0) throw new Error('Payment amount must be positive');

  // Verify Bank Account
  const bank = await prisma.bankAccount.findUnique({
    where: { id: input.bankAccountId },
    select: { accountId: true, bankName: true },
  });

  if (!bank) throw new Error('Bank account not found');

  const paymentId = uuidv4();
  const paymentNumber = await generateDocumentNumber('payment', input.date);

  // Journal setup: Dr Accounts Payable / Cr Bank
  const journalLines: JournalLine[] = [
    {
      accountId: input.apAccountId,
      amount: input.amount, // Positive = Dr
      entryType: 'Dr',
    },
    {
      accountId: bank.accountId,
      amount: -input.amount, // Negative = Cr
      entryType: 'Cr',
    }
  ];

  // Atomic transaction
  const txResult = await createTransaction({
    description: `Payment ${paymentNumber} via ${input.paymentMode}${input.referenceNumber ? ` (Ref: ${input.referenceNumber})` : ''}`,
    metadata: { paymentId },
    createdBy: input.createdBy,
    lines: journalLines,
    postImmediately: true,
  });

  await prisma.payment.create({
    data: {
      id: paymentId,
      paymentNumber,
      date: new Date(input.date),
      clientId: input.clientId,
      bankAccountId: input.bankAccountId,
      amount: new Prisma.Decimal(input.amount),
      paymentMode: input.paymentMode,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      status: 'posted',
    },
  });

  return {
    id: paymentId,
    documentNumber: paymentNumber,
    transactionId: txResult.transactionId,
    amount: input.amount,
  };
}
