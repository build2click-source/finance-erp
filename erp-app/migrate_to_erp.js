const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to Postgres.');

  // Ensure ERP schema exists
  await client.query('CREATE SCHEMA IF NOT EXISTS "ERP"');
  console.log('Schema ERP verified.');

  const tablesToMove = [
    'accounts', 'transactions', 'entries', 'clients', 'client_history', 
    'client_kyc', 'products', 'trades', 'trade_line_items', 'invoices',
    'invoice_lines', 'receipts', 'payments', 'bank_accounts', 'bank_transactions',
    'inventory_movements', 'cost_layers', 'tenures', 'company_profile', 'vendor_bills'
  ];

  const enumsToMove = [
    'AccountType', 'EntryType', 'GstType', 'MovementType', 'InvoiceType', 
    'InvoiceStatus', 'ClientType', 'ClientStatus', 'KycStatus', 'PaymentMode', 
    'ReceiptStatus', 'TenureFrequency', 'TenureStatus', 'BillStatus'
  ];

  // 1. Drop existing duplicates in ERP to avoid "already exists" errors
  console.log('Cleaning up existing ERP duplicates...');
  for (const table of tablesToMove) {
    try {
      await client.query(`DROP TABLE IF EXISTS "ERP"."${table}" CASCADE`);
    } catch (e) {
      console.error(`Error dropping table ERP.${table}:`, e.message);
    }
  }
  for (const enm of enumsToMove) {
    try {
      await client.query(`DROP TYPE IF EXISTS "ERP"."${enm}" CASCADE`);
    } catch (e) {
      console.error(`Error dropping enum ERP.${enm}:`, e.message);
    }
  }

  // 2. Move Enums
  console.log('Moving enums from public to ERP...');
  for (const enm of enumsToMove) {
    try {
      await client.query(`ALTER TYPE "public"."${enm}" SET SCHEMA "ERP"`);
      console.log(`Moved enum public.${enm} -> ERP.${enm}`);
    } catch (e) {
      console.log(`Skipped enum ${enm}: ${e.message}`);
    }
  }

  // 3. Move Tables
  console.log('Moving tables from public to ERP...');
  for (const table of tablesToMove) {
    try {
      await client.query(`ALTER TABLE "public"."${table}" SET SCHEMA "ERP"`);
      console.log(`Moved table public.${table} -> ERP.${table}`);
    } catch (e) {
      console.log(`Skipped table ${table}: ${e.message}`);
    }
  }

  await client.end();
  console.log('Migration Complete.');
}
run().catch(console.error);
