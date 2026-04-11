/**
 * Creates the users table and AppRole enum in the ERP schema.
 * Run with: node scripts/create-users-table.mjs
 */

import pg from 'pg';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load .env manually
import { readFileSync } from 'fs';
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

const { Client } = pg;

// Use direct URL (port 5432)
const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error('❌ DIRECT_URL not found in .env');
  process.exit(1);
}

const client = new Client({ connectionString: directUrl });

const SQL = `
  -- Create the AppRole enum if it does not exist
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'AppRole' AND n.nspname = 'ERP'
    ) THEN
      CREATE TYPE "ERP"."AppRole" AS ENUM ('admin', 'accountant', 'data_entry');
    END IF;
  END $$;

  -- Create the users table if it does not exist
  CREATE TABLE IF NOT EXISTS "ERP"."users" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    email         TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role          "ERP"."AppRole" NOT NULL DEFAULT 'data_entry',
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

async function main() {
  await client.connect();
  console.log('✅ Connected to database');

  await client.query(SQL);
  console.log('✅ AppRole enum and users table created (or already exist)');

  await client.end();
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
