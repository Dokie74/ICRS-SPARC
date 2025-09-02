const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function discoverTableColumns(tableName) {
  console.log(`\n=== DISCOVERING ${tableName.toUpperCase()} COLUMNS ===`);
  
  try {
    // Try to insert empty record to see required fields
    const { error: insertError } = await supabase
      .from(tableName)
      .insert({});

    if (insertError) {
      console.log('Required fields from insert error:');
      console.log(insertError.message);
      
      // Extract field names from the error message if it mentions specific columns
      if (insertError.message.includes('null value in column')) {
        const match = insertError.message.match(/null value in column "([^"]+)"/);
        if (match) {
          console.log(`Required NOT NULL column: ${match[1]}`);
        }
      }
    }

    // Try to select with a field that might exist
    const potentialColumns = [
      'id', 'created_at', 'updated_at', 'customerId', 'customer_id',
      'admissionId', 'admission_id', 'shipmentId', 'shipment_id',
      'lot_id', 'lotId', 'part_id', 'partId', 'quantity', 'type',
      'status', 'stage', 'active', 'voided'
    ];

    for (const col of potentialColumns) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(col)
          .limit(1);

        if (!error) {
          console.log(`✓ Column exists: ${col}`);
        }
      } catch (e) {
        // Column doesn't exist, continue
      }
    }

  } catch (err) {
    console.error(`Exception for ${tableName}:`, err.message);
  }
}

async function discoverAllColumns() {
  const tables = ['inventory_lots', 'transactions', 'preadmissions', 'preshipments'];
  
  for (const table of tables) {
    await discoverTableColumns(table);
  }
}

discoverAllColumns().catch(console.error);