// scripts/download-hts-csv.js
// Enhanced utility to download HTS CSV data and convert it to usable format
// Run with: node scripts/download-hts-csv.js

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const HTS_CSV_URL = 'https://www.usitc.gov/sites/default/files/tata/hts/hts_2025_revision_16_csv.csv';
const OUTPUT_JSON = path.join(__dirname, '..', 'cache', 'hts-data-csv.json');
const OUTPUT_CSV = path.join(__dirname, '..', 'cache', 'hts-data.csv');

console.log('ICRS SPARC HTS CSV Downloader');
console.log('=============================');
console.log('Downloading HTS CSV data from USITC...');
console.log('URL:', HTS_CSV_URL);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function csvToJson(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  console.log('📋 CSV Headers:', headers);
  
  const jsonData = [];
  let processedCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        
        headers.forEach((header, index) => {
          // Clean up header names and map to our structure
          let key = header.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w_]/g, '');
            
          switch (key) {
            case 'hts_number':
            case 'hts_no':
            case 'hts':
              key = 'htsno';
              break;
            case 'general_rate_of_duty':
            case 'general_rate':
            case 'general':
              key = 'general';
              break;
            case 'special_rate_of_duty':
            case 'special_rate':
            case 'special':
              key = 'special';
              break;
            case 'column_2_rate_of_duty':
            case 'column_2_rate':
            case 'column_2':
              key = 'other';
              break;
            case 'unit_of_quantity':
            case 'units':
              key = 'units';
              break;
            case 'additional_duties':
              key = 'additionalDuties';
              break;
            case 'quota_quantity':
              key = 'quotaQuantity';
              break;
          }
          
          let value = values[index] || '';
          
          // Handle units array
          if (key === 'units' && value) {
            value = value.split(/[,;]/).map(u => u.trim()).filter(u => u);
          }
          
          // Handle numeric values
          if (key === 'indent' && value) {
            value = parseInt(value) || 0;
          }
          
          row[key] = value;
        });
        
        // Add missing fields for compatibility
        if (!row.indent) row.indent = '0';
        if (!row.superior) row.superior = null;
        if (!row.footnotes) row.footnotes = [];
        
        jsonData.push(row);
        processedCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      errorCount++;
    }
    
    if (i % 1000 === 0) {
      process.stdout.write(`\r🔄 Processing CSV: ${i}/${lines.length} rows (${errorCount} errors)`);
    }
  }
  
  console.log(`\n✅ CSV processing complete: ${processedCount} rows processed, ${errorCount} errors`);
  return jsonData;
}

async function downloadData(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`📍 Redirect to: ${response.headers.location}`);
        return downloadData(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      let data = '';
      let totalLength = parseInt(response.headers['content-length']) || 0;
      let downloadedLength = 0;

      response.on('data', (chunk) => {
        data += chunk;
        downloadedLength += chunk.length;
        
        if (totalLength > 0) {
          const percent = Math.round((downloadedLength / totalLength) * 100);
          process.stdout.write(`\r📥 Progress: ${percent}% (${Math.round(downloadedLength / 1024 / 1024)}MB/${Math.round(totalLength / 1024 / 1024)}MB)`);
        } else {
          process.stdout.write(`\r📥 Downloaded: ${Math.round(downloadedLength / 1024 / 1024)}MB`);
        }
      });

      response.on('end', () => {
        console.log('\n✅ Download complete. Processing CSV data...');
        resolve(data);
      });
    });

    request.on('error', reject);
    request.setTimeout(300000, () => {
      request.destroy();
      reject(new Error('Request timeout (5 minutes)'));
    });
  });
}

async function main() {
  try {
    // Ensure cache directory exists
    const cacheDir = path.dirname(OUTPUT_CSV);
    await fs.mkdir(cacheDir, { recursive: true });
    console.log(`📁 Cache directory ready: ${cacheDir}`);

    // Download the CSV data
    const data = await downloadData(HTS_CSV_URL);
    
    // Save raw CSV
    await fs.writeFile(OUTPUT_CSV, data);
    console.log(`💾 Raw CSV saved to: ${OUTPUT_CSV}`);
    
    // Convert to JSON
    const jsonData = csvToJson(data);
    console.log(`🔄 Converted to JSON: ${jsonData.length} HTS entries`);
    
    // Find automotive parts (8708) as a validation test
    const automotiveParts = jsonData.filter(entry => 
      entry.htsno && entry.htsno.startsWith('8708')
    );
    console.log(`🚗 Found ${automotiveParts.length} automotive parts (8708.x) entries`);
    
    // Look for our specific example
    const targetCode = jsonData.find(entry => 
      entry.htsno === '8708.80.6590'
    );
    
    if (targetCode) {
      console.log('🎯 Found target HTS code 8708.80.6590:');
      console.log('   Description:', targetCode.description);
      console.log('   General rate:', targetCode.general);
      console.log('   Special rate:', targetCode.special);
    } else {
      console.log('⚠️  Target code 8708.80.6590 not found, showing similar codes:');
      const similar = jsonData.filter(entry => 
        entry.htsno && entry.htsno.startsWith('8708.80')
      ).slice(0, 5);
      similar.forEach(e => {
        console.log(`   ${e.htsno}: ${e.description?.substring(0, 50)}... (General: ${e.general})`);
      });
    }

    // Create cache object with metadata
    const cacheObject = {
      data: jsonData,
      timestamp: new Date().toISOString(),
      version: '2025_revision_16',
      source: HTS_CSV_URL,
      entries: jsonData.length,
      format: 'csv_converted'
    };
    
    // Write JSON
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(cacheObject, null, 2));
    console.log(`💾 JSON data saved to: ${OUTPUT_JSON}`);
    
    const jsonStats = await fs.stat(OUTPUT_JSON);
    console.log(`📊 JSON file size: ${Math.round(jsonStats.size / 1024 / 1024 * 100) / 100} MB`);

    // Summary statistics
    console.log('\n📈 Data Summary:');
    console.log(`   Total HTS entries: ${jsonData.length.toLocaleString()}`);
    
    // Count by chapter
    const chapterCounts = {};
    jsonData.forEach(entry => {
      if (entry.htsno && entry.htsno.length >= 2) {
        const chapter = entry.htsno.substring(0, 2);
        chapterCounts[chapter] = (chapterCounts[chapter] || 0) + 1;
      }
    });
    
    console.log(`   Chapters found: ${Object.keys(chapterCounts).length}`);
    
    // Show top chapters
    const topChapters = Object.entries(chapterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('   Top 5 chapters:');
    topChapters.forEach(([chapter, count]) => {
      console.log(`     Chapter ${chapter}: ${count.toLocaleString()} entries`);
    });

    console.log('\n🎉 HTS CSV download and conversion completed successfully!');
    console.log('💡 Both CSV and JSON formats are now available for the HTS service.');

  } catch (error) {
    console.error('\n❌ Error processing HTS CSV data:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify the USITC CSV URL is still valid');
    console.log('   3. Ensure you have sufficient disk space');
    console.log('   4. Try the JSON download script instead');
    console.log('   5. The HTS service will fall back to test data if needed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { downloadData, csvToJson };