/**
 * RECEIPT & PAYMENT POSTING ENGINE
 * 
 * Handles atomic posting of incoming receipts (AR settlement) 
 * and outgoing payments (AP settlement) mapped directly to bank accounts.
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createTransaction, reverseTransaction, type JournalLine } from '@/lib/ledger';

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
  transactionDate?: string;
  clearingDate?: string;
  roundOff?: number;
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
  vendorBillId?: string;
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
    const roundOff = input.roundOff || 0;
    const arCredit = input.amount + roundOff; // Full AR clearance (amount + write-off)

    // Look up the Round-off & Discounts account (code 5500)
    // If not found, fall back to single-line journal (Bank = grossAmount)
    const roundOffAccount = roundOff !== 0
      ? await prisma.account.findUnique({ where: { code: '5500' }, select: { id: true } })
      : null;

    const journalLines: JournalLine[] = [
      {
        accountId: bank.accountId,
        amount: input.amount,   // Dr Bank = actual cash received only
        entryType: 'Dr',
      },
      {
        accountId: input.arAccountId,
        amount: -arCredit,      // Cr AR = full invoice settlement
        entryType: 'Cr',
      },
    ];

    // Add round-off journal line if account exists and roundOff is non-zero
    // roundOff > 0 → discount/write-off → Dr Expense (5500)
    // roundOff < 0 → overpayment absorbed → Cr Income (5500)
    if (roundOff !== 0 && roundOffAccount) {
      journalLines.push({
        accountId: roundOffAccount.id,
        amount: roundOff,       // Positive = Dr expense; Negative = Cr income
        entryType: roundOff > 0 ? 'Dr' : 'Cr',
      });
    } else if (roundOff !== 0 && !roundOffAccount) {
      // Fallback: no round-off account found — absorb into bank entry
      journalLines[0].amount = arCredit;
    }

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
      roundOff: new Prisma.Decimal(input.roundOff || 0),
      paymentMode: input.paymentMode,
      referenceNumber: input.referenceNumber,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : null,
      clearingDate: input.clearingDate ? new Date(input.clearingDate) : null,
      notes: input.notes,
      status: isDraft ? 'draft' : 'posted',
      invoiceId: input.invoiceId,
    },
  });

  // ── Invoice Settlement ────────────────────────────────────────────────
  // If this receipt is linked to a posted invoice, sum ALL posted receipts
  // (the new one was just persisted above, so it's included in the query).
  // Effective settlement = amount + roundOff (bankPosting = Dr amount + roundOff).
  // If the total settled >= expected cash (taxable × 1.16), mark as 'paid'.
  if (!isDraft && input.invoiceId) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        select: {
          totalAmount: true,
          totalTax: true,
          status: true,
          receipts: {
            where: { status: { in: ['posted', 'reconciled'] } },
            select: { amount: true, roundOff: true },
          },
        },
      });
      if (invoice && invoice.status === 'posted') {
        const invoiceTotal = Number(invoice.totalAmount);
        const totalTax = Number((invoice as any).totalTax || 0);
        const taxable = invoiceTotal - totalTax;
        // Expected cash client pays after TDS (taxable × 1.16)
        const expectedCash = taxable > 0 ? taxable * 1.16 : invoiceTotal;

        // Sum all posted receipts: amount + roundOff gives the effective bank posting
        // Positive roundOff = write-off/discount (client short-paid, we absorbed it)
        // Negative roundOff = overpayment absorbed as a write-off
        const totalReceived = invoice.receipts.reduce(
          (sum, r) => sum + Number(r.amount) + Number(r.roundOff || 0),
          0
        );

        if (totalReceived >= expectedCash * 0.99) {
          await prisma.invoice.update({
            where: { id: input.invoiceId },
            data: { status: 'paid' },
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
      vendorBillId: input.vendorBillId,
      status: 'posted',
    },
  });

  // ── Vendor Bill Settlement ──────────────────────────────────────────────
  if (input.vendorBillId) {
    try {
      const bill = await prisma.vendorBill.findUnique({
        where: { id: input.vendorBillId },
        select: { totalAmount: true, status: true },
      });
      if (bill && bill.status === 'posted') {
        const billTotal = Number(bill.totalAmount);
        if (input.amount >= billTotal * 0.95) {
           await prisma.vendorBill.update({
             where: { id: input.vendorBillId },
             data: { status: 'paid' },
           });
        }
      }
    } catch (err) {
      console.warn('Vendor bill settlement update failed:', err);
    }
  }

  return {
    id: paymentId,
    documentNumber: paymentNumber,
    transactionId: txResult.transactionId,
    amount: input.amount,
  };
}

/**
 * VOID RECEIPT
 */
export async function voidReceipt(id: string, reason: string) {
  return await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.findUnique({ where: { id } });
    if (!receipt) throw new Error('Receipt not found');
    if (receipt.status !== 'posted') {
      await tx.receipt.delete({ where: { id } });
      return { success: true, deleted: true };
    }

    // Identify transaction
    const transaction = await tx.transaction.findFirst({
      where: { metadata: { path: ['receiptId'], equals: id } }
    });

    if (transaction) {
      await reverseTransaction(transaction.id, reason);
    }

    await tx.receipt.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    return { success: true, voided: true };
  });
}
