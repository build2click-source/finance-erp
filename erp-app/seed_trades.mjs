import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function seed() {
  const clients = await prisma.client.findMany({ take: 2 });
  if (clients.length < 2) {
    console.log('Not enough clients to seed trades. Create clients first.');
    process.exit(1);
  }
  const products = await prisma.product.findMany({ take: 1 });
  if (products.length === 0) {
    console.log('No products found. Creating one...');
    await prisma.product.create({
      data: {
        sku: 'P-' + Date.now(),
        name: 'Test Product ' + Date.now(),
      }
    });
  }

  const prod = await prisma.product.findFirst();

  const tradesToCreate = [
    {
      date: new Date(),
      sellerId: clients[0].id,
      buyerId: clients[1].id,
      productId: prod.id,
      quantity: 100,
      price: 50.50,
      tradeType: 'sell',
      remarks: 'Seeded trade 1',
      commissionRate: 0.10,
      commissionAmt: 100 * 0.10
    },
    {
      date: new Date(),
      sellerId: clients[1].id,
      buyerId: clients[0].id,
      productId: prod.id,
      quantity: 200,
      price: 60.00,
      tradeType: 'buy',
      remarks: 'Seeded trade 2',
      commissionRate: 0.15,
      commissionAmt: 200 * 0.15
    }
  ];

  for (const trade of tradesToCreate) {
    await prisma.trade.create({ data: trade });
  }

  console.log('Seeded 2 trades successfully.');
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
