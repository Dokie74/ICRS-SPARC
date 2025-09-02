// scripts/download-hts-data.js
// Utility script to download HTS data from USITC and save it locally
// Run with: node scripts/download-hts-data.js

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const HTS_URL = 'https://www.usitc.gov/sites/default/files/tata/hts/hts_2025_revision_16_json.json';
const OUTPUT_FILE = path.join(__dirname, '..', 'cache', 'hts-data.json');

console.log('ICRS SPARC HTS Data Downloader');
console.log('==============================');
console.log('Downloading HTS data from USITC...');
console.log('URL:', HTS_URL);
console.log('Output:', OUTPUT_FILE);

async function downloadJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        console.log(`Redirect to: ${response.headers.location}`);
        return downloadJson(response.headers.location).then(resolve).catch(reject);
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
          process.stdout.write(`\rProgress: ${percent}% (${Math.round(downloadedLength / 1024 / 1024)}MB/${Math.round(totalLength / 1024 / 1024)}MB)`);
        } else {
          process.stdout.write(`\rDownloaded: ${Math.round(downloadedLength / 1024 / 1024)}MB`);
        }
      });

      response.on('end', () => {
        console.log('\n✅ Download complete. Processing data...');
        resolve(data);
      });
    });

    request.on('error', reject);
    request.setTimeout(300000, () => { // 5 minute timeout
      request.destroy();
      reject(new Error('Request timeout (5 minutes)'));
    });
  });
}

async function main() {
  try {
    // Ensure cache directory exists
    const cacheDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(cacheDir, { recursive: true });
    console.log(`📁 Cache directory ready: ${cacheDir}`);

    // Download the data
    const data = await downloadJson(HTS_URL);
    
    // Validate JSON
    let jsonData;
    try {
      jsonData = JSON.parse(data);
      console.log(`✅ JSON validation successful: ${jsonData.length} HTS entries`);
    } catch (parseError) {
      throw new Error(`Invalid JSON data: ${parseError.message}`);
    }

    // Add metadata
    const cacheObject = {
      data: jsonData,
      timestamp: new Date().toISOString(),
      version: '2025_revision_16',
      source: HTS_URL,
      entries: jsonData.length
    };

    // Write to file
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(cacheObject, null, 2));
    console.log(`💾 HTS data saved to: ${OUTPUT_FILE}`);
    
    const stats = await fs.stat(OUTPUT_FILE);
    console.log(`📊 File size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`);

    // Display summary statistics
    console.log('\n📈 Data Summary:');
    console.log(`   Total HTS entries: ${jsonData.length.toLocaleString()}`);
    
    // Count entries by chapter
    const chapterCounts = {};
    jsonData.forEach(entry => {
      if (entry.htsno && entry.htsno.length >= 2) {
        const chapter = entry.htsno.substring(0, 2);
        chapterCounts[chapter] = (chapterCounts[chapter] || 0) + 1;
      }
    });
    
    const topChapters = Object.entries(chapterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    console.log('   Top 10 chapters by entry count:');
    topChapters.forEach(([chapter, count]) => {
      console.log(`     Chapter ${chapter}: ${count.toLocaleString()} entries`);
    });

    // Find some example entries
    const examples = jsonData.filter(entry => 
      entry.htsno && 
      entry.htsno.trim() !== '' && 
      entry.description && 
      entry.description.toLowerCase().includes('computer')
    ).slice(0, 3);

    if (examples.length > 0) {
      console.log('\n🖥️  Example computer-related entries:');
      examples.forEach(entry => {
        console.log(`   ${entry.htsno}: ${entry.description.substring(0, 60)}...`);
      });
    }

    console.log('\n🎉 HTS data download completed successfully!');
    console.log('💡 The data is now cached and ready for use by the HTS service.');

  } catch (error) {
    console.error('\n❌ Error downloading HTS data:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify the USITC URL is still valid');
    console.log('   3. Try running the script again in a few minutes');
    console.log('   4. The HTS service will fall back to test data if needed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { downloadJson };