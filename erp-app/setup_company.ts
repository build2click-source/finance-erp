import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.companyProfile.count();
  if (count === 0) {
    const profile = await prisma.companyProfile.create({
      data: {
        name: 'ARM Enterprises',
        state: 'West Bengal',
        city: 'Kolkata',
        gstin: '19AAACA1234A1Z5',
        pincode: '700001',
        email: 'billing@armenterprises.com',
        phone: '+919999999999',
      }
    });
    console.log('Created Company Profile:', profile);
  } else {
    console.log('Company Profile already exists.');
  }

  // Also set SAC 997152 as default for any products that lack it
  const updatedProducts = await prisma.product.updateMany({
    where: {
      OR: [
        { hsnCode: null },
        { hsnCode: '' }
      ]
    },
    data: {
      hsnCode: '997152' // SAC code for brokerage services
    }
  });
  console.log(`Updated ${updatedProducts.count} products with SAC 997152`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
