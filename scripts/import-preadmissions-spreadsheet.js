#!/usr/bin/env node

/**
 * Import Preadmissions from Spreadsheet
 * Script to import existing FTZ tracking spreadsheet data into ICRS SPARC
 * 
 * Usage:
 *   node scripts/import-preadmissions-spreadsheet.js [path-to-excel-file] [options]
 * 
 * Options:
 *   --customer-id ID     Default customer ID for all records
 *   --dry-run           Preview import without making changes
 *   --verbose           Show detailed progress
 * 
 * Example:
 *   node scripts/import-preadmissions-spreadsheet.js "C:\path\to\Copy-FTZ_Tracking_worksheet_09032025.xlsx" --customer-id 1 --verbose
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PreadmissionService = require('../src/backend/services/business/PreadmissionService');

// Configuration
const CONFIG = {
  SHEET_NAME: 'Sheet1', // Adjust if your sheet has a different name
  HEADER_ROW: 1, // Row containing column headers
  DATA_START_ROW: 2, // First row with actual data
  
  // Column mapping from spreadsheet to database fields
  COLUMN_MAP: {
    'UID': 'admission_id',
    'Status': 'zone_status', 
    'Supplier2': 'primary_supplier_name',
    'Year': 'year',
    'Shipment / Lot ID': 'shipment_lot_id',
    'BOL Date': 'bol_date',
    'BOL Number': 'bol',
    'Container ID': 'container_number',
    'Seal #': 'seal_number',
    'FTZ \nAdmission Date': 'import_date', // Note: may have newline in header
    'LUC \nShip Date': 'luc_ship_date',
    'Value of Goods': 'total_value',
    'Bond': 'bond_amount',
    'Tariff $': 'total_charges',
    'USCBP \nMaster Bill #': 'uscbp_master_billing',
    'Carrier': 'conveyance_name',
    // Note: Part ID and # Pcs are handled separately as preadmission_items
    'Part ID': '_item_part_id',
    '# Pcs': '_item_quantity',
    'Freight Invoice Date': 'freight_invoice_date',
    'Ship Inv.': 'ship_invoice_number',
    'Note': 'notes'
  }
};

class PreadmissionImporter {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      defaultCustomerId: null,
      ...options
    };
    this.stats = {
      totalRows: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0
    };
    this.errors = [];
  }

  async importFromExcel(filePath) {
    try {
      console.log(`📊 Starting import from: ${filePath}`);
      console.log(`🔧 Options: ${JSON.stringify(this.options, null, 2)}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Load workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      // Get worksheet
      const worksheet = workbook.getWorksheet(CONFIG.SHEET_NAME) || workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in Excel file');
      }

      console.log(`📋 Found worksheet: ${worksheet.name}`);
      console.log(`📏 Total rows: ${worksheet.rowCount}`);

      // Parse headers
      const headers = this.parseHeaders(worksheet);
      console.log(`🏷️ Column headers found: ${headers.length}`);
      
      if (this.options.verbose) {
        console.log('Headers:', headers);
      }

      // Process data rows
      this.stats.totalRows = worksheet.rowCount - CONFIG.DATA_START_ROW + 1;
      
      for (let rowNumber = CONFIG.DATA_START_ROW; rowNumber <= worksheet.rowCount; rowNumber++) {
        await this.processRow(worksheet, headers, rowNumber);
      }

      // Print summary
      this.printSummary();
      
      return {
        success: true,
        stats: this.stats,
        errors: this.errors
      };

    } catch (error) {
      console.error('❌ Import failed:', error.message);
      return {
        success: false,
        error: error.message,
        stats: this.stats,
        errors: this.errors
      };
    }
  }

  parseHeaders(worksheet) {
    const headerRow = worksheet.getRow(CONFIG.HEADER_ROW);
    const headers = [];
    
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString().trim() || '';
      headers[colNumber] = value;
    });
    
    return headers;
  }

  async processRow(worksheet, headers, rowNumber) {
    try {
      const row = worksheet.getRow(rowNumber);
      const rowData = this.parseRowData(row, headers);
      
      // Skip empty rows
      if (!rowData.admission_id) {
        this.stats.skipped++;
        return;
      }

      if (this.options.verbose) {
        console.log(`📝 Processing row ${rowNumber}: UID ${rowData.admission_id}`);
      }

      // Check for duplicates (if not dry run)
      if (!this.options.dryRun) {
        const existing = await PreadmissionService.getPreadmissionById(rowData.admission_id);
        if (existing.success && existing.data) {
          console.log(`⚠️ Duplicate found: UID ${rowData.admission_id} already exists`);
          this.stats.duplicates++;
          return;
        }
      }

      // Prepare data for import
      const importData = this.prepareImportData(rowData);

      if (this.options.dryRun) {
        console.log(`🔍 [DRY RUN] Would import:`, JSON.stringify(importData, null, 2));
      } else {
        // Actually import the data using createPreadmission
        const result = await PreadmissionService.createPreadmission(importData);

        if (result.success) {
          this.stats.processed++;
          if (this.options.verbose) {
            console.log(`✅ Imported UID ${rowData.admission_id}`);
          }
        } else {
          this.stats.errors++;
          const error = `Row ${rowNumber} (UID: ${rowData.admission_id}): ${result.error}`;
          this.errors.push(error);
          console.log(`❌ ${error}`);
        }
      }

    } catch (error) {
      this.stats.errors++;
      const errorMsg = `Row ${rowNumber}: ${error.message}`;
      this.errors.push(errorMsg);
      console.log(`❌ ${errorMsg}`);
    }
  }

  parseRowData(row, headers) {
    const data = {};
    
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      
      // Map header to database field
      const fieldName = CONFIG.COLUMN_MAP[header];
      if (!fieldName) return;

      // Parse cell value
      let value = cell.value;
      
      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      } else if (typeof value === 'string' && value.trim() === '') {
        value = null;
      } else if (value !== null && value !== undefined) {
        value = value.toString().trim();
      }

      data[fieldName] = value;
    });

    return data;
  }

  prepareImportData(rowData) {
    const importData = { ...rowData };

    // Ensure customer ID is set
    if (!importData.customer_id && this.options.defaultCustomerId) {
      importData.customer_id = this.options.defaultCustomerId;
    }

    // Set default status if not provided
    if (!importData.status) {
      importData.status = 'Pending';
    }

    // Parse numeric fields
    const numericFields = ['year', 'total_value', 'bond_amount', 'total_charges'];
    numericFields.forEach(field => {
      if (importData[field] && typeof importData[field] === 'string') {
        // Remove any currency symbols or commas
        const cleaned = importData[field].replace(/[$,]/g, '');
        const parsed = parseFloat(cleaned);
        importData[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Handle Part ID and Quantity as items
    const items = [];
    if (importData._item_part_id && importData._item_quantity) {
      const quantity = parseInt(importData._item_quantity);
      if (!isNaN(quantity) && quantity > 0) {
        items.push({
          part_id: importData._item_part_id.toString().trim(),
          quantity: quantity,
          package_quantity: null,
          package_type: null,
          gross_weight: null,
          supplier_id: null,
          country_of_origin: null,
          hts_code: null
        });
      }
    }

    // Remove the temporary item fields from main data
    delete importData._item_part_id;
    delete importData._item_quantity;

    // Add items array to import data
    importData.items = items;

    return importData;
  }

  printSummary() {
    console.log('\n📊 IMPORT SUMMARY');
    console.log('================');
    console.log(`Total Rows: ${this.stats.totalRows}`);
    console.log(`✅ Processed: ${this.stats.processed}`);
    console.log(`⏭️ Skipped: ${this.stats.skipped}`);
    console.log(`⚠️ Duplicates: ${this.stats.duplicates}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.options.dryRun) {
      console.log('\n🔍 This was a DRY RUN - no data was actually imported.');
      console.log('   Remove --dry-run flag to perform actual import.');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
📊 Preadmissions Spreadsheet Import Tool

Usage: node scripts/import-preadmissions-spreadsheet.js [file] [options]

Arguments:
  file                Path to Excel file (.xlsx)

Options:
  --customer-id ID    Default customer ID for all records (required)
  --dry-run          Preview import without making changes  
  --verbose          Show detailed progress
  --help             Show this help message

Example:
  node scripts/import-preadmissions-spreadsheet.js "data.xlsx" --customer-id 1 --dry-run --verbose
`);
    process.exit(0);
  }

  const filePath = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    defaultCustomerId: null
  };

  // Parse customer ID
  const customerIdIndex = args.indexOf('--customer-id');
  if (customerIdIndex !== -1 && customerIdIndex + 1 < args.length) {
    options.defaultCustomerId = parseInt(args[customerIdIndex + 1]);
  }

  if (!options.defaultCustomerId) {
    console.error('❌ Error: --customer-id is required');
    console.log('   Use --customer-id followed by a valid customer ID number');
    process.exit(1);
  }

  // Run import
  const importer = new PreadmissionImporter(options);
  const result = await importer.importFromExcel(filePath);
  
  process.exit(result.success ? 0 : 1);
}

// Install exceljs if not present
try {
  require('exceljs');
} catch (error) {
  console.log('📦 Installing required dependency: exceljs');
  console.log('   Run: npm install exceljs');
  console.log('   Then try this command again.');
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { PreadmissionImporter };