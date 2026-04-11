const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to Postgres.');

  // Create BillStatus ENUM
  try {
    await client.query(`CREATE TYPE "BillStatus" AS ENUM ('draft', 'posted', 'paid', 'cancelled');`);
    console.log('Created BillStatus type.');
  } catch (e) {
    if (e.message.includes('already exists')) {
       console.log('BillStatus type already exists.');
    } else {
       console.error('Failed to create BillStatus type:', e.message);
    }
  }

  // Alter table to use the enum via using clause
  try {
    await client.query(`
      ALTER TABLE "vendor_bills" 
      ALTER COLUMN "status" DROP DEFAULT;
    `);
    await client.query(`
      ALTER TABLE "vendor_bills" 
      ALTER COLUMN "status" TYPE "BillStatus" USING "status"::text::"BillStatus";
    `);
    await client.query(`
      ALTER TABLE "vendor_bills" 
      ALTER COLUMN "status" SET DEFAULT 'draft'::"BillStatus";
    `);
    console.log('Altered vendor_bills status column to use BillStatus.');
  } catch (e) {
     console.error('Failed to alter vendor_bills status:', e.message);
  }

  await client.end();
  console.log('Done.');
}
run().catch(console.error);
