// fix-schema-mismatches.js
// Comprehensive fix for database schema mismatches preventing real data display
// This script fixes all backend API routes to match the actual Supabase database schema

const fs = require('fs').promises;
const path = require('path');

const ROUTES_DIR = 'src/backend/api/routes';

// Schema fixes to apply across all route files
const SCHEMA_FIXES = {
  // Fix table name mismatches
  'inventory_transactions': 'transactions',
  
  // Remove missing column references
  'active_filters': [
    "if (active_only === 'true') filters.push({ column: 'active', value: true });",
    "{ column: 'active', value: true }",
    "active: true,",
    "active: false,",
    ", { column: 'active', value: true }"
  ],
  
  // Fix undefined accessToken issues  
  'accessToken_fixes': [
    'accessToken: accessToken',
    'accessToken: req.accessToken'
  ],
  
  // Remove demo system imports
  'demo_imports': [
    "const { isDemoToken, mockInventoryLots } = require('../../utils/mock-data');",
    "const { isDemoToken, getMockParts, getMockPartById } = require('../../utils/mock-data');",
    "const { isDemoToken, getMockCustomers, getMockCustomerById } = require('../../utils/mock-data');"
  ]
};

async function fixSchemaInFile(filePath) {
  console.log(`\nFixing schema in: ${filePath}`);
  
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let hasChanges = false;
    
    // 1. Fix table name: inventory_transactions -> transactions  
    if (content.includes('inventory_transactions')) {
      console.log('  ✓ Fixing inventory_transactions -> transactions');
      content = content.replace(/inventory_transactions/g, 'transactions');
      hasChanges = true;
    }
    
    // 2. Remove missing 'active' column queries
    SCHEMA_FIXES.active_filters.forEach(pattern => {
      if (content.includes(pattern)) {
        console.log('  ✓ Removing active column filter');
        content = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        hasChanges = true;
      }
    });
    
    // 3. Fix undefined accessToken issue
    if (content.includes('accessToken: accessToken')) {
      console.log('  ✓ Fixing undefined accessToken');
      content = content.replace(/accessToken: accessToken/g, 'accessToken: req.accessToken');
      hasChanges = true;
    }
    
    // 4. Remove demo system imports
    SCHEMA_FIXES.demo_imports.forEach(importLine => {
      if (content.includes(importLine)) {
        console.log('  ✓ Removing demo system import');
        content = content.replace(importLine, '');
        hasChanges = true;
      }
    });
    
    // 5. Remove references to missing entry_date in inventory_lots table
    if (content.includes('entry_date') && filePath.includes('inventory.js')) {
      console.log('  ✓ Removing entry_date references in inventory queries');
      // Remove entry_date from ORDER BY clauses
      content = content.replace(/orderBy: { column: 'entry_date'/g, "orderBy: { column: 'created_at'");
      // Remove entry_date from SELECT clauses but keep created_at
      content = content.replace(/, entry_date/g, '');
      content = content.replace(/entry_date,/g, '');
      content = content.replace(/entry_date: entry_date \|\| new Date\(\)\.toISOString\(\),/g, '');
      hasChanges = true;
    }
    
    // 6. Clean up empty lines and fix formatting
    if (hasChanges) {
      // Remove empty lines caused by removals
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      // Fix any double commas
      content = content.replace(/,\s*,/g, ',');
      // Fix trailing commas in objects
      content = content.replace(/,(\s*})/g, '$1');
    }
    
    if (hasChanges) {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`  ✅ ${filePath} updated successfully`);
      return true;
    } else {
      console.log(`  ⏭️  No changes needed in ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`  ❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Starting comprehensive schema mismatch fixes...\n');
  
  try {
    // Get all route files
    const routeFiles = [
      'inventory.js',
      'parts.js', 
      'customers.js',
      'preadmission.js',
      'dashboard.js',
      'admin.js',
      'auth.js'
    ];
    
    let totalFixed = 0;
    
    for (const file of routeFiles) {
      const filePath = path.join(ROUTES_DIR, file);
      try {
        await fs.access(filePath);
        const wasFixed = await fixSchemaInFile(filePath);
        if (wasFixed) totalFixed++;
      } catch (error) {
        console.log(`  ⏭️  Skipping ${file} (file not found)`);
      }
    }
    
    console.log(`\n🎯 Schema fixes complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Files processed: ${routeFiles.length}`);
    console.log(`   • Files updated: ${totalFixed}`);
    console.log(`   • Key fixes applied:`);
    console.log(`     ✓ inventory_transactions → transactions`);
    console.log(`     ✓ Removed missing 'active' column filters`);
    console.log(`     ✓ Fixed undefined accessToken issues`);
    console.log(`     ✓ Removed demo system imports`);
    console.log(`     ✓ Fixed entry_date references`);
    
    console.log(`\n🚀 Backend API should now work with your real Supabase data!`);
    console.log(`📝 Next steps:`);
    console.log(`   1. Restart the backend server (it should detect changes)`);
    console.log(`   2. Test login with admin1@lucerne.com`);
    console.log(`   3. Check if real data displays instead of empty results`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixSchemaInFile };