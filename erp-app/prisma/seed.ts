import 'dotenv/config';
import { AccountType, AppRole, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as crypto from 'crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================
// 1. DATA DEFINITIONS
// ============================================================

const accounts = [
  // ── ASSETS ──
  { code: '1000', name: 'Assets', type: 'Asset' as AccountType, isPandL: false },
  { code: '1100', name: 'Cash & Bank', type: 'Asset' as AccountType, isPandL: false, parentCode: '1000' },
  { code: '1110', name: 'Cash in Hand', type: 'Asset' as AccountType, isPandL: false, parentCode: '1100' },
  { code: '1120', name: 'HDFC Bank', type: 'Asset' as AccountType, isPandL: false, parentCode: '1100' },
  { code: '1130', name: 'ICICI Bank', type: 'Asset' as AccountType, isPandL: false, parentCode: '1100' },
  { code: '1140', name: 'State Bank of India', type: 'Asset' as AccountType, isPandL: false, parentCode: '1100' },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset' as AccountType, isPandL: false, parentCode: '1000' },
  { code: '1300', name: 'Inventory Asset', type: 'Asset' as AccountType, isPandL: false, parentCode: '1000' },
  { code: '1400', name: 'GST Input Credit', type: 'Asset' as AccountType, isPandL: false, parentCode: '1000' },
  { code: '1410', name: 'CGST Input', type: 'Asset' as AccountType, isPandL: false, parentCode: '1400' },
  { code: '1420', name: 'SGST Input', type: 'Asset' as AccountType, isPandL: false, parentCode: '1400' },
  { code: '1430', name: 'IGST Input', type: 'Asset' as AccountType, isPandL: false, parentCode: '1400' },

  // ── LIABILITIES ──
  { code: '2000', name: 'Liabilities', type: 'Liability' as AccountType, isPandL: false },
  { code: '2100', name: 'Accounts Payable', type: 'Liability' as AccountType, isPandL: false, parentCode: '2000' },
  { code: '2200', name: 'GST Output Liability', type: 'Liability' as AccountType, isPandL: false, parentCode: '2000' },
  { code: '2210', name: 'CGST Output', type: 'Liability' as AccountType, isPandL: false, parentCode: '2200' },
  { code: '2220', name: 'SGST Output', type: 'Liability' as AccountType, isPandL: false, parentCode: '2200' },
  { code: '2230', name: 'IGST Output', type: 'Liability' as AccountType, isPandL: false, parentCode: '2200' },
  { code: '2300', name: 'TDS Payable', type: 'Liability' as AccountType, isPandL: false, parentCode: '2000' },

  // ── EQUITY ──
  { code: '3000', name: 'Equity', type: 'Equity' as AccountType, isPandL: false },
  { code: '3100', name: "Owner's Equity", type: 'Equity' as AccountType, isPandL: false, parentCode: '3000' },
  { code: '3200', name: 'Retained Earnings', type: 'Equity' as AccountType, isPandL: false, parentCode: '3000' },

  // ── REVENUE (P&L) ──
  { code: '4000', name: 'Revenue', type: 'Revenue' as AccountType, isPandL: true },
  { code: '4100', name: 'Sales Revenue', type: 'Revenue' as AccountType, isPandL: true, parentCode: '4000' },
  { code: '4200', name: 'Commission Income (Buyer)', type: 'Revenue' as AccountType, isPandL: true, parentCode: '4000' },
  { code: '4300', name: 'Commission Income (Seller)', type: 'Revenue' as AccountType, isPandL: true, parentCode: '4000' },
  { code: '4400', name: 'Other Income', type: 'Revenue' as AccountType, isPandL: true, parentCode: '4000' },

  // ── EXPENSES (P&L) ──
  { code: '5000', name: 'Expenses', type: 'Expense' as AccountType, isPandL: true },
  { code: '5100', name: 'Cost of Goods Sold (COGS)', type: 'Expense' as AccountType, isPandL: true, parentCode: '5000' },
  { code: '5200', name: 'Commission Expense', type: 'Expense' as AccountType, isPandL: true, parentCode: '5000' },
  { code: '5300', name: 'General & Admin Expenses', type: 'Expense' as AccountType, isPandL: true, parentCode: '5000' },
  { code: '5400', name: 'Bank Charges', type: 'Expense' as AccountType, isPandL: true, parentCode: '5000' },
];

const POLICIES = [
  {
    role: 'admin' as AppRole,
    permissions: {
      canManageLedger: true,
      canFinalizeInvoices: true,
      canViewReports: true,
      canManageUsers: true,
      canManageProducts: true,
      canPostVendorBills: true,
      canManageClients: true,
      canDoDataEntry: true,
    },
    allowedViews: ['dashboard', 'clients', 'data-entry', 'invoices', 'receipts', 'payments', 'vendor-bills', 'trade-summary', 'transactions', 'ledger', 'bank', 'accounts', 'financial-reports', 'outstanding', 'tax-reports', 'gst-reports', 'products', 'tenure', 'settings']
  },
  {
    role: 'accountant' as AppRole,
    permissions: {
      canManageLedger: true,
      canFinalizeInvoices: true,
      canViewReports: true,
      canManageUsers: false,
      canManageProducts: false,
      canPostVendorBills: true,
      canManageClients: false,
      canDoDataEntry: false,
    },
    allowedViews: ['dashboard', 'clients', 'data-entry', 'invoices', 'receipts', 'payments', 'vendor-bills', 'trade-summary', 'transactions', 'ledger', 'bank', 'accounts', 'financial-reports', 'outstanding', 'tax-reports', 'gst-reports', 'settings']
  },
  {
    role: 'data_entry' as AppRole,
    permissions: {
      canManageLedger: false,
      canFinalizeInvoices: false,
      canViewReports: false,
      canManageUsers: false,
      canManageProducts: false,
      canPostVendorBills: false,
      canManageClients: true,
      canDoDataEntry: true,
    },
    allowedViews: ['dashboard', 'clients', 'data-entry', 'invoices', 'receipts', 'payments', 'vendor-bills', 'trade-summary', 'settings']
  }
];

// ============================================================
// 2. HELPERS
// ============================================================

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100_000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data using TRUNCATE CASCADE...');
  try {
    const tables = [
      '"ERP"."invoice_lines"',
      '"ERP"."journal_entries"',
      '"ERP"."inventory_movements"',
      '"ERP"."cost_layers"',
      '"ERP"."transactions"',
      '"ERP"."receipts"',
      '"ERP"."payments"',
      '"ERP"."vendor_bills"',
      '"ERP"."invoices"',
      '"ERP"."trades"',
      '"ERP"."bank_accounts"',
      '"ERP"."client_kyc"',
      '"ERP"."client_history"',
      '"ERP"."tenures"',
      '"ERP"."account_snapshots"',
      '"ERP"."products"',
      '"ERP"."clients"',
      '"ERP"."accounts"',
      '"ERP"."company_profile"',
      '"ERP"."users"',
      '"ERP"."system_policies"'
    ];
    
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
    }
  } catch (e) {
    console.error('TRUNCATE error (some tables might not exist yet):', e);
  }
}

