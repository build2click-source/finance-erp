import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to Postgres.');

  // Create tenures table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "tenures" (
      "id" UUID NOT NULL,
      "client_id" UUID NOT NULL,
      "description" TEXT NOT NULL,
      "amount" DECIMAL(18,2) NOT NULL,
      "currency" CHAR(3) NOT NULL DEFAULT 'INR',
      "frequency" TEXT NOT NULL,
      "start_date" DATE NOT NULL,
      "end_date" DATE,
      "next_billing_date" DATE NOT NULL,
      "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
      "status" TEXT NOT NULL DEFAULT 'active',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "tenures_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "tenures_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "idx_tenures_client" ON "tenures"("client_id");
    CREATE INDEX IF NOT EXISTS "idx_tenures_next_billing" ON "tenures"("next_billing_date", "status");
  `);
  console.log('Created tenures table successfully.');

  // Create company_profile table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "company_profile" (
      "id" UUID NOT NULL,
      "name" TEXT NOT NULL,
      "gstin" TEXT,
      "state" TEXT,
      "city" TEXT,
      "address" TEXT,
      "pincode" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL,
      CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('Created company_profile table successfully.');

  // Alter invoices to add draft fields
  try {
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS trade_id UUID`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst DECIMAL(18,2)`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst DECIMAL(18,2)`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst DECIMAL(18,2)`);
  } catch (e) {}
  
  await client.end();
  console.log('Done.');
}

run().catch(console.error);
