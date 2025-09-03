# ICRS SPARC Data Import Scripts

This directory contains utility scripts for importing and managing data in the ICRS SPARC system.

## Prerequisites

1. Run the database migration first:
   ```bash
   # Run this from the main project directory
   supabase db migrate up
   ```

2. Make sure you have a valid customer ID to assign the imported records to:
   ```bash
   # You can check existing customers in your database
   # The customer ID will be used for all imported preadmissions
   ```

## Preadmissions Import

Import your existing FTZ tracking spreadsheet data into ICRS SPARC.

### Quick Start

```bash
# 1. Navigate to scripts directory
cd scripts

# 2. Install dependencies (one time only)
npm install

# 3. Preview import (dry run)
node import-preadmissions-spreadsheet.js "C:\path\to\your\Copy-FTZ_Tracking_worksheet_09032025.xlsx" --customer-id 1 --dry-run --verbose

# 4. Run actual import
node import-preadmissions-spreadsheet.js "C:\path\to\your\Copy-FTZ_Tracking_worksheet_09032025.xlsx" --customer-id 1 --verbose
```

### Command Options

- `--customer-id ID` - Required. Customer ID to assign to all imported records
- `--dry-run` - Preview import without making changes
- `--verbose` - Show detailed progress information
- `--help` - Show help message

### Field Mapping

The script automatically maps your spreadsheet columns to database fields:

| Spreadsheet Column | Database Field | Description |
|-------------------|----------------|-------------|
| UID | admission_id | Unique admission identifier |
| Status | zone_status | FTZ status (NPF/PF/D/ZR) |
| Supplier2 | primary_supplier_name | Primary supplier |
| Year | year | Year of shipment |
| Shipment / Lot ID | shipment_lot_id | Shipment identifier |
| BOL Date | bol_date | Bill of lading date |
| BOL Number | bol | BOL number |
| Container ID | container_number | Container identifier |
| Seal # | seal_number | Container seal number |
| FTZ Admission Date | import_date | FTZ admission date |
| LUC Ship Date | luc_ship_date | Last use ship date |
| Value of Goods | total_value | Total value in USD |
| Bond | bond_amount | Bond amount in USD |
| Tariff $ | total_charges | Tariff charges in USD |
| USCBP Master Bill # | uscbp_master_billing | Master bill number |
| Part ID | part_id | Part identifier (creates items) |
| # Pcs | quantity | Quantity (creates items) |
| Carrier | conveyance_name | Carrier name |
| Freight Invoice Date | freight_invoice_date | Invoice date |
| Ship Inv. | ship_invoice_number | Ship invoice number |
| Note | notes | Additional notes |

### Example Output

```
📊 Starting import from: data.xlsx
🔧 Options: { "dryRun": false, "verbose": true, "defaultCustomerId": 1 }
📋 Found worksheet: Sheet1
📏 Total rows: 110
🏷️ Column headers found: 25
✅ Imported UID 1
✅ Imported UID 2
⚠️ Duplicate found: UID 5 already exists

📊 IMPORT SUMMARY
================
Total Rows: 109
✅ Processed: 108
⏭️ Skipped: 0
⚠️ Duplicates: 1
❌ Errors: 0
```

## Troubleshooting

### Common Issues

1. **File not found**: Make sure the Excel file path is correct and in quotes
2. **Customer ID required**: You must specify a valid customer ID with `--customer-id`
3. **Duplicates**: The script will skip records with duplicate admission IDs
4. **Column headers**: Make sure your spreadsheet has the expected column headers

### Getting Customer ID

You can check existing customers in your database:
```sql
SELECT id, name FROM customers WHERE active = true;
```

Or create a new customer if needed through the ICRS SPARC interface.

## Next Steps

After importing:
1. Verify the imported data in the PreAdmissions page
2. Check for any records that need manual review
3. Update supplier mappings if needed
4. Run data validation checks

For questions or issues, refer to the main ICRS SPARC documentation.