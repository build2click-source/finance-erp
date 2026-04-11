import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Use DIRECT_URL (session mode port 5432) for DDL
const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error('DIRECT_URL not set in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected. Applying migrations...');
    await client.query(`ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "notes" TEXT;`);
    console.log('✓ Added notes column');
    await client.query(`ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "due_date" DATE;`);
    console.log('✓ Added due_date column');
    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => process.exit(1));
