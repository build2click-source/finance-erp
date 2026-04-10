const { Client } = require('pg');
require('dotenv').config();

async function test() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Successfully connected to PostgreSQL!');
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

test();
