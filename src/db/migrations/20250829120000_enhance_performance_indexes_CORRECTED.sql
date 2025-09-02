-- Migration: 20250829120000_enhance_performance_indexes_CORRECTED.sql
-- Purpose: Add performance indexes for enhanced ICRS_SPARC backend operations (CORRECTED VERSION)
-- Impact: Improves query performance for inventory tracking, user management, and real-time operations
-- Rollback: 20250829120000_rollback_enhance_performance_indexes.sql

-- Enable better memory allocation for index creation
SET maintenance_work_mem = '256MB';

-- Inventory lots performance indexes (CORRECTED - no 'active', 'voided' columns)
CREATE INDEX IF NOT EXISTS idx_inventory_lots_customer_id 
  ON inventory_lots(customer_id);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_part_id 
  ON inventory_lots(part_id);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_status 
  ON inventory_lots(status);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_created_at 
  ON inventory_lots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_updated_at 
  ON inventory_lots(updated_at DESC);

-- Composite index for common inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_lots_customer_part_status 
  ON inventory_lots(customer_id, part_id, status);

-- Transaction history performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_lot_id_created_at 
  ON transactions(lot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type_created_at 
  ON transactions(type, created_at DESC);

-- Preadmissions workflow indexes (CORRECTED - uses "customerId" quoted for case sensitivity)
CREATE INDEX IF NOT EXISTS idx_preadmissions_customer_status 
  ON preadmissions("customerId", status) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preadmissions_status_created_at 
  ON preadmissions(status, created_at DESC) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preadmissions_created_at 
  ON preadmissions(created_at DESC);

-- Preshipments workflow indexes (uses "customerId" quoted for case sensitivity)
CREATE INDEX IF NOT EXISTS idx_preshipments_customer_stage 
  ON preshipments("customerId", stage);

CREATE INDEX IF NOT EXISTS idx_preshipments_stage_created_at 
  ON preshipments(stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preshipments_created_at 
  ON preshipments(created_at DESC);

-- User and employee management indexes
CREATE INDEX IF NOT EXISTS idx_employees_name 
  ON employees(name);

CREATE INDEX IF NOT EXISTS idx_employees_email 
  ON employees(email);

CREATE INDEX IF NOT EXISTS idx_employees_role 
  ON employees(role);

-- Parts catalog indexes
CREATE INDEX IF NOT EXISTS idx_parts_hts_code 
  ON parts(hts_code) 
  WHERE hts_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parts_country_origin 
  ON parts(country_of_origin) 
  WHERE country_of_origin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parts_description 
  ON parts(description);

-- Customer management indexes
CREATE INDEX IF NOT EXISTS idx_customers_name 
  ON customers(name);

CREATE INDEX IF NOT EXISTS idx_customers_ein 
  ON customers(ein) 
  WHERE ein IS NOT NULL;

-- Storage locations indexes
CREATE INDEX IF NOT EXISTS idx_storage_locations_code 
  ON storage_locations(location_code);

CREATE INDEX IF NOT EXISTS idx_storage_locations_zone 
  ON storage_locations(zone) 
  WHERE zone IS NOT NULL;

-- Performance monitoring - only include existing columns
CREATE INDEX IF NOT EXISTS idx_inventory_lots_quantity 
  ON inventory_lots(quantity) 
  WHERE quantity > 0;

-- Partial indexes for common filtering scenarios (CORRECTED column names with quotes)
CREATE INDEX IF NOT EXISTS idx_preadmissions_customer_created 
  ON preadmissions("customerId", created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preadmissions_status 
  ON preadmissions(status) WHERE status IS NOT NULL;

-- Reset maintenance_work_mem
RESET maintenance_work_mem;

-- Analyze tables to update statistics after index creation
ANALYZE inventory_lots;
ANALYZE transactions;
ANALYZE preadmissions;
ANALYZE preshipments;
ANALYZE employees;
ANALYZE parts;
ANALYZE customers;
ANALYZE storage_locations;