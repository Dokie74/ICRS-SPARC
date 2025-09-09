// Check existing employees table schema to understand what columns exist
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://qirnkhpytwfrrdedcdfa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcm5raHB5dHdmcnJkZWRjZGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2NjczMywiZXhwIjoyMDcyMDQyNzMzfQ.esd3lmKxtThfvLlQD1WPGGwOzJIEto72TMuboADzuTE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployeesSchema() {
  try {
    console.log('🔍 Checking employees table...\n');
    
    // Try to fetch employees data to see what columns exist
    const { data: employeeData, error: dataError } = await supabase
      .from('employees')
      .select('*')
      .limit(3);

    if (dataError) {
      console.error('❌ Error fetching employee data:', dataError.message);
      console.log('This might mean the table doesn\'t exist or has permission issues.\n');
      return;
    }

    console.log(`✅ Employees table exists with ${employeeData.length} records found.`);
    
    if (employeeData.length > 0) {
      console.log('\n📋 Existing columns in employees table:');
      console.log('================================================');
      Object.keys(employeeData[0]).forEach(col => {
        console.log(`  - ${col}`);
      });
      console.log('================================================\n');

      console.log('📊 Sample data:');
      console.log('================================================');
      employeeData.forEach((emp, i) => {
        console.log(`Employee ${i + 1}:`);
        Object.keys(emp).forEach(key => {
          console.log(`  ${key}: ${emp[key]}`);
        });
        console.log('');
      });
      console.log('================================================\n');

      // Identify missing columns that our API expects
      const existingColumns = Object.keys(employeeData[0]);
      const expectedColumns = ['id', 'name', 'email', 'role', 'department', 'phone', 'status', 'created_at', 'updated_at'];
      const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        console.log('⚠️  Missing columns needed for employee management:');
        missingColumns.forEach(col => console.log(`  - ${col}`));
        console.log('\n💡 These columns need to be ADDED via ALTER TABLE (NOT dropped!).');
      } else {
        console.log('✅ All expected columns are present!');
      }
    } else {
      console.log('📋 Table exists but no data found.');
    }

  } catch (error) {
    console.error('❌ Failed to check employees schema:', error);
  }
}

checkEmployeesSchema();