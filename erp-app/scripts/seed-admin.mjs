/**
 * Seed script using pg directly to bypass PrismaClient initialization issues.
 * Creates the default admin user if no users exist.
 * Default credentials: admin / Admin@123
 */

import pg from 'pg';
import * as crypto from 'crypto';
import { readFileSync } from 'fs';

const { Client } = pg;

// Load .env manually
try {
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
} catch (e) {
  console.warn('⚠️ Could not load .env file');
}

// User requested to use 5432 port (DIRECT_URL)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No connection string found in .env (DATABASE_URL or DIRECT_URL)');
  process.exit(1);
}

// PBKDF2 password hash (mirrors src/lib/auth.ts)
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100_000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('✅ Connected to database');

  const { rows } = await client.query('SELECT count(*) FROM "ERP"."users"');
  const existing = parseInt(rows[0].count, 10);

  if (existing > 0) {
    console.log(`ℹ️  ${existing} user(s) already exist. Skipping seed.`);
    await client.end();
    return;
  }

  const hash = await hashPassword('Admin@123');

  await client.query(
    'INSERT INTO "ERP"."users" (username, display_name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
    ['admin', 'Administrator', 'admin@company.com', hash, 'admin', true]
  );

  console.log('✅ Default admin user created:');
  console.log(`   Username : admin`);
  console.log(`   Password : Admin@123`);
  console.log(`   ⚠️  Change this password immediately after first login!`);

  await client.end();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message);
  process.exit(1);
});
