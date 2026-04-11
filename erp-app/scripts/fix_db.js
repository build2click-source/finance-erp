const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to Postgres.');

  // Create vendor_bills table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "vendor_bills" (
      "id" UUID NOT NULL,
      "vendor_id" UUID NOT NULL,
      "bill_number" TEXT NOT NULL,
      "date" DATE NOT NULL,
      "description" TEXT,
      "total_amount" DECIMAL(18,2) NOT NULL,
      "cgst" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "sgst" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "igst" DECIMAL(18,2) NOT NULL DEFAULT 0,
      "hsn_sac" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "vendor_bills_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "vendor_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "vendor_bills_vendor_id_bill_number_key" ON "vendor_bills"("vendor_id", "bill_number");
    CREATE INDEX IF NOT EXISTS "vendor_bills_date_status_idx" ON "vendor_bills"("date", "status");
  `);
  console.log('Created vendor_bills table successfully.');

  await client.end();
  console.log('Done.');
}
run().catch(console.error);
