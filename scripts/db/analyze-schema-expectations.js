// Script to analyze what the application expects from Supabase
const fs = require('fs');
const path = require('path');

// Track all expected tables and columns
const expectations = {
  tables: {},
  issues: []
};

// Parse a file for supabaseClient calls
function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Find all supabaseClient method calls
  const patterns = [
    /supabaseClient\.(getAll|getById|create|update|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /from\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\.eq\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /column:\s*['"`]([^'"`]+)['"`]/g,
    /select:\s*['"`]([^'"`]+)['"`]/g
  ];
  
  // Extract table names from supabaseClient calls
  let match;
  const tablePattern = /supabaseClient\.(getAll|getById|create|update|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = tablePattern.exec(content)) !== null) {
    const method = match[1];
    const table = match[2];
    
    if (!expectations.tables[table]) {
      expectations.tables[table] = {
        files: new Set(),
        methods: new Set(),
        columns: new Set(),
        relationships: new Set()
      };
    }
    
    expectations.tables[table].files.add(fileName);
    expectations.tables[table].methods.add(method);
  }
  
  // Extract column names from filters
  const filterPattern = /column:\s*['"`]([^'"`]+)['"`]/g;
  while ((match = filterPattern.exec(content)) !== null) {
    const column = match[1];
    
    // Try to associate with the nearest table reference
    const nearbyTable = findNearestTable(content, match.index);
    if (nearbyTable && expectations.tables[nearbyTable]) {
      expectations.tables[nearbyTable].columns.add(column);
    }
  }
  
  // Extract columns from select statements
  const selectPattern = /select:\s*['"`]([^'"`]+)['"`]/g;
  while ((match = selectPattern.exec(content)) !== null) {
    const selectStr = match[1];
    parseSelectString(selectStr);
  }
}

// Find the nearest table reference before a given position
function findNearestTable(content, position) {
  const before = content.substring(0, position);
  const tablePattern = /supabaseClient\.(getAll|getById|create|update|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let lastTable = null;
  let match;
  
  while ((match = tablePattern.exec(before)) !== null) {
    lastTable = match[2];
  }
  
  return lastTable;
}

// Parse select string for columns and relationships
function parseSelectString(selectStr) {
  // Remove newlines and extra spaces
  const clean = selectStr.replace(/\s+/g, ' ').trim();
  
  // Split by comma to get individual selections
  const parts = clean.split(',');
  
  parts.forEach(part => {
    // Check for relationship syntax: table:column(fields)
    const relPattern = /([^:]+):([^(]+)\(([^)]+)\)/;
    const relMatch = part.match(relPattern);
    
    if (relMatch) {
      const localTable = relMatch[1].trim();
      const foreignKey = relMatch[2].trim();
      const fields = relMatch[3].trim();
      
      // This indicates a relationship
      // We'll track it but focus on columns for now
    } else {
      // Simple column reference
      const column = part.trim();
      if (column && column !== '*') {
        // Track this column (though we don't know the table here)
      }
    }
  });
}

// Analyze all route files
const routesDir = path.join(__dirname, 'src/backend/api/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  parseFile(filePath);
});

// Convert Sets to arrays for output
const output = {
  expectedTables: {},
  summary: {
    totalTables: 0,
    totalColumns: 0,
    filesAnalyzed: files.length
  }
};

for (const [table, data] of Object.entries(expectations.tables)) {
  output.expectedTables[table] = {
    files: Array.from(data.files),
    methods: Array.from(data.methods),
    columns: Array.from(data.columns),
    relationships: Array.from(data.relationships)
  };
  output.summary.totalTables++;
  output.summary.totalColumns += data.columns.size;
}

// Sort tables by usage frequency
const sortedTables = Object.entries(output.expectedTables)
  .sort((a, b) => b[1].files.length - a[1].files.length);

console.log('\n=== SCHEMA EXPECTATIONS ANALYSIS ===\n');
console.log('Summary:', output.summary);
console.log('\n=== TABLES EXPECTED BY APPLICATION ===\n');

sortedTables.forEach(([table, data]) => {
  console.log(`\nTable: ${table}`);
  console.log(`  Used in: ${data.files.join(', ')}`);
  console.log(`  Methods: ${data.methods.join(', ')}`);
  if (data.columns.length > 0) {
    console.log(`  Columns referenced: ${data.columns.join(', ')}`);
  }
});

// Now check for known issues based on the error log
console.log('\n=== KNOWN ISSUES FROM ERROR LOG ===\n');

const knownIssues = [
  { table: 'inventory_transactions', issue: 'Table does not exist, should use "transactions"' },
  { table: 'materials', issue: 'Table does not exist, should use "material_indices"' },
  { table: 'locations', issue: 'Table does not exist, should use "storage_locations"' },
  { column: 'parts.active', issue: 'Column does not exist' },
  { column: 'customers.active', issue: 'Column does not exist' },
  { column: 'customers.status', issue: 'Column does not exist' },
  { column: 'inventory_lots.lot_number', issue: 'Column does not exist' },
  { column: 'inventory_lots.active', issue: 'Column does not exist' },
  { column: 'preadmissions.entry_date', issue: 'Column does not exist' },
  { column: 'suppliers.company_name', issue: 'Column does not exist' }
];

knownIssues.forEach(issue => {
  if (issue.table) {
    console.log(`❌ Table Issue: "${issue.table}" - ${issue.issue}`);
  } else if (issue.column) {
    console.log(`❌ Column Issue: "${issue.column}" - ${issue.issue}`);
  }
});

// Export for further processing
fs.writeFileSync('schema-expectations.json', JSON.stringify(output, null, 2));
console.log('\n✅ Analysis complete. Results saved to schema-expectations.json');