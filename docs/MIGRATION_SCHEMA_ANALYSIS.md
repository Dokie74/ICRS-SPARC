# ICRS_SPARC Database Schema Analysis & Migration Corrections

## Overview
After examining the actual ICRS_SPARC Supabase database schema, I discovered significant differences from the assumptions made in the original migration files. The corrected migration files have been created to match the actual database structure.

## Actual Database Schema Discovered

### inventory_lots
**Actual columns:** `id`, `created_at`, `updated_at`, `customer_id`, `part_id`, `quantity`, `status`
- ✅ Has: `customer_id`, `part_id` (UUID references)
- ❌ Missing: `active`, `voided` columns (these don't exist)
- Required NOT NULL: `id`

### transactions
**Actual columns:** `id`, `created_at`, `lot_id`, `quantity`, `type`
- Required NOT NULL: `lot_id`

### preadmissions
**Actual columns:** `id`, `created_at`, `customerId`, `admissionId`, `status`
- ⚠️ Important: Uses `customerId` (camelCase), not `customer_id`
- Required NOT NULL: `admissionId`

### preshipments
**Actual columns:** `id`, `created_at`, `customerId`, `shipmentId`, `type`, `stage`
- ⚠️ Important: Uses `customerId` (camelCase), not `customer_id`
- Required NOT NULL: `shipmentId`

### customers
**Actual columns:** `id`, `name`, `ein`, `address`, `broker_name`, `contact_email`

### parts
**Actual columns:** `id`, `description`, `hts_code`, `country_of_origin`, `standard_value`, `unit_of_measure`, `manufacturer_id`, `gross_weight`, `package_quantity`, `package_type`, `material_price`, `labor_price`, `overhead_price`, `price_source`, `last_price_update`, `material_weight`, `material`

### storage_locations
**Actual columns:** `id`, `location_code`, `location_type`, `zone`, `aisle`, `level`, `position`, `capacity_weight_kg`, `capacity_volume_m3`, `is_active`, `notes`, `created_at`, `updated_at`, `created_by`, `description`

### employees
**Actual columns:** `id`, `user_id`, `name`, `email`, `job_title`, `manager_id`, `is_active`, `created_at`, `updated_at`, `role`, `temp_password`, `must_change_password`, `department`, `last_login`, `is_admin`, `email_confirmed`, `created_by`

## Key Issues Corrected

### 1. Missing Columns
- **inventory_lots**: Removed all references to `active` and `voided` columns
- **Various tables**: Removed WHERE clauses that filtered on non-existent columns

### 2. Column Name Mismatches
- **preadmissions**: Changed `customer_id` to `customerId`
- **preshipments**: Changed `customer_id` to `customerId`
- **inventory_lots**: Confirmed `customer_id` exists (not `customerId`)

### 3. Transaction Block Issues
- Removed all `CONCURRENTLY` keywords from CREATE INDEX statements
- All indexes now run in standard transaction context

### 4. Function Parameter Updates
- Updated stored functions to use actual column names
- Removed references to non-existent columns in search and summary functions

## Corrected Migration Files Created

### 1. `20250829120000_enhance_performance_indexes_CORRECTED.sql`
- ✅ Uses actual column names: `customer_id`, `customerId`
- ✅ Removes references to `active`, `voided` columns
- ✅ No `CONCURRENTLY` keywords
- ✅ Proper WHERE clauses for nullable columns

### 2. `20250829121500_enhance_search_computed_columns_CORRECTED.sql`
- ✅ Full-text search for parts using actual columns
- ✅ Computed quantity columns for inventory
- ✅ Updated search functions with correct column references
- ✅ Removed invalid table joins and column references

## Next Steps

1. **Run the corrected migration files** in Supabase SQL editor:
   - First: `20250829120000_enhance_performance_indexes_CORRECTED.sql`
   - Second: `20250829121500_enhance_search_computed_columns_CORRECTED.sql`

2. **Verify index creation** by checking performance improvements

3. **Test shipping/receiving functionality** with the enhanced database

4. **Proceed with HTS implementation** once database is optimized

## Notes
- The `20250830120000__create_preshipments_table.sql` file appears to be compatible with existing schema
- All corrected migrations maintain data integrity and foreign key relationships
- Performance indexes are optimized for the actual query patterns used by the application