// ============================================================
// 3. MAIN SEED
// ============================================================

async function main() {
  await cleanDatabase();

  // ── SEED SYSTEM POLICIES ──
  console.log('🛡️ Seeding System Policies...');
  for (const policy of POLICIES) {
    await prisma.systemPolicy.create({
      data: {
        role: policy.role,
        permissions: policy.permissions,
        allowedViews: policy.allowedViews
      }
    });
  }
  console.log(`✅ Seeded ${POLICIES.length} system policies.`);

  // ── SEED COMPANY PROFILE ──
  console.log('\n🏢 Seeding Company Profile...');
  await prisma.companyProfile.create({
    data: {
      name: 'ARM Enterprises',
      state: 'West Bengal',
      city: 'Kolkata',
      gstin: '19AAACA1234A1Z5',
      pincode: '700001',
      email: 'billing@armenterprises.com',
      phone: '+919999999999',
    }
  });
  console.log('✅ Company Profile created.');

  // ── SEED ADMIN USER ──
  console.log('\n👤 Seeding Administrative User...');
  const adminHash = await hashPassword('Admin@123');
  await prisma.user.create({
    data: {
      username: 'admin',
      displayName: 'Administrator',
      email: 'admin@company.com',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true
    }
  });
  console.log('✅ Default admin user created: admin / Admin@123');

  // ── SEED CHART OF ACCOUNTS ──
  console.log('\n🌱 Seeding Chart of Accounts...');
  const createdAccounts: Record<string, string> = {};

  for (const acct of accounts) {
    const created = await prisma.account.create({
      data: {
        code: acct.code,
        name: acct.name,
        type: acct.type,
        isPandL: acct.isPandL,
      },
    });
    createdAccounts[acct.code] = created.id;
  }

  for (const acct of accounts) {
    if (acct.parentCode && createdAccounts[acct.parentCode]) {
      await prisma.account.update({
        where: { code: acct.code },
        data: { parentId: createdAccounts[acct.parentCode] },
      });
    }
  }
  console.log(`✅ Seeded ${accounts.length} accounts successfully.`);

  // ── SEED BANK ACCOUNTS ──
  console.log('\n🏦 Seeding Banks...');
  const banks = [
    { accId: createdAccounts['1120'], name: 'HDFC Bank', no: 'HDFC0001234' },
    { accId: createdAccounts['1130'], name: 'ICICI Bank', no: 'ICIC0005678' },
    { accId: createdAccounts['1140'], name: 'State Bank of India', no: 'SBIN0009012' }
  ];

  const bankRecords = [];
  for (const bank of banks) {
    const createdBank = await prisma.bankAccount.create({
      data: {
        accountId: bank.accId,
        bankName: bank.name,
        accountNumber: bank.no,
        ifscCode: 'IFSC12345',
      }
    });
    bankRecords.push(createdBank);
  }

  // ── SEED CLIENTS ──
  console.log('\n👥 Seeding 10 Clients...');
  const clientData = [
    { name: 'Reliance Industries', code: 'RELIANCE', type: 'Customer', gstin: '27AAACR5055B1Z5' },
    { name: 'Tata Consultancy Services', code: 'TCS', type: 'Customer', gstin: '27AAACT4321A1Z5' },
    { name: 'Infosys Ltd', code: 'INFY', type: 'Both', gstin: '29AAACH7405L1Z1' },
    { name: 'Swiggy Foods', code: 'SWIGGY', type: 'Customer', gstin: '29AAECS1234D1Z2' },
    { name: 'Zomato Ltd', code: 'ZOMATO', type: 'Customer', gstin: '07AAECZ5678D1Z2' },
    { name: 'AWS India', code: 'AWS', type: 'Vendor', gstin: '07AABCA3456F1Z8' },
    { name: 'Digital Ocean', code: 'DIGDO', type: 'Vendor', gstin: '29AACCD9876E1Z3' },
    { name: 'Local Stationery Mart', code: 'STATIONERY', type: 'Vendor', gstin: '' },
    { name: 'ITC Limited', code: 'ITC', type: 'Both', gstin: '19AAACI4321A1Z5' },
    { name: 'Wipro Limited', code: 'WIPRO', type: 'Customer', gstin: '29AAACW1111A1Z5' },
  ];

  const clientRecords = [];
  for (const c of clientData) {
    const customerAcc = (c.type === 'Customer' || c.type === 'Both')
      ? await prisma.account.create({
          data: { code: `AR-${c.code}`, name: `A/R - ${c.name}`, type: 'Asset', subType: 'accounts_receivable', parentId: createdAccounts['1200'] }
        })
      : null;

    const vendorAcc = (c.type === 'Vendor' || c.type === 'Both')
      ? await prisma.account.create({
          data: { code: `AP-${c.code}`, name: `A/P - ${c.name}`, type: 'Liability', subType: 'accounts_payable', parentId: createdAccounts['2100'] }
        })
      : null;

    const createdClient = await prisma.client.create({
      data: {
        code: c.code,
        name: c.name,
        type: c.type as any,
        gstin: c.gstin,
        customerAccountId: customerAcc?.id,
        vendorAccountId: vendorAcc?.id,
        status: 'active' as any,
      }
    });
    clientRecords.push(createdClient);
  }

  // ── SEED PRODUCTS ──
  console.log('\n📦 Seeding Products...');
  const prod1 = await prisma.product.create({
    data: {
      sku: 'SKU-SOFTWARE-01',
      name: 'Enterprise Software License',
      hsnCode: '9973',
      defaultUom: 'NOS',
      isStocked: false,
      defaultIncomeAccountId: createdAccounts['4100'],
      gstRate: 18,
    }
  });

  const prod2 = await prisma.product.create({
    data: {
      sku: 'SKU-HARDWARE-01',
      name: 'Server Rack',
      hsnCode: '8471',
      defaultUom: 'PCS',
      isStocked: true,
      defaultIncomeAccountId: createdAccounts['4100'],
      gstRate: 18,
    }
  });

  // ── SEED MOCK TRANSACTIONS ──
  console.log('\n📝 Seeding 6 months of historical data...');
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const customers = clientRecords.filter(c => c.type === 'Customer' || c.type === 'Both');
  const vendors = clientRecords.filter(c => c.type === 'Vendor' || c.type === 'Both');

  for (let i = 1; i <= 20; i++) {
    const cust = customers[Math.floor(Math.random() * customers.length)];
    const bank = bankRecords[Math.floor(Math.random() * bankRecords.length)];
    const date = randomDate(sixMonthsAgo, now);

    const amount = 5000 + Math.floor(Math.random() * 20000);
    const tax = amount * 0.18;
    const total = amount + tax;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${date.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        type: 'TaxInvoice' as any,
        date: date,
        clientId: cust.id,
        totalAmount: total,
        totalTax: tax,
        cgst: tax / 2,
        sgst: tax / 2,
        status: 'posted' as any,
        lines: {
          create: [{
            productId: prod1.id,
            qty: 1,
            unitPrice: amount,
            lineNet: amount,
            gstRate: 18,
            gstAmount: tax,
          }]
        },
        transactions: {
          create: [{
            description: `Invoice Posting ${i}`,
            postedAt: date,
            createdAt: date,
            journalEntries: {
              create: [
                { accountId: cust.customerAccountId!, amount: total, entryType: 'Dr' as any, createdAt: date },
                { accountId: createdAccounts['4100'], amount: -amount, entryType: 'Cr' as any, createdAt: date },
                { accountId: createdAccounts['2210'], amount: -(tax / 2), entryType: 'Cr' as any, createdAt: date },
                { accountId: createdAccounts['2220'], amount: -(tax / 2), entryType: 'Cr' as any, createdAt: date },
              ]
            }
          }]
        }
      }
    });

    const receiptDate = new Date(date.getTime() + 5 * 24 * 60 * 60 * 1000);
    if (receiptDate < now && Math.random() > 0.3) {
      await prisma.receipt.create({
        data: {
          receiptNumber: `RCPT-${date.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          date: receiptDate,
          clientId: cust.id,
          bankAccountId: bank.id,
          amount: total,
          paymentMode: 'NEFT' as any,
          status: 'posted' as any,
          invoiceId: invoice.id,
          createdAt: receiptDate,
          transactions: {
            create: [{
              description: `Receipt Settlement ${i}`,
              postedAt: receiptDate,
              createdAt: receiptDate,
              journalEntries: {
                create: [
                  { accountId: bank.accountId, amount: total, entryType: 'Dr' as any, createdAt: receiptDate },
                  { accountId: cust.customerAccountId!, amount: -total, entryType: 'Cr' as any, createdAt: receiptDate }
                ]
              }
            }]
          }
        }
      });
    }
  }

  for (let i = 1; i <= 15; i++) {
    const ven = vendors[Math.floor(Math.random() * vendors.length)];
    const bank = bankRecords[Math.floor(Math.random() * bankRecords.length)];
    const date = randomDate(sixMonthsAgo, now);

    const amount = 2000 + Math.floor(Math.random() * 10000);
    const tax = amount * 0.18;
    const total = amount + tax;

    await prisma.vendorBill.create({
      data: {
        vendorId: ven.id,
        billNumber: `BILL-${date.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        date: date,
        totalAmount: total,
        cgst: tax / 2,
        sgst: tax / 2,
        status: 'posted' as any,
        createdAt: date
      }
    });

    await prisma.transaction.create({
      data: {
        description: `Vendor Bill Posting ${i}`,
        postedAt: date,
        createdAt: date,
        journalEntries: {
          create: [
            { accountId: createdAccounts['5300'], amount: amount, entryType: 'Dr' as any, createdAt: date },
            { accountId: createdAccounts['1410'], amount: tax / 2, entryType: 'Dr' as any, createdAt: date },
            { accountId: createdAccounts['1420'], amount: tax / 2, entryType: 'Dr' as any, createdAt: date },
            { accountId: ven.vendorAccountId!, amount: -total, entryType: 'Cr' as any, createdAt: date },
          ]
        }
      }
    });

    const paymentDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (paymentDate < now && Math.random() > 0.2) {
      await prisma.payment.create({
        data: {
          paymentNumber: `PAY-${date.getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          date: paymentDate,
          clientId: ven.id,
          bankAccountId: bank.id,
          amount: total,
          paymentMode: 'NEFT' as any,
          status: 'posted' as any,
          createdAt: paymentDate,
          transactions: {
            create: [{
              description: `Payment Settlement ${i}`,
              postedAt: paymentDate,
              createdAt: paymentDate,
              journalEntries: {
                create: [
                  { accountId: ven.vendorAccountId!, amount: total, entryType: 'Dr' as any, createdAt: paymentDate },
                  { accountId: bank.accountId, amount: -total, entryType: 'Cr' as any, createdAt: paymentDate }
                ]
              }
            }]
          }
        }
      });
    }
  }

  console.log('\n✅ Master Seed Complete: A fully functional environment has been initialized.');
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
