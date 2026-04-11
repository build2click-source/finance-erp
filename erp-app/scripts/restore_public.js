const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected.');

  const tablesToMove = [
    'accounts', 'transactions', 'entries', 'clients', 'client_history',
    'client_kyc', 'products', 'trades', 'trade_line_items', 'invoices',
    'invoice_lines', 'receipts', 'payments', 'bank_accounts',
    'inventory_movements', 'cost_layers', 'tenures', 'company_profile', 'vendor_bills'
  ];

  const enumsToMove = [
    'AccountType', 'EntryType', 'GstType', 'MovementType', 'InvoiceType',
    'InvoiceStatus', 'ClientType', 'ClientStatus', 'KycStatus', 'PaymentMode',
    'ReceiptStatus', 'TenureFrequency', 'TenureStatus', 'BillStatus'
  ];

  console.log('Moving enums from ERP -> public...');
  for (const enm of enumsToMove) {
    try {
      // Drop the public duplicate first if it exists
      await client.query(`DROP TYPE IF EXISTS "public"."${enm}" CASCADE`);
      await client.query(`ALTER TYPE "ERP"."${enm}" SET SCHEMA "public"`);
      console.log(`  Moved enum: ERP.${enm} -> public.${enm}`);
    } catch (e) {
      console.log(`  Skipped enum ${enm}: ${e.message}`);
    }
  }

  console.log('Moving tables from ERP -> public...');
  for (const table of tablesToMove) {
    try {
      await client.query(`DROP TABLE IF EXISTS "public"."${table}" CASCADE`);
      await client.query(`ALTER TABLE "ERP"."${table}" SET SCHEMA "public"`);
      console.log(`  Moved table: ERP.${table} -> public.${table}`);
    } catch (e) {
      console.log(`  Skipped table ${table}: ${e.message}`);
    }
  }

  await client.end();
  console.log('\nDone. All objects moved to public schema.');
}
run().catch(console.error);
