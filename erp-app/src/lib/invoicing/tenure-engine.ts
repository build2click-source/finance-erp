/**
 * Tenure Engine — Recurring Billing Cycle Management
 *
 * Evaluates which tenures are due for billing and generates
 * Draft invoices automatically. Invoices are never auto-posted
 * to preserve the ledger's immutability guarantees.
 */
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { TenureFrequency } from '@prisma/client';

/**
 * Compute the next billing date based on the current date and frequency.
 */
export function computeNextBillingDate(
  currentDate: Date,
  frequency: TenureFrequency
): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Annually':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Find all active tenures whose nextBillingDate is on or before today.
 */
export async function getDueTenures() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.tenure.findMany({
    where: {
      status: 'active',
      nextBillingDate: { lte: today },
    },
    include: {
      client: true,
    },
  });
}

/**
 * Generate Draft invoices for all due tenures and advance
 * each tenure's nextBillingDate to the next cycle.
 *
 * Returns the list of generated invoice IDs.
 */
export async function processDueTenures(): Promise<string[]> {
  const dueTenures = await getDueTenures();
  const generatedInvoiceIds: string[] = [];

  for (const tenure of dueTenures) {
    // Skip if the tenure has ended
    if (tenure.endDate && new Date(tenure.endDate) < new Date()) {
      await prisma.tenure.update({
        where: { id: tenure.id },
        data: { status: 'cancelled' },
      });
      continue;
    }

    const invoiceId = uuidv4();
    const gstRate = Number(tenure.gstRate);
    const baseAmount = Number(tenure.amount);
    const taxAmount = Math.round((baseAmount * gstRate) / 100 * 100) / 100;
    const totalAmount = baseAmount + taxAmount;

    const nextDate = computeNextBillingDate(
      new Date(tenure.nextBillingDate),
      tenure.frequency
    );

    // Atomic: create invoice + advance tenure
    await prisma.$transaction(async (tx) => {
      await tx.invoice.create({
        data: {
          id: invoiceId,
          invoiceNumber: `INV-AUTO-${Date.now()}`,
          type: 'TaxInvoice',
          date: new Date(tenure.nextBillingDate),
          clientId: tenure.clientId,
          totalAmount,
          totalTax: taxAmount,
          status: 'draft', // Always draft — user must manually post
          lines: {
            create: [
              {
                description: tenure.description,
                qty: 1,
                unitPrice: baseAmount,
                lineNet: baseAmount,
                gstRate,
                gstAmount: taxAmount,
              },
            ],
          },
        },
      });

      await tx.tenure.update({
        where: { id: tenure.id },
        data: { nextBillingDate: nextDate },
      });
    });

    generatedInvoiceIds.push(invoiceId);
  }

  return generatedInvoiceIds;
}
