const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to Postgres.');

  const tablesToDrop = [
    'accounts', 'transactions', 'entries', 'clients', 'client_history', 
    'client_kyc', 'products', 'trades', 'trade_line_items', 'invoices',
    'invoice_lines', 'receipts', 'payments', 'bank_accounts', 'bank_transactions',
    'inventory_movements', 'cost_layers', 'tenures', 'company_profile', 'vendor_bills'
  ];

  const enumsToDrop = [
    'AccountType', 'EntryType', 'GstType', 'MovementType', 'InvoiceType', 
    'InvoiceStatus', 'ClientType', 'ClientStatus', 'KycStatus', 'PaymentMode', 
    'ReceiptStatus', 'TenureFrequency', 'TenureStatus', 'BillStatus'
  ];

  console.log('Dropping ERP objects from public schema...');
  for (const table of tablesToDrop) {
    try {
      await client.query(`DROP TABLE IF EXISTS "public"."${table}" CASCADE`);
      console.log(`Dropped table public.${table}`);
    } catch (e) {
      console.log(`Failed to drop public.${table}: ${e.message}`);
    }
  }
  for (const enm of enumsToDrop) {
    try {
      await client.query(`DROP TYPE IF EXISTS "public"."${enm}" CASCADE`);
      console.log(`Dropped enum public.${enm}`);
    } catch (e) {
      console.log(`Failed to drop public.${enm}: ${e.message}`);
    }
  }

  await client.end();
  console.log('Public Schema Purge Complete.');
}
run().catch(console.error);
