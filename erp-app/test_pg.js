const { Client } = require('pg');
const connectionString = process.env.DIRECT_URL;
const client = new Client({ connectionString });
async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');
    const res = await client.query('SELECT current_schema()');
    console.log('Current Schema:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection Error:', err);
    process.exit(1);
  }
}
run();
