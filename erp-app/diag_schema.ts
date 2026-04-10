import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

async function main() {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_schema, table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
    `);
    console.log('--- INVOICES COLUMNS ---');
    console.table(res.rows);

    const schemaRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata;
    `);
    console.log('--- SCHEMAS ---');
    console.table(schemaRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
