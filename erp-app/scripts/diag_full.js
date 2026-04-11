const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Using connection string (partial):', connectionString.split('@')[1]);

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('--- DB Check ---');
    const res = await pool.query('SELECT current_schema(), current_user');
    console.log('Current Schema:', res.rows[0].current_schema);
    console.log('Current User:', res.rows[0].current_user);

    console.log('\n--- Prisma Model Check ---');
    // We check if the internal mapping has ERP
    const dmmf = prisma._baseService?.dmmf;
    if (dmmf) {
       const clientModel = dmmf.datamodel.models.find(m => m.name === 'Client');
       console.log('Client model schema property:', clientModel?.schema);
    }

    console.log('\n--- Querying Client ---');
    const client = await prisma.client.findFirst();
    console.log('Successfully queried client:', client);
  } catch (err) {
    console.error('\n--- PRISMA ERROR ---');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    if (err.meta) console.error('Meta:', JSON.stringify(err.meta, null, 2));
    if (err.cause) {
      console.error('Cause Message:', err.cause.message);
      console.dir(err.cause, { depth: null });
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
