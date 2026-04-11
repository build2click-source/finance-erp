const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Testing account create...');
  try {
    const acc = await prisma.account.create({
      data: { name: 'TEST A/R', type: 'Asset' }
    });
    console.log('Account created:', acc.id);
    
    // Clean up
    await prisma.account.delete({ where: { id: acc.id } });
    console.log('Account deleted (cleanup).');
  } catch (err) {
    console.log('Account Error Code:', err.code);
    console.log('Account Error Meta:', JSON.stringify(err.meta));
    console.log('Account Error Cause:', err.cause?.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
