// Phase 3: Validation script for frontend consolidation
const fs = require('fs');
const path = require('path');

console.log('=== Phase 3 Frontend Consolidation Validation ===\n');

let errors = [];
let warnings = [];

// Test 1: Verify no duplicate files remain
console.log('1. Checking for remaining duplicate files...');
const duplicateFiles = [
  'src/frontend/App.js',
  'src/frontend/index.js',
  'src/frontend/components/',
  'src/frontend/contexts/',
  'src/frontend/services/'
];

duplicateFiles.forEach(file => {
  if (fs.existsSync(file)) {
    errors.push(`❌ Duplicate file still exists: ${file}`);
  } else {
    console.log(`✅ Correctly removed: ${file}`);
  }
});

// Test 2: Verify all imports resolve in App.js
console.log('\n2. Checking App.js imports...');
try {
  const appContent = fs.readFileSync('src/frontend/src/App.js', 'utf8');
  
  // Extract all relative imports
  const importRegex = /import\s+.+\s+from\s+['"](\.[^'"]+)['"]/g;
  let match;
  const imports = [];
  
  while ((match = importRegex.exec(appContent)) !== null) {
    imports.push(match[1]);
  }
  
  console.log(`Found ${imports.length} relative imports`);
  
  imports.forEach(importPath => {
    const resolvedPath = path.resolve('src/frontend/src', importPath);
    
    // Check various extensions
    const extensions = ['', '.js', '.jsx', '/index.js', '/index.jsx'];
    let found = false;
    
    for (const ext of extensions) {
      if (fs.existsSync(resolvedPath + ext)) {
        found = true;
        console.log(`✅ ${importPath} → ${resolvedPath + ext}`);
        break;
      }
    }
    
    if (!found) {
      errors.push(`❌ Import not found: ${importPath} (resolved to ${resolvedPath})`);
    }
  });
} catch (error) {
  errors.push(`❌ Could not read App.js: ${error.message}`);
}

// Test 3: Verify Phase 2 API fixes are in correct location
console.log('\n3. Verifying Phase 2 API fixes in correct location...');
try {
  const apiClientPath = 'src/frontend/src/services/api-client.js';
  const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');
  
  const apiPrefixCount = (apiClientContent.match(/\/api\//g) || []).length;
  if (apiPrefixCount >= 15) { // Should have many /api/ prefixes
    console.log(`✅ API client has ${apiPrefixCount} '/api/' prefixes - Phase 2 fixes applied`);
  } else {
    errors.push(`❌ API client only has ${apiPrefixCount} '/api/' prefixes - Phase 2 fixes missing`);
  }
  
  // Check for specific endpoints we added in Phase 2
  const requiredEndpoints = [
    "'/api/auth/register'",
    "'/api/auth/profile'",
    "'/api/parts/search'"
  ];
  
  requiredEndpoints.forEach(endpoint => {
    if (apiClientContent.includes(endpoint)) {
      console.log(`✅ Found Phase 2 endpoint: ${endpoint}`);
    } else {
      errors.push(`❌ Missing Phase 2 endpoint: ${endpoint}`);
    }
  });
} catch (error) {
  errors.push(`❌ Could not verify API client: ${error.message}`);
}

// Test 4: Verify Customers component and route
console.log('\n4. Verifying Customers component...');
if (fs.existsSync('src/frontend/src/components/pages/Customers.js')) {
  console.log('✅ Customers.js exists in correct location');
  
  // Check if Customers route is in App.js
  try {
    const appContent = fs.readFileSync('src/frontend/src/App.js', 'utf8');
    if (appContent.includes('path="/customers"') && appContent.includes('<Customers />')) {
      console.log('✅ Customers route configured in App.js');
    } else {
      errors.push('❌ Customers route not properly configured in App.js');
    }
  } catch (error) {
    errors.push(`❌ Could not check Customers route: ${error.message}`);
  }
} else {
  errors.push('❌ Customers.js missing from correct location');
}

// Test 5: Verify React app structure
console.log('\n5. Verifying React app structure...');
const requiredFiles = [
  'src/frontend/package.json',
  'src/frontend/public/index.html',
  'src/frontend/src/index.js',
  'src/frontend/src/App.js'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    errors.push(`❌ Missing critical file: ${file}`);
  }
});

// Test 6: Basic syntax check on key files
console.log('\n6. Basic syntax validation...');
const keyFiles = [
  'src/frontend/src/App.js',
  'src/frontend/src/services/api-client.js',
  'src/frontend/src/components/pages/Customers.js'
];

keyFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (openBraces !== closeBraces) {
      warnings.push(`⚠️  ${filePath}: Mismatched braces (${openBraces} open, ${closeBraces} close)`);
    } else if (openParens !== closeParens) {
      warnings.push(`⚠️  ${filePath}: Mismatched parentheses (${openParens} open, ${closeParens} close)`);
    } else {
      console.log(`✅ ${filePath}: Basic syntax OK`);
    }
  } catch (error) {
    errors.push(`❌ Could not validate ${filePath}: ${error.message}`);
  }
});

// Summary
console.log('\n=== VALIDATION SUMMARY ===');
if (errors.length === 0) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('\n✅ Phase 2 fixes successfully moved to correct location');
  console.log('✅ Phase 3 frontend consolidation completed');
  console.log('✅ Customers component properly integrated');
  console.log('✅ Duplicate files removed');
  console.log('✅ React app structure validated');
} else {
  console.log(`❌ FOUND ${errors.length} ERROR(S):`);
  errors.forEach(error => console.log(`   ${error}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} WARNING(S):`);
  warnings.forEach(warning => console.log(`   ${warning}`));
}

process.exit(errors.length > 0 ? 1 : 0);