const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testColumnVariations(tableName) {
  console.log(`\n=== TESTING ${tableName.toUpperCase()} COLUMN VARIATIONS ===`);
  
  const variations = [
    'customerId',
    'customer_id', 
    'customerid',
    'CUSTOMERID',
    'CustomerId',
    'admissionId',
    'admission_id',
    'admissionid',
    'shipmentId',
    'shipment_id',
    'shipmentid',
    'stage',
    'status'
  ];

  for (const col of variations) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(col)
        .limit(1);

      if (!error) {
        console.log(`✓ ${tableName}.${col} EXISTS`);
      } else if (error.message.includes('does not exist')) {
        console.log(`✗ ${tableName}.${col} does not exist`);
      } else {
        console.log(`? ${tableName}.${col} - ${error.message}`);
      }
    } catch (e) {
      console.log(`! ${tableName}.${col} - Exception: ${e.message}`);
    }
  }
}

async function testAllTables() {
  await testColumnVariations('preadmissions');
  await testColumnVariations('preshipments');
  await testColumnVariations('inventory_lots');
}

testAllTables().catch(console.error);