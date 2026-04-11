/**
 * Migration script to create system_policies table and seed default permissions.
 * Bypasses prisma db push to avoid drift issues.
 */
import pg from 'pg';
import crypto from 'crypto';
import { readFileSync } from 'fs';

const { Client } = pg;

// Load .env
try {
  const env = readFileSync('.env', 'utf-8');
  for (const line of env.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
} catch (e) {
  console.warn('Could not load .env');
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No database connection string');
  process.exit(1);
}

// Default hardcoded values from src/lib/permissions.ts
const DEFAULTS = [
  {
    role: 'admin',
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
    role: 'accountant',
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
    role: 'data_entry',
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

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to DB');

  // 1. Create table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ERP"."system_policies" (
      "id" UUID NOT NULL,
      "role" "ERP"."AppRole" NOT NULL,
      "permissions" JSONB NOT NULL,
      "allowedViews" JSONB NOT NULL,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "system_policies_pkey" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "system_policies_role_key" ON "ERP"."system_policies"("role");
  `);

  console.log('Table "system_policies" created.');

  // 2. Seed defaults
  for (const item of DEFAULTS) {
    const id = crypto.randomUUID();
    await client.query(`
      INSERT INTO "ERP"."system_policies" (id, role, permissions, "allowedViews")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (role) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        "allowedViews" = EXCLUDED."allowedViews",
        updated_at = CURRENT_TIMESTAMP
    `, [id, item.role, JSON.stringify(item.permissions), JSON.stringify(item.allowedViews)]);
  }

  console.log('Default permissions seeded.');
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
