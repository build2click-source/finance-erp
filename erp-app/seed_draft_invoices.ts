import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const clients = await prisma.client.findMany({ take: 3 });
  const products = await prisma.product.findMany({ take: 3 });

  if (clients.length === 0 || products.length === 0) {
    console.error("No clients or products found. Please seed them first.");
    return;
  }

  const suffix = Math.floor(Math.random() * 100000);
  const invoices = [
    {
      invoiceNumber: `INV-D-101-${suffix}`,
      clientId: clients[0].id,
      date: new Date(),
      status: 'draft' as const,
      type: 'TaxInvoice' as const,
      totalAmount: 1180,
      totalTax: 180,
      deliveryNote: 'Draft Delivery Note 1',
      paymentTerms: '15 Days',
      lines: [
        {
          description: products[0].name,
          productId: products[0].id,
          qty: 1,
          unitPrice: 1000,
          lineNet: 1000,
          gstRate: 18,
          gstAmount: 180,
          hsnCode: products[0].hsnCode || '998877',
          per: 'NOS'
        }
      ]
    },
    {
      invoiceNumber: `INV-D-102-${suffix}`,
      clientId: clients[1] ? clients[1].id : clients[0].id,
      date: new Date(),
      status: 'draft' as const,
      type: 'TaxInvoice' as const,
      totalAmount: 2360,
      totalTax: 360,
      deliveryNote: 'Draft Delivery Note 2',
      paymentTerms: 'Immediate',
      lines: [
        {
          description: products[1] ? products[1].name : products[0].name,
          productId: products[1] ? products[1].id : products[0].id,
          qty: 2,
          unitPrice: 1000,
          lineNet: 2000,
          gstRate: 18,
          gstAmount: 360,
          hsnCode: (products[1] || products[0]).hsnCode || '998877',
          per: 'NOS'
        }
      ]
    },
    {
      invoiceNumber: `INV-D-103-${suffix}`,
      clientId: clients[2] ? clients[2].id : clients[0].id,
      date: new Date(),
      status: 'draft' as const,
      type: 'Proforma' as const,
      totalAmount: 590,
      totalTax: 90,
      deliveryNote: 'Draft Delivery Note 3',
      paymentTerms: 'Advance',
      lines: [
        {
          description: products[0].name,
          productId: products[0].id,
          qty: 0.5,
          unitPrice: 1000,
          lineNet: 500,
          gstRate: 18,
          gstAmount: 90,
          hsnCode: products[0].hsnCode || '998877',
          per: 'NOS'
        }
      ]
    }
  ];

  for (const inv of invoices) {
    const { lines, ...invData } = inv;
    const createdInvoice = await prisma.invoice.create({
      data: {
        ...invData,
        lines: {
          create: lines.map(line => ({
            ...line,
            id: uuidv4()
          }))
        }
      }
    });
    console.log(`Created draft invoice: ${createdInvoice.invoiceNumber}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
