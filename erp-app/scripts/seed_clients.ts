const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding client data into ERP schema...');

  const clients = [
    {
      name: 'Reliance Industries',
      code: 'RELIANCE',
      type: 'Customer',
      gstin: '27AAACR5055B1Z5',
      city: 'Mumbai',
      state: 'Maharashtra',
      placeOfSupply: 'Maharashtra',
      email: 'billing@reliance.example.com',
      contact: '+919999999991',
      address: 'Maker Chambers IV, Nariman Point',
      pincode: '400021',
      defaultCurrency: 'INR'
    },
    {
      name: 'Tata Consultancy Services',
      code: 'TCS',
      type: 'Customer',
      gstin: '27AAACT4321A1Z5',
      city: 'Mumbai',
      state: 'Maharashtra',
      placeOfSupply: 'Maharashtra',
      email: 'accounts@tcs.example.com',
      contact: '+919999999992',
      address: 'Banyan Park, Suren Road, Andheri East',
      pincode: '400093',
      defaultCurrency: 'INR'
    },
    {
      name: 'Infosys Ltd',
      code: 'INFY',
      type: 'Both',
      gstin: '29AAACH7405L1Z1',
      city: 'Bengaluru',
      state: 'Karnataka',
      placeOfSupply: 'Karnataka',
      email: 'finance@infosys.example.com',
      contact: '+919999999993',
      address: 'Electronics City, Hosur Road',
      pincode: '560100',
      defaultCurrency: 'INR'
    },
    {
      name: 'Swiggy Foods',
      code: 'SWIGGY',
      type: 'Customer',
      gstin: '29AAECS1234D1Z2',
      city: 'Bengaluru',
      state: 'Karnataka',
      placeOfSupply: 'Karnataka',
      email: 'payables@swiggy.example.com',
      contact: '+919999999994',
      address: 'Devarabisanahalli, Bellandur',
      pincode: '560103',
      defaultCurrency: 'INR'
    },
    {
      name: 'AWS India (Amazon)',
      code: 'AWS',
      type: 'Vendor',
      gstin: '07AABCA3456F1Z8',
      city: 'New Delhi',
      state: 'Delhi',
      placeOfSupply: 'Delhi',
      email: 'invoicing@aws.example.com',
      contact: '+919999999995',
      address: 'Block E, Connaught Place',
      pincode: '110001',
      defaultCurrency: 'INR'
    },
    {
      name: 'Digital Ocean',
      code: 'DIGITALOCEAN',
      type: 'Vendor',
      gstin: '29AACCD9876E1Z3',
      city: 'Bengaluru',
      state: 'Karnataka',
      placeOfSupply: 'Karnataka',
      email: 'billing@digitalocean.example.com',
      contact: '+919999999996',
      address: 'MG Road, Indiranagar',
      pincode: '560038',
      defaultCurrency: 'INR'
    },
    {
      name: 'Local Stationery Mart',
      code: 'STATIONERY',
      type: 'Vendor',
      gstin: '',
      city: 'Kolkata',
      state: 'West Bengal',
      placeOfSupply: 'West Bengal',
      email: 'shop@localmart.example.com',
      contact: '+919999999997',
      address: 'Park Street, Esplanade',
      pincode: '700016',
      defaultCurrency: 'INR'
    },
    {
      name: 'ITC Limited',
      code: 'ITC',
      type: 'Both',
      gstin: '19AAACI4321A1Z5',
      city: 'Kolkata',
      state: 'West Bengal',
      placeOfSupply: 'West Bengal',
      email: 'accounts@itc.example.com',
      contact: '+919999999998',
      address: 'Virginia House, 37 J.L.Nehru Road',
      pincode: '700071',
      defaultCurrency: 'INR'
    }
  ];

  let count = 0;
  for (const clientData of clients) {
    const existing = await prisma.client.findFirst({
      where: { code: clientData.code }
    });

    if (!existing) {
      // Create associated accounts for ERP integrity
      const customerAcc = (clientData.type === 'Customer' || clientData.type === 'Both') 
        ? await prisma.account.create({
            data: { 
              code: `AR-${clientData.code}`,
              name: `A/R - ${clientData.name}`, 
              type: 'Asset', 
              subType: 'accounts_receivable' 
            }
          })
        : null;

      const vendorAcc = (clientData.type === 'Vendor' || clientData.type === 'Both')
        ? await prisma.account.create({
            data: { 
              code: `AP-${clientData.code}`,
              name: `A/P - ${clientData.name}`, 
              type: 'Liability', 
              subType: 'accounts_payable' 
            }
          })
        : null;

      await prisma.client.create({
        data: {
          ...clientData,
          customerAccountId: customerAcc ? customerAcc.id : null,
          vendorAccountId: vendorAcc ? vendorAcc.id : null,
        }
      });
      count++;
      console.log(`Created client: ${clientData.name}`);
    } else {
      console.log(`Skipped (already exists): ${clientData.name}`);
    }
  }

  console.log(`\nSeed complete! Created ${count} new clients.`);
}

main()
  .catch((e) => {
    console.error('SEED SCRIPT FAILED:');
    console.error(e);
    if (e.cause) {
      console.error('CAUSE:', e.cause);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
