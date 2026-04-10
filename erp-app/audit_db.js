const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  const tables = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_catalog.pg_tables 
    WHERE schemaname IN ('public', 'ERP')
  `);

  console.log('--- DATABASE AUDIT ---');
  for (const table of tables.rows) {
    try {
      const countRes = await client.query(`SELECT count(*) FROM "${table.schemaname}"."${table.tablename}"`);
      console.log(`${table.schemaname}.${table.tablename}: ${countRes.rows[0].count} rows`);
    } catch (e) {
      console.log(`${table.schemaname}.${table.tablename}: ERROR (${e.message})`);
    }
  }

  const enums = await client.query(`
    SELECT n.nspname as schema, t.typname as type 
    FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname IN ('public', 'ERP') AND t.typtype = 'e'
  `);
  console.log('\n--- ENUM AUDIT ---');
  for (const enm of enums.rows) {
    console.log(`${enm.schema}.${enm.type}`);
  }

  await client.end();
}
run();
