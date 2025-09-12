const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function examineTableSchema(tableName) {
  console.log(`\n=== ${tableName.toUpperCase()} TABLE SCHEMA ===`);
  
  try {
    // Try to get table structure by querying with limit 0
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`Error examining ${tableName}:`, error.message);
      return;
    }

    console.log(`Table exists: ${tableName}`);
    if (data && data.length > 0) {
      console.log('Sample data structure:');
      console.log(Object.keys(data[0]).join(', '));
    } else {
      console.log('Table exists but has no data - cannot determine columns from sample');
    }

  } catch (err) {
    console.error(`Exception examining ${tableName}:`, err.message);
  }
}

async function getTableList() {
  console.log('\n=== LISTING ALL TABLES ===');
  try {
    // Note: get_table_list RPC function doesn't exist by default
    console.log('⚠️  get_table_list RPC function does not exist in Supabase by default');
    
    // Try querying information_schema instead
    const { data: sqlData, error: sqlError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (sqlError) {
      console.log('Could not get table list from information_schema either:', sqlError.message);
      
      // Fallback: try known tables individually
      console.log('Trying known tables individually...');
    } else {
      console.log('Available tables:', sqlData?.map(t => t.table_name).join(', ') || 'None found');
    }
  } catch (err) {
    console.log('Exception getting table list:', err.message);
  }
}

async function examineAllTables() {
  await getTableList();
  
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
    await examineTableSchema(table);
  }
}

examineAllTables().catch(console.error);