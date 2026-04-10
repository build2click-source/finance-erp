const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to Postgres.');

  const enums = [
    { name: 'BillStatus', values: ['draft', 'posted', 'paid', 'cancelled'] },
    { name: 'ClientType', values: ['Customer', 'Vendor', 'Both'] },
    { name: 'ClientStatus', values: ['prospect', 'active', 'onboarded', 'inactive'] },
    { name: 'KycStatus', values: ['pending', 'verified', 'rejected'] },
    { name: 'InvoiceStatus', values: ['draft', 'posted', 'paid', 'cancelled'] },
    { name: 'TenureStatus', values: ['active', 'completed', 'cancelled'] }
  ];

  for (const enm of enums) {
    try {
      // Check if exists in public
      const res = await client.query(`SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = '${enm.name}'`);
      if (res.rows.length === 0) {
        await client.query(`CREATE TYPE "public"."${enm.name}" AS ENUM (${enm.values.map(v => `'${v}'`).join(', ')});`);
        console.log(`Created enum public.${enm.name}`);
      } else {
        console.log(`Enum public.${enm.name} already exists.`);
      }
    } catch (e) {
      console.error(`Failed to create enum ${enm.name}:`, e.message);
    }
  }

  // Also ensure vendor_bills.status uses the public enum
  try {
     await client.query(`ALTER TABLE "vendor_bills" ALTER COLUMN "status" TYPE "public"."BillStatus" USING "status"::text::"public"."BillStatus"`);
     console.log('Updated vendor_bills.status to public.BillStatus');
  } catch(e) { console.log('vendor_bills status update skipped/failed:', e.message); }

  await client.end();
  console.log('Done.');
}
run().catch(console.error);
