const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding...');
  try {
    const clientData = {
      name: 'Reliance Industries',
      code: 'RELIANCE',
      type: 'Customer',
      email: 'billing@reliance.example.com',
      contact: '+919999999991',
      defaultCurrency: 'INR'
    };

    const existing = await prisma.client.findFirst({
      where: { code: 'RELIANCE' }
    });

    if (!existing) {
      const res = await prisma.client.create({
        data: clientData
      });
      console.log('Created:', res.name);
    } else {
      console.log('Exists:', existing.name);
    }
  } catch (err) {
    console.error('SEED ERROR:', err);
    if (err.cause) console.error('CAUSE:', err.cause);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
