// Check actual customers table schema from Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCustomersSchema() {
  try {
    console.log('Checking customers table schema...');
    
    // First, try to get table structure using information_schema
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'customers')
      .eq('table_schema', 'public');

    if (error) {
      console.error('Error querying information_schema:', error);
      
      // Fallback: try to select from customers with limit 0 to see columns
      const { data: sampleData, error: sampleError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('Error querying customers table:', sampleError);
      } else {
        console.log('Sample customer record structure:');
        if (sampleData && sampleData.length > 0) {
          console.log('Available columns:', Object.keys(sampleData[0]));
        } else {
          console.log('No customer records found');
        }
      }
    } else {
      console.log('Customers table columns:');
      data.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkCustomersSchema().then(() => process.exit(0));