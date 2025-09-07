// create-admin-employee.js
// Create missing employee record for admin1@lucerne.com to fix "Demo User" issue
// This will allow admin1@lucerne.com to display as proper admin user with full access

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminEmployee() {
  console.log('🔧 Creating employee record for admin1@lucerne.com...\n');
  
  try {
    // Step 1: Get the auth user ID for admin1@lucerne.com
    console.log('📊 Step 1: Finding auth user admin1@lucerne.com');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return false;
    }
    
    const admin1User = authUsers.users.find(user => user.email === 'admin1@lucerne.com');
    
    if (!admin1User) {
      console.error('❌ admin1@lucerne.com not found in auth users');
      console.log('Available users:', authUsers.users.map(u => u.email));
      return false;
    }
    
    console.log('✅ Found admin1@lucerne.com with ID:', admin1User.id);
    
    // Step 2: Check if employee record already exists
    console.log('\n📊 Step 2: Checking existing employee records');
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', admin1User.id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking employee record:', checkError);
      return false;
    }
    
    if (existingEmployee) {
      console.log('⚠️  Employee record already exists:', existingEmployee);
      console.log('✅ admin1@lucerne.com should already work properly');
      return true;
    }
    
    console.log('✅ No existing employee record - will create new one');
    
    // Step 3: Create employee record
    console.log('\n📊 Step 3: Creating employee record');
    const employeeData = {
      user_id: admin1User.id,
      name: 'Admin User',
      email: 'admin1@lucerne.com',
      department: 'administration',
      job_title: 'Administrator',
      role: 'admin',
      is_admin: true,
      is_active: true,
      must_change_password: false,
      email_confirmed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newEmployee, error: createError } = await supabase
      .from('employees')
      .insert([employeeData])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating employee record:', createError);
      return false;
    }
    
    console.log('✅ Employee record created successfully:', newEmployee);
    
    // Step 4: Update user metadata
    console.log('\n📊 Step 4: Updating user metadata');
    const { data: updatedUser, error: metaError } = await supabase.auth.admin.updateUserById(
      admin1User.id,
      {
        user_metadata: {
          full_name: 'Admin User',
          name: 'Admin User',
          role: 'admin',
          department: 'administration',
          job_title: 'Administrator',
          is_admin: true,
          employee_id: newEmployee.id
        }
      }
    );
    
    if (metaError) {
      console.error('❌ Error updating user metadata:', metaError);
      console.log('⚠️  Employee record created but metadata update failed');
      return false;
    }
    
    console.log('✅ User metadata updated successfully');
    
    // Step 5: Verify the fix
    console.log('\n📊 Step 5: Verification');
    const { data: verifyEmployee } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', admin1User.id)
      .single();
    
    const { data: verifyUser } = await supabase.auth.admin.getUserById(admin1User.id);
    
    console.log('✅ Verification complete:');
    console.log('   Employee record:', !!verifyEmployee);
    console.log('   User metadata:', !!verifyUser.user?.user_metadata?.full_name);
    console.log('   Admin role:', verifyEmployee?.is_admin);
    
    console.log('\n🎯 SUCCESS! admin1@lucerne.com fix complete:');
    console.log('✅ Employee record created with admin role');
    console.log('✅ User metadata updated with full name');
    console.log('✅ Admin privileges enabled');
    console.log('\n🚀 admin1@lucerne.com should now display as "Admin User" with full admin access!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

if (require.main === module) {
  createAdminEmployee().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { createAdminEmployee };