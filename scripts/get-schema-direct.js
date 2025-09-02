const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getTableSchema(tableName) {
  console.log(`\n=== ${tableName.toUpperCase()} SCHEMA ===`);
  
  const query = `
    SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = '${tableName}' 
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: query
    });

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`No columns found for table: ${tableName}`);
      return;
    }

    console.log('Columns:');
    data.forEach(col => {
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE';
      const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name}: ${col.data_type}${maxLength} ${nullable} ${defaultVal}`);
    });

  } catch (err) {
    console.error(`Exception:`, err.message);
    
    // Fallback: try to get schema by attempting an insert with missing required fields
    console.log('\nTrying fallback method...');
    try {
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({});

      if (insertError) {
        console.log('Insert error reveals required fields:');
        console.log(insertError.message);
      }
    } catch (fallbackErr) {
      console.log('Fallback failed:', fallbackErr.message);
    }
  }
}

async function examineKeyTables() {
  const tables = [
    'inventory_lots',
    'transactions', 
    'preadmissions',
    'customers',
    'parts',
    'storage_locations',
    'employees',
    'preshipments'
  ];

  for (const table of tables) {
    await getTableSchema(table);
  }
}

examineKeyTables().catch(console.error);