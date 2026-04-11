const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected.');
  
  try {
    await client.query(`ALTER TABLE "ERP"."journal_entries" ADD COLUMN IF NOT EXISTS "entry_type" text NOT NULL DEFAULT 'Dr'`);
    console.log('Added entry_type column back if it was missing.');
  } catch (e) {
    console.error('Error adding column:', e.message);
  }

  await client.end();
}

run();
