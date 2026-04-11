const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected.');

  const sqlCommands = [
    // 1. Transactions
    `CREATE TABLE IF NOT EXISTS "ERP"."transactions" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "posted_at" TIMESTAMPTZ,
      "description" TEXT,
      "reference_id" TEXT,
      "invoice_id" UUID,
      "receipt_id" UUID,
      "payment_id" UUID,
      "created_by" UUID,
      "metadata" JSONB
    )`,

    // 2. Journal Entries
    `CREATE TABLE IF NOT EXISTS "ERP"."journal_entries" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "transaction_id" UUID NOT NULL REFERENCES "ERP"."transactions"("id") ON DELETE CASCADE,
      "account_id" UUID NOT NULL REFERENCES "ERP"."accounts"("id"),
      "amount" DECIMAL(18, 2) NOT NULL,
      "entry_type" "ERP"."EntryType" NOT NULL,
      "currency" CHAR(3) NOT NULL DEFAULT 'INR',
      "tax_code" TEXT,
      "warehouse_id" UUID,
      "cost_layer_id" UUID,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    // 3. Trades
    `CREATE TABLE IF NOT EXISTS "ERP"."trades" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "date" DATE NOT NULL,
      "seller_id" UUID NOT NULL REFERENCES "ERP"."clients"("id"),
      "buyer_id" UUID NOT NULL REFERENCES "ERP"."clients"("id"),
      "product_id" UUID NOT NULL REFERENCES "ERP"."products"("id"),
      "quantity" DECIMAL(18, 4) NOT NULL,
      "price" DECIMAL(18, 2) NOT NULL,
      "trade_type" TEXT NOT NULL,
      "remarks" TEXT,
      "commission_rate" DECIMAL(18, 2) NOT NULL,
      "commission_amount" DECIMAL(18, 2) NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS "idx_trades_date" ON "ERP"."trades" ("date")`,
    `CREATE INDEX IF NOT EXISTS "idx_journal_tx" ON "ERP"."journal_entries" ("transaction_id")`,
    `CREATE INDEX IF NOT EXISTS "idx_journal_account" ON "ERP"."journal_entries" ("account_id", "created_at")`
  ];

  console.log('Restoring missing tables...');
  for (const sql of sqlCommands) {
    try {
      await client.query(sql);
      console.log('SUCCESS:', sql.substring(0, 50) + '...');
    } catch (e) {
      console.error('ERROR:', e.message);
    }
  }

  await client.end();
  console.log('Restoration Complete.');
}
run().catch(console.error);
