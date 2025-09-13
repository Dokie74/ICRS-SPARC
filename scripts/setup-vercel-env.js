#!/usr/bin/env node
// setup-vercel-env.js - Extract environment variables for Vercel deployment
// This script safely extracts the required Supabase environment variables
// from your local .env file for easy copying to Vercel dashboard.

const fs = require('fs');
const path = require('path');

console.log('🔧 ICRS SPARC - Vercel Environment Variables Setup');
console.log('====================================================\n');

// Read the .env file
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found at:', envPath);
  console.log('Please ensure you have a .env file in your project root.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// Parse environment variables
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Required variables for Vercel
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY'
];

console.log('📋 ENVIRONMENT VARIABLES TO ADD TO VERCEL:');
console.log('==========================================\n');

console.log('Go to: https://vercel.com/david-okonoskis-projects/icrs-sparc/settings/environment-variables\n');

let allFound = true;

requiredVars.forEach(varName => {
  if (envVars[varName]) {
    console.log(`✅ ${varName}:`);
    console.log(`   Value: ${envVars[varName]}`);
    console.log(`   Environment: Production, Preview, Development`);
    console.log('');
  } else {
    console.log(`❌ ${varName}: NOT FOUND in .env file`);
    allFound = false;
  }
});

if (!allFound) {
  console.log('⚠️  Some required variables are missing from your .env file.');
  console.log('Please ensure all Supabase variables are properly configured.\n');
}

console.log('📝 INSTRUCTIONS:');
console.log('================');
console.log('1. Open the Vercel dashboard link above');
console.log('2. Click "Add New" environment variable');
console.log('3. For each variable above:');
console.log('   - Name: Copy the variable name (e.g., SUPABASE_URL)');
console.log('   - Value: Copy the value exactly as shown');
console.log('   - Environment: Select all three (Production, Preview, Development)');
console.log('   - Click "Save"');
console.log('4. After adding all variables, redeploy your application');
console.log('');

console.log('🚀 AFTER ADDING VARIABLES:');
console.log('==========================');
console.log('Run: npm run deploy (or push to trigger auto-deploy)');
console.log('Then test: https://icrs-sparc.vercel.app/login');
console.log('');

console.log('✨ This will fix your 401 authentication errors!');