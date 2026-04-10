const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
     const seller = await prisma.client.findFirst({ where: { type: 'Vendor' } });
     const buyer = await prisma.client.findFirst({ where: { type: 'Customer' } });
     const product = await prisma.product.findFirst();

     if (!seller || !buyer || !product) {
       console.log('Skipping test: Missing seed data (seller/buyer/product).');
       return;
     }

     console.log('Testing trade creation...');
     const trade = await prisma.trade.create({
       data: {
         date: new Date(),
         sellerId: seller.id,
         buyerId: buyer.id,
         productId: product.id,
         quantity: 10,
         price: 100,
         tradeType: 'sell',
         commissionRate: 0.02,
         commissionAmt: 20
       }
     });
     console.log('Trade created successfully! ID:', trade.id);

     // Clean up
     await prisma.trade.delete({ where: { id: trade.id } });
     console.log('Test trade deleted.');
  } catch (err) {
    console.error('Final Verification Failed:');
    console.error(err.message);
    if (err.cause) console.error(err.cause);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
