const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Testing findFirst() on Client...');
    const result = await prisma.client.findFirst();
    console.log('Result:', result);
  } catch (err) {
    console.log('--- ERROR ---');
    console.log('Message:', err.message);
    if (err.code) console.log('Code:', err.code);
    if (err.meta) console.log('Meta:', err.meta);
    if (err.cause) {
        console.log('Cause:', err.cause);
        if (err.cause.message) console.log('Cause Message:', err.cause.message);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
