const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_URL });
  await c.connect();
  
  // Check all enum values in ERP schema
  const res = await c.query(`
    SELECT t.typname as enum_name, e.enumlabel as enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'ERP'
    ORDER BY t.typname, e.enumsortorder
  `);
  
  const grouped = {};
  for (const row of res.rows) {
    if (!grouped[row.enum_name]) grouped[row.enum_name] = [];
    grouped[row.enum_name].push(row.enum_value);
  }
  console.log(JSON.stringify(grouped, null, 2));
  
  // Check what type the accounts.type column is
  const colRes = await c.query(`
    SELECT column_name, data_type, udt_schema, udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'ERP' AND table_name = 'accounts'
    AND column_name = 'type'
  `);
  console.log('accounts.type column:', colRes.rows);
  
  process.exit(0);
}
main();
