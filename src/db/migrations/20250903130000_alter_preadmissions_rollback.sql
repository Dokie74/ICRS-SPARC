-- ROLLBACK Migration: Remove spreadsheet fields added to preadmissions table
-- Purpose: Safely rollback the ALTER TABLE changes while preserving original data
-- Date: 2025-09-03
-- USE: Execute this file if you need to undo the spreadsheet field additions

-- WARNING: This will remove data in the added columns!
-- Make sure to backup any important data before running this rollback.

-- 1. Drop the preadmission_items table (this removes all items data)
DROP TABLE IF EXISTS preadmission_items CASCADE;

-- 2. Drop indexes for the fields we're removing
DROP INDEX IF EXISTS idx_preadmissions_zone_status;
DROP INDEX IF EXISTS idx_preadmissions_primary_supplier;
DROP INDEX IF EXISTS idx_preadmissions_year;
DROP INDEX IF EXISTS idx_preadmissions_shipment_lot_id;

-- 3. Remove the added columns from preadmissions table
ALTER TABLE preadmissions DROP COLUMN IF EXISTS zone_status CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS primary_supplier_name CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS year CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS shipment_lot_id CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS bol_date CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS seal_number CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS luc_ship_date CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS bond_amount CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS freight_invoice_date CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS ship_invoice_number CASCADE;
ALTER TABLE preadmissions DROP COLUMN IF EXISTS uscbp_master_billing CASCADE;

-- Note: Original preadmissions table structure is preserved:
-- - id (uuid primary key)
-- - admissionId (text, not null) - kept as is
-- - customerId (uuid foreign key) - kept as is  
-- - status (text) - kept as is
-- - container (text) - kept as is
-- - arrivalDate (date) - kept as is
-- - created_at, updated_at - kept as is
-- - Any other existing fields - kept as is

-- The rollback is complete. 
-- Original functionality should be fully restored.