const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_URL });
  await c.connect();
  
  // Try raw insert
  try {
    const res = await c.query(
      'INSERT INTO "ERP".accounts (id, code, name, type, currency) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id',
      ['TEST-RAW', 'Raw Test Account', 'Asset', 'INR']
    );
    console.log('Direct insert OK, id:', res.rows[0].id);
    // Clean up
    await c.query('DELETE FROM "ERP".accounts WHERE code = $1', ['TEST-RAW']);
    console.log('Cleaned up.');
  } catch (e) {
    console.log('Error:', e.message);
    console.log('Code:', e.code);
  }
  
  process.exit(0);
}

main();
