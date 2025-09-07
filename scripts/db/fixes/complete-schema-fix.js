// complete-schema-fix.js
// Comprehensive fix for ALL remaining schema mismatches

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying comprehensive schema fixes...\n');

// Find all route files
const routesDir = path.join(__dirname, 'src/backend/api/routes');
const routeFiles = fs.readdirSync(routesDir)
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(routesDir, file));

console.log(`Found ${routeFiles.length} route files to check:`);
routeFiles.forEach(file => console.log(`  - ${file}`));

let totalFixes = 0;

routeFiles.forEach(filePath => {
  console.log(`\n🔍 Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let fixes = 0;
  
  // Table name fixes
  const tableRenames = [
    { from: "'materials'", to: "'material_indices'" },
    { from: '"materials"', to: '"material_indices"' },
    { from: "'locations'", to: "'storage_locations'" },
    { from: '"locations"', to: '"storage_locations"' },
    { from: "'inventory_transactions'", to: "'transactions'" },
    { from: '"inventory_transactions"', to: '"transactions"' }
  ];
  
  tableRenames.forEach(rename => {
    const beforeCount = (content.match(new RegExp(rename.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    content = content.replace(new RegExp(rename.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rename.to);
    const afterCount = (content.match(new RegExp(rename.to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length - beforeCount;
    if (afterCount > 0) {
      console.log(`    ✓ Renamed table ${rename.from} → ${rename.to} (${afterCount} instances)`);
      fixes += afterCount;
    }
  });
  
  // Column removal fixes
  const columnFixes = [
    // Remove parts.active column references
    { pattern: /,\s*active\s*(?=,|\s*from|\s*order|\s*group|\s*limit|\s*\))/gi, name: 'parts.active from select' },
    { pattern: /select\s+[^,]*,\s*active\s*/gi, name: 'parts.active from start of select' },
    { pattern: /\{\s*column:\s*['"]active['"]\s*,\s*[^}]*\}/gi, name: 'parts/customers.active filters' },
    
    // Remove lot_number column references
    { pattern: /,\s*lot_number\s*(?=,|\s*from|\s*order|\s*group|\s*limit|\s*\))/gi, name: 'lot_number from select' },
    { pattern: /lot_number\s*,\s*/gi, name: 'lot_number with comma' },
    { pattern: /\{\s*column:\s*['"]lot_number['"]\s*,\s*[^}]*\}/gi, name: 'lot_number filters' },
    
    // Remove entry_date column references  
    { pattern: /,\s*entry_date\s*(?=,|\s*from|\s*order|\s*group|\s*limit|\s*\))/gi, name: 'entry_date from select' },
    { pattern: /entry_date\s*,\s*/gi, name: 'entry_date with comma' },
    { pattern: /\{\s*column:\s*['"]entry_date['"]\s*,\s*[^}]*\}/gi, name: 'entry_date filters' },
    
    // Remove status column for customers
    { pattern: /\{\s*column:\s*['"]status['"]\s*,\s*value:\s*status\s*\}/gi, name: 'customers.status filter' },
    
    // Fix company_name to name for suppliers
    { pattern: /company_name/gi, name: 'suppliers.company_name → name', replacement: 'name' }
  ];
  
  columnFixes.forEach(fix => {
    const beforeCount = (content.match(fix.pattern) || []).length;
    if (fix.replacement) {
      content = content.replace(fix.pattern, fix.replacement);
    } else {
      content = content.replace(fix.pattern, '');
    }
    if (beforeCount > 0) {
      console.log(`    ✓ Fixed ${fix.name} (${beforeCount} instances)`);
      fixes += beforeCount;
    }
  });
  
  // Clean up any dangling commas in select statements
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/,\s*from/gi, ' from');
  content = content.replace(/,\s*\)/g, ')');
  content = content.replace(/select\s*,/gi, 'select ');
  
  // Write the file back if changes were made
  if (fixes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`    💾 Saved ${filePath} with ${fixes} fixes`);
    totalFixes += fixes;
  } else {
    console.log(`    ✅ No changes needed for ${filePath}`);
  }
});

console.log(`\n🎉 Complete! Applied ${totalFixes} total schema fixes across all route files.`);
console.log('\nFixed issues:');
console.log('• Table name mismatches (materials → material_indices, locations → storage_locations, inventory_transactions → transactions)');
console.log('• Missing column references (active, lot_number, entry_date, status)');
console.log('• Column name mismatches (company_name → name)');
console.log('• Cleaned up syntax issues (dangling commas)');
console.log('\nThe console errors should now be resolved.');