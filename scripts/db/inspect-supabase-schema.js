// Script to inspect the actual Supabase schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  try {
    console.log('\n=== ACTUAL SUPABASE SCHEMA ===\n');
    console.log('URL:', supabaseUrl);
    
    // Get all tables from information_schema
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_list');
    
    if (tablesError) {
      // Fallback method using a simple query to get table names
      console.log('Using fallback method to get tables...');
      const { data, error } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename, schemaname')
        .eq('schemaname', 'public');
      
      if (error) {
        console.log('Cannot query pg_catalog directly. Trying alternative...');
        
        // Another fallback - try to query known tables
        const knownTables = [
          'customers', 'parts', 'suppliers', 'inventory_lots', 'preadmissions',
          'transactions', 'storage_locations', 'material_indices', 
          'preadmission_line_items', 'inventory', 'preshipments',
          'locations', 'materials', 'inventory_transactions' // These might exist
        ];
        
        console.log('\nChecking known tables:');
        for (const table of knownTables) {
          try {
            const { data, error } = await supabase.from(table).select('*').limit(0);
            if (!error) {
              console.log(`✅ Table exists: ${table}`);
              await inspectTable(table);
            } else {
              console.log(`❌ Table missing: ${table} (${error.message})`);
            }
          } catch (e) {
            console.log(`❌ Table error: ${table} (${e.message})`);
          }
        }
      } else {
        console.log('Found tables:', data);
        for (const row of data) {
          await inspectTable(row.tablename);
        }
      }
    } else {
      console.log('Found tables:', tables);
      for (const table of tables) {
        await inspectTable(table);
      }
    }
  } catch (error) {
    console.error('❌ Schema inspection failed:', error);
  }
}

async function inspectTable(tableName) {
  try {
    // Try to get a single row to see the columns
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`  ❌ Cannot inspect ${tableName}: ${error.message}`);
      return;
    }
    
    console.log(`\nTable: ${tableName}`);
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`  Columns: ${columns.join(', ')}`);
    } else {
      // Try to get column info another way
      console.log('  (Empty table - cannot determine columns from data)');
    }
    
    // Get row count
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    console.log(`  Row count: ${count || 0}`);
    
  } catch (e) {
    console.log(`  ❌ Error inspecting ${tableName}: ${e.message}`);
  }
}

inspectSchema();