const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected.');

  const alterations = [
    // Add missing columns to ERP.clients (the table was older)
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "code" TEXT UNIQUE`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "default_currency" CHAR(3) NOT NULL DEFAULT 'INR'`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "default_payment_terms" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "customer_account_id" UUID`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "vendor_account_id" UUID`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "gstin" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "place_of_supply" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "email" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "contact" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "address" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "city" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "state" TEXT`,
    `ALTER TABLE "ERP"."clients" ADD COLUMN IF NOT EXISTS "pincode" TEXT`,
    // Add missing columns to accounts if necessary
    `ALTER TABLE "ERP"."accounts" ADD COLUMN IF NOT EXISTS "sub_type" TEXT`,
    `ALTER TABLE "ERP"."accounts" ADD COLUMN IF NOT EXISTS "is_p_and_l" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "ERP"."accounts" ADD COLUMN IF NOT EXISTS "parent_id" UUID`,
    `ALTER TABLE "ERP"."accounts" ADD COLUMN IF NOT EXISTS "created_by" UUID`,
  ];

  for (const sql of alterations) {
    try {
      await client.query(sql);
      console.log('OK:', sql.substring(0, 70));
    } catch (e) {
      console.log('SKIP:', e.message.substring(0, 80));
    }
  }

  // Now fix indexes that may be missing
  const indexes = [
    `CREATE INDEX IF NOT EXISTS "idx_clients_search" ON "ERP"."clients" ("code", "name", "gstin")`,
    `CREATE INDEX IF NOT EXISTS "idx_accounts_type" ON "ERP"."accounts" ("type")`,
  ];

  for (const sql of indexes) {
    try {
      await client.query(sql);
      console.log('INDEX:', sql.substring(0, 70));
    } catch (e) {
      console.log('INDEX SKIP:', e.message.substring(0, 80));
    }
  }

  await client.end();
  console.log('\nDone. Schema patched.');
}
run().catch(console.error);
