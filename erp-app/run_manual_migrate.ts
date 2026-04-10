import pg from 'pg';
import fs from 'fs';
import * as dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

async function runMigration() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync('manual_migrate.sql', 'utf8');
    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
