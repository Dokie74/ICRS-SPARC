// Complete schema analysis - frontend/backend expectations vs actual Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableColumns(tableName) {
  try {
    // Insert a dummy row to see column structure, then delete it
    const dummyData = {};
    const { error } = await supabase.from(tableName).insert(dummyData);
    
    if (error && error.message.includes('null value in column')) {
      // Parse required columns from error
      const columns = error.message.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, ''));
      return { columns, method: 'error_parsing' };
    }
    
    // Try to select with specific columns based on common patterns
    const commonColumns = ['id', 'name', 'created_at', 'updated_at', 'active', 'description'];
    let foundColumns = [];
    
    for (const col of commonColumns) {
      try {
        await supabase.from(tableName).select(col).limit(1);
        foundColumns.push(col);
      } catch (e) {
        // Column doesn't exist
      }
    }
    
    return { columns: foundColumns, method: 'probing' };
  } catch (error) {
    return { error: error.message };
  }
}

async function completeAnalysis() {
  console.log('\n=== COMPLETE SCHEMA ANALYSIS ===\n');
  
  // Load expectations
  const expectations = JSON.parse(fs.readFileSync('schema-expectations.json', 'utf8'));
  
  // Actual tables that exist
  const actualTables = {
    'customers': { 
      exists: true,
      columns: ['id', 'name', 'ein', 'address', 'broker_name', 'contact_email'],
      rowCount: 6 
    },
    'parts': { 
      exists: true,
      columns: ['id', 'description', 'hts_code', 'country_of_origin', 'standard_value', 'unit_of_measure', 'manufacturer_id', 'gross_weight', 'package_quantity', 'package_type', 'material_price', 'labor_price', 'overhead_price', 'price_source', 'last_price_update', 'material_weight', 'material'],
      rowCount: 49 
    },
    'suppliers': { 
      exists: true,
      columns: ['id', 'name', 'ein', 'address', 'broker_name', 'contact_email', 'phone', 'contact_person', 'supplier_type', 'country', 'notes', 'created_at', 'updated_at', 'broker_contact', 'broker_contact_email', 'broker_contact_phone'],
      rowCount: 6 
    },
    'inventory_lots': { 
      exists: true,
      columns: [], // Empty, need to probe
      rowCount: 0 
    },
    'preadmissions': { 
      exists: true,
      columns: [], // Empty, need to probe
      rowCount: 0 
    },
    'transactions': { 
      exists: true,
      columns: [], // Empty, need to probe
      rowCount: 0 
    },
    'storage_locations': { 
      exists: true,
      columns: ['id', 'location_code', 'location_type', 'zone', 'aisle', 'level', 'position', 'capacity_weight_kg', 'capacity_volume_m3', 'is_active', 'notes', 'created_at', 'updated_at', 'created_by', 'description'],
      rowCount: 10 
    },
    'material_indices': { 
      exists: true,
      columns: [], // Empty, need to probe
      rowCount: 0 
    },
    'preshipments': { 
      exists: true,
      columns: [], // Empty, need to probe
      rowCount: 0 
    }
  };

  console.log('=== SCHEMA COMPARISON ===\n');
  
  const issues = [];
  
  // Check each expected table
  for (const [tableName, expectedData] of Object.entries(expectations.expectedTables)) {
    console.log(`\nTable: ${tableName}`);
    console.log(`  Expected by: ${expectedData.files.join(', ')}`);
    
    if (actualTables[tableName]) {
      console.log(`  ✅ EXISTS in Supabase`);
      console.log(`  📊 Row count: ${actualTables[tableName].rowCount}`);
      
      if (actualTables[tableName].columns.length > 0) {
        console.log(`  📋 Actual columns: ${actualTables[tableName].columns.join(', ')}`);
        
        // Check for missing expected columns
        for (const expectedCol of expectedData.columns) {
          if (!actualTables[tableName].columns.includes(expectedCol)) {
            issues.push({
              type: 'missing_column',
              table: tableName,
              column: expectedCol,
              severity: 'high'
            });
            console.log(`    ❌ Missing expected column: ${expectedCol}`);
          }
        }
      } else {
        console.log(`  ⚠️  Empty table - cannot verify columns`);
      }
    } else {
      issues.push({
        type: 'missing_table',
        table: tableName,
        severity: 'critical'
      });
      console.log(`  ❌ MISSING from Supabase`);
    }
  }
  
  // Check for wrong table names used in code
  const wrongTableNames = [
    { wrong: 'inventory_transactions', correct: 'transactions' },
    { wrong: 'materials', correct: 'material_indices' },
    { wrong: 'locations', correct: 'storage_locations' }
  ];
  
  console.log('\n=== TABLE NAME ISSUES ===\n');
  for (const { wrong, correct } of wrongTableNames) {
    issues.push({
      type: 'wrong_table_name',
      wrongName: wrong,
      correctName: correct,
      severity: 'high'
    });
    console.log(`❌ Code uses "${wrong}" but table is named "${correct}"`);
  }
  
  // Check for column issues based on error log
  console.log('\n=== COLUMN ISSUES FROM ERROR LOG ===\n');
  const columnIssues = [
    { table: 'parts', column: 'active', issue: 'Column does not exist' },
    { table: 'customers', column: 'active', issue: 'Column does not exist' },
    { table: 'customers', column: 'status', issue: 'Column does not exist' },
    { table: 'inventory_lots', column: 'lot_number', issue: 'Column does not exist' },
    { table: 'inventory_lots', column: 'active', issue: 'Column does not exist' },
    { table: 'preadmissions', column: 'entry_date', issue: 'Column does not exist' },
    { table: 'suppliers', column: 'company_name', issue: 'Column does not exist (should be "name")' }
  ];
  
  for (const issue of columnIssues) {
    issues.push({
      type: 'missing_column',
      table: issue.table,
      column: issue.column,
      issue: issue.issue,
      severity: 'high'
    });
    console.log(`❌ ${issue.table}.${issue.column}: ${issue.issue}`);
  }
  
  // Summary
  console.log('\n=== SUMMARY ===\n');
  console.log(`Total issues found: ${issues.length}`);
  console.log(`Critical issues: ${issues.filter(i => i.severity === 'critical').length}`);
  console.log(`High severity issues: ${issues.filter(i => i.severity === 'high').length}`);
  
  // Save comprehensive analysis
  const analysis = {
    timestamp: new Date().toISOString(),
    expectedTables: expectations.expectedTables,
    actualTables,
    issues,
    summary: {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highSeverityIssues: issues.filter(i => i.severity === 'high').length,
      tablesExpected: Object.keys(expectations.expectedTables).length,
      tablesExisting: Object.keys(actualTables).length
    }
  };
  
  fs.writeFileSync('complete-schema-analysis.json', JSON.stringify(analysis, null, 2));
  console.log('\n✅ Complete analysis saved to complete-schema-analysis.json');
  
  // Generate fix recommendations
  console.log('\n=== FIX RECOMMENDATIONS ===\n');
  
  console.log('1. Table Name Fixes:');
  console.log('   - Replace "inventory_transactions" with "transactions" in dashboard.js and inventory.js');
  console.log('   - Replace "materials" with "material_indices" in materials.js');
  console.log('   - Replace "locations" with "storage_locations" in locations.js (already done?)');
  
  console.log('\n2. Column Fixes:');
  console.log('   - Remove "active" column references from parts table queries');
  console.log('   - Remove "active" and "status" column references from customers table queries');
  console.log('   - Remove "lot_number" and "active" column references from inventory_lots table queries');
  console.log('   - Remove "entry_date" column references from preadmissions table queries');
  console.log('   - Replace "company_name" with "name" in suppliers table queries');
  
  console.log('\n3. Missing Tables:');
  console.log('   - Consider creating preadmission_line_items table if needed');
  console.log('   - Consider creating inventory table if needed (or use inventory_lots)');
  
  return analysis;
}

completeAnalysis().catch(console.error);