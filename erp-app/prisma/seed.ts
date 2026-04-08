import 'dotenv/config';
import { AccountType } from '@prisma/client';
import { prisma } from '../src/lib/db';

/**
 * Seed — Chart of Accounts
 * 
 * Standard Indian double-entry structure:
 * 
 * ASSETS (Dr normal)
 *   ├── Cash & Bank
 *   ├── Accounts Receivable (AR)
 *   ├── Inventory Asset
 *   └── GST Input Credit
 * 
 * LIABILITIES (Cr normal)
 *   ├── Accounts Payable (AP)
 *   └── GST Output Liability
 *       ├── CGST Output
 *       ├── SGST Output
 *       └── IGST Output
 * 
 * EQUITY (Cr normal)
 *   ├── Owner's Equity
 *   └── Retained Earnings
 * 
 * REVENUE (Cr normal) — P&L
 *   ├── Sales Revenue
 *   ├── Commission Income (Buyer)
 *   └── Commission Income (Seller)
 * 
 * EXPENSE (Dr normal) — P&L
 *   ├── Cost of Goods Sold (COGS)
 *   ├── Commission Expense
 *   └── General & Admin Expenses
 */

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  isPandL: boolean;
  parentCode?: string;
}

const accounts: AccountSeed[] = [
  // ── ASSETS ──
  { code: '1000', name: 'Assets', type: 'Asset', isPandL: false },
  { code: '1100', name: 'Cash & Bank', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1110', name: 'Cash in Hand', type: 'Asset', isPandL: false, parentCode: '1100' },
  { code: '1120', name: 'Bandhan Bank', type: 'Asset', isPandL: false, parentCode: '1100' },
  { code: '1130', name: 'ICICI Bank', type: 'Asset', isPandL: false, parentCode: '1100' },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1300', name: 'Inventory Asset', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1400', name: 'GST Input Credit', type: 'Asset', isPandL: false, parentCode: '1000' },
  { code: '1410', name: 'CGST Input', type: 'Asset', isPandL: false, parentCode: '1400' },
  { code: '1420', name: 'SGST Input', type: 'Asset', isPandL: false, parentCode: '1400' },
  { code: '1430', name: 'IGST Input', type: 'Asset', isPandL: false, parentCode: '1400' },

  // ── LIABILITIES ──
  { code: '2000', name: 'Liabilities', type: 'Liability', isPandL: false },
  { code: '2100', name: 'Accounts Payable', type: 'Liability', isPandL: false, parentCode: '2000' },
  { code: '2200', name: 'GST Output Liability', type: 'Liability', isPandL: false, parentCode: '2000' },
  { code: '2210', name: 'CGST Output', type: 'Liability', isPandL: false, parentCode: '2200' },
  { code: '2220', name: 'SGST Output', type: 'Liability', isPandL: false, parentCode: '2200' },
  { code: '2230', name: 'IGST Output', type: 'Liability', isPandL: false, parentCode: '2200' },
  { code: '2300', name: 'TDS Payable', type: 'Liability', isPandL: false, parentCode: '2000' },

  // ── EQUITY ──
  { code: '3000', name: 'Equity', type: 'Equity', isPandL: false },
  { code: '3100', name: "Owner's Equity", type: 'Equity', isPandL: false, parentCode: '3000' },
  { code: '3200', name: 'Retained Earnings', type: 'Equity', isPandL: false, parentCode: '3000' },

  // ── REVENUE (P&L) ──
  { code: '4000', name: 'Revenue', type: 'Revenue', isPandL: true },
  { code: '4100', name: 'Sales Revenue', type: 'Revenue', isPandL: true, parentCode: '4000' },
  { code: '4200', name: 'Commission Income (Buyer)', type: 'Revenue', isPandL: true, parentCode: '4000' },
  { code: '4300', name: 'Commission Income (Seller)', type: 'Revenue', isPandL: true, parentCode: '4000' },
  { code: '4400', name: 'Other Income', type: 'Revenue', isPandL: true, parentCode: '4000' },

  // ── EXPENSES (P&L) ──
  { code: '5000', name: 'Expenses', type: 'Expense', isPandL: true },
  { code: '5100', name: 'Cost of Goods Sold (COGS)', type: 'Expense', isPandL: true, parentCode: '5000' },
  { code: '5200', name: 'Commission Expense', type: 'Expense', isPandL: true, parentCode: '5000' },
  { code: '5300', name: 'General & Admin Expenses', type: 'Expense', isPandL: true, parentCode: '5000' },
  { code: '5400', name: 'Bank Charges', type: 'Expense', isPandL: true, parentCode: '5000' },
];

async function main() {
  console.log('🌱 Seeding Chart of Accounts...\n');

  // First pass: create all accounts without parent links
  const createdAccounts: Record<string, string> = {};

  for (const acct of accounts) {
    const created = await prisma.account.upsert({
      where: { code: acct.code },
      update: {
        name: acct.name,
        type: acct.type,
        isPandL: acct.isPandL,
      },
      create: {
        code: acct.code,
        name: acct.name,
        type: acct.type,
        isPandL: acct.isPandL,
      },
    });
    createdAccounts[acct.code] = created.id;
    console.log(`  ✓ ${acct.code} — ${acct.name} (${acct.type})`);
  }

  // Second pass: set parent relationships
  for (const acct of accounts) {
    if (acct.parentCode && createdAccounts[acct.parentCode]) {
      await prisma.account.update({
        where: { code: acct.code },
        data: { parentId: createdAccounts[acct.parentCode] },
      });
    }
  }

  console.log(`\n✅ Seeded ${accounts.length} accounts successfully.`);

  // --- MOCK DATA INJECTION ---
  console.log('\n🌱 Seeding Mock Data (Clients, Products, Invoices, Receipts)...');

  // 1. Clients
  const client1 = await prisma.client.upsert({
    where: { code: 'CLI-001' },
    update: {},
    create: {
      code: 'CLI-001',
      name: 'Acme Corp',
      type: 'Customer',
      gstin: '27AADCB2230M1Z2',
      customerAccountId: createdAccounts['1200'], // AR
    }
  });

  const client2 = await prisma.client.upsert({
    where: { code: 'VND-001' },
    update: {},
    create: {
      code: 'VND-001',
      name: 'Global Supplies Ltd',
      type: 'Vendor',
      gstin: '27VNDCB2230M1Z2',
      vendorAccountId: createdAccounts['2100'], // AP
    }
  });

  // 2. Product
  const product1 = await prisma.product.upsert({
    where: { sku: 'SKU-WIDGET-01' },
    update: {},
    create: {
      sku: 'SKU-WIDGET-01',
      name: 'Premium Widget',
      hsnCode: '8471',
      defaultUom: 'PCS',
      isStocked: true,
      defaultIncomeAccountId: createdAccounts['4100'], // Sales Revenue
      gstRate: 18,
    }
  });

  // 3. Bank Account
  const bank1 = await prisma.bankAccount.upsert({
    where: { accountId: createdAccounts['1130'] },
    update: {},
    create: {
      accountId: createdAccounts['1130'], // ICICI Bank
      bankName: 'ICICI Bank',
      accountNumber: '000123456789',
      ifscCode: 'ICIC0000001',
    }
  });

  // 4. Invoice + Transaction + Journals
  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-001',
      type: 'TaxInvoice',
      date: new Date(),
      clientId: client1.id,
      totalAmount: 1180,
      totalTax: 180,
      status: 'posted',
      lines: {
        create: [
          {
            productId: product1.id,
            qty: 10,
            unitPrice: 100,
            lineNet: 1000,
            gstRate: 18,
            gstAmount: 180,
          }
        ]
      },
      transactions: {
        create: [
          {
            description: 'Invoice Posting',
            postedAt: new Date(),
            journalEntries: {
              create: [
                { accountId: createdAccounts['1200'], amount: 1180, entryType: 'Dr' },
                { accountId: createdAccounts['4100'], amount: -1000, entryType: 'Cr' },
                { accountId: createdAccounts['2210'], amount: -90, entryType: 'Cr' }, // CGST
                { accountId: createdAccounts['2220'], amount: -90, entryType: 'Cr' }, // SGST
              ]
            }
          }
        ]
      }
    }
  });

  // 5. Receipt + Transaction + Journals (Partial Payment for the Invoice)
  await prisma.receipt.upsert({
    where: { receiptNumber: 'RCPT-2026-001' },
    update: {},
    create: {
      receiptNumber: 'RCPT-2026-001',
      date: new Date(),
      clientId: client1.id,
      bankAccountId: bank1.id,
      amount: 500,
      paymentMode: 'NEFT',
      referenceNumber: 'NEFT/123456789',
      status: 'posted',
      transactions: {
        create: [
          {
            description: 'Receipt Settlement',
            postedAt: new Date(),
            journalEntries: {
              create: [
                { accountId: createdAccounts['1130'], amount: 500, entryType: 'Dr' },
                { accountId: createdAccounts['1200'], amount: -500, entryType: 'Cr' }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('✅ Mock data seeded successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
