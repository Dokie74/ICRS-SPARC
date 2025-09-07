// fix-remaining-console-errors.js
// Fix remaining console errors from schema mismatches

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing remaining console errors from schema mismatches...\n');

// Fix materials.js - handle fallback to parts table properly
console.log('1. Fixing materials.js fallback logic...');
const materialsPath = path.join(__dirname, 'src/backend/api/routes/materials.js');
let materialsContent = fs.readFileSync(materialsPath, 'utf8');

// Fix the fallback logic to use different filters for parts table
const oldMaterialsLogic = `  // Check if materials table exists, fallback to parts
  let result = await supabaseClient.getAll('material_indices', options);
  
  // If materials table doesn't exist, use parts table as fallback
  if (!result.success && result.error?.includes('Could not find the table')) {
    result = await supabaseClient.getAll('parts', options);
  }`;

const newMaterialsLogic = `  // Check if materials table exists, fallback to parts
  let result = await supabaseClient.getAll('material_indices', options);
  
  // If materials table doesn't exist, use parts table as fallback with different filters
  if (!result.success && result.error?.includes('Could not find the table')) {
    // Remove filters that don't exist in parts table
    const partsOptions = {
      ...options,
      filters: options.filters?.filter(f => f.column !== 'active') || []
    };
    
    // Change name search to description search for parts table
    if (partsOptions.filters?.some(f => f.column === 'name')) {
      partsOptions.filters = partsOptions.filters.map(f => 
        f.column === 'name' ? { ...f, column: 'description' } : f
      );
    }
    
    result = await supabaseClient.getAll('parts', partsOptions);
  }`;

materialsContent = materialsContent.replace(oldMaterialsLogic, newMaterialsLogic);
fs.writeFileSync(materialsPath, materialsContent);
console.log('✓ Fixed materials.js fallback logic');

// Fix locations.js - remaining table name references
console.log('\n2. Fixing locations.js table references...');
const locationsPath = path.join(__dirname, 'src/backend/api/routes/locations.js');
let locationsContent = fs.readFileSync(locationsPath, 'utf8');

// Fix create route
locationsContent = locationsContent.replace(
  `const result = await supabaseClient.create('locations', locationData, { accessToken });`,
  `const result = await supabaseClient.create('storage_locations', locationData, { accessToken });`
);

// Fix update route
locationsContent = locationsContent.replace(
  `const result = await supabaseClient.update('locations', id, updateData, { accessToken });`,
  `const result = await supabaseClient.update('storage_locations', id, updateData, { accessToken });`
);

// Fix delete route
locationsContent = locationsContent.replace(
  `const result = await supabaseClient.update('locations', id, {`,
  `const result = await supabaseClient.update('storage_locations', id, {`
);

fs.writeFileSync(locationsPath, locationsContent);
console.log('✓ Fixed locations.js table references');

// Fix dashboard.js - remove active column references
console.log('\n3. Fixing dashboard.js column references...');
const dashboardPath = path.join(__dirname, 'src/backend/api/routes/dashboard.js');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Fix inventory metrics query - remove active column
dashboardContent = dashboardContent.replace(
  `select: 'id, quantity, total_value, active, transactions(quantity)'`,
  `select: 'id, quantity, total_value, transactions(quantity)'`
);

// Fix customer metrics query - remove active column reference
dashboardContent = dashboardContent.replace(
  `select: 'id, active'`,
  `select: 'id'`
);

// Fix the customer metrics calculation
dashboardContent = dashboardContent.replace(
  `active_customers: result.success ? result.data.filter(c => c.active).length : 0`,
  `active_customers: result.success ? result.data.length : 0`
);

// Fix dangling comma in alerts query
dashboardContent = dashboardContent.replace(
  `{ column: 'expiration_date', value: expiringDate.toISOString(), operator: 'lte' },
          
        ],`,
  `{ column: 'expiration_date', value: expiringDate.toISOString(), operator: 'lte' }
        ],`
);

fs.writeFileSync(dashboardPath, dashboardContent);
console.log('✓ Fixed dashboard.js column references');

console.log('\n🎉 All remaining console errors should now be fixed!');
console.log('\nFixed issues:');
console.log('• materials.js: Fixed fallback to parts table with correct filters');
console.log('• locations.js: Fixed remaining "locations" table references');
console.log('• dashboard.js: Removed non-existent "active" column references');
console.log('\nYou should now see clean console output without 500 errors.');