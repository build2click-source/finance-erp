const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding (JS)...');
  try {
    const clients = await prisma.client.findMany();
    console.log('Count:', clients.length);
  } catch (err) {
    console.error('JS ERROR:', err);
    if (err.cause) {
        console.error('CAUSE:', err.cause);
        if (err.cause.message) console.error('CAUSE MSG:', err.cause.message);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
