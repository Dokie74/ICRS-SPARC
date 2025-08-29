-- Migration: 20250829120000_enhance_performance_indexes.sql
-- Purpose: Add performance indexes for enhanced ICRS_SPARC backend operations
-- Impact: Improves query performance for inventory tracking, user management, and real-time operations
-- Rollback: 20250829120000_rollback_enhance_performance_indexes.sql

-- Enable concurrent index creation to avoid blocking production operations
SET maintenance_work_mem = '256MB';

-- Inventory lots performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_customer_id_active 
  ON inventory_lots(customer_id) 
  WHERE active = true AND NOT voided;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_part_id_active 
  ON inventory_lots(part_id) 
  WHERE active = true AND NOT voided;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_status_active 
  ON inventory_lots(status) 
  WHERE active = true AND NOT voided;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_admission_date 
  ON inventory_lots(admission_date DESC) 
  WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_created_at 
  ON inventory_lots(created_at DESC);

-- Composite index for common inventory queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_customer_part_status 
  ON inventory_lots(customer_id, part_id, status) 
  WHERE active = true AND NOT voided;

-- Transaction history performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_lot_id_created_at 
  ON transactions(lot_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_created_at 
  ON transactions(type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_by 
  ON transactions(created_by, created_at DESC) 
  WHERE created_by IS NOT NULL;

-- Preadmissions workflow indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preadmissions_customer_status 
  ON preadmissions(customer_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preadmissions_status_created_at 
  ON preadmissions(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preadmissions_part_customer 
  ON preadmissions(part_id, customer_id);

-- Preshipments workflow indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preshipments_customer_status 
  ON preshipments(customer_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preshipments_status_date 
  ON preshipments(status, shipment_date DESC);

-- User and employee management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_user_id_active 
  ON employees(user_id) 
  WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_role_active 
  ON employees(role) 
  WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_employee_number 
  ON employees(employee_number) 
  WHERE employee_number IS NOT NULL;

-- User permissions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_page_permissions_user_active 
  ON user_page_permissions(user_id, is_active) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_page_permissions_page_user 
  ON user_page_permissions(page_name, user_id) 
  WHERE is_active = true;

-- Parts catalog indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_hts_code 
  ON parts(hts_code) 
  WHERE active = true AND hts_code IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_country_origin 
  ON parts(country_of_origin) 
  WHERE active = true AND country_of_origin IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_part_number 
  ON parts(part_number) 
  WHERE active = true AND part_number IS NOT NULL;

-- Customer management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_code_active 
  ON customers(code) 
  WHERE active = true AND code IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name_active 
  ON customers(name) 
  WHERE active = true;

-- Storage locations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_locations_code_active 
  ON storage_locations(location_code) 
  WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_locations_zone_active 
  ON storage_locations(zone) 
  WHERE active = true AND zone IS NOT NULL;

-- Audit log indexes for compliance reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at 
  ON audit_log(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_action 
  ON audit_log(user_id, action, created_at DESC) 
  WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action_created_at 
  ON audit_log(action, created_at DESC);

-- Entry summaries and customs declarations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entry_summaries_customer_status 
  ON entry_summaries(customer_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entry_summaries_entry_date 
  ON entry_summaries(entry_date DESC) 
  WHERE entry_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entry_summary_items_entry_id 
  ON entry_summary_items(entry_summary_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entry_summary_items_lot_id 
  ON entry_summary_items(lot_id);

-- Preshipment items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preshipment_items_preshipment_id 
  ON preshipment_items(preshipment_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preshipment_items_lot_id 
  ON preshipment_items(lot_id);

-- Performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_current_quantity 
  ON inventory_lots(current_quantity) 
  WHERE active = true AND current_quantity > 0;

-- Partial indexes for common filtering scenarios
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_lots_in_stock 
  ON inventory_lots(customer_id, part_id, created_at DESC) 
  WHERE status = 'In Stock' AND active = true AND NOT voided;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preadmissions_pending 
  ON preadmissions(customer_id, created_at DESC) 
  WHERE status = 'Pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preshipments_pending 
  ON preshipments(customer_id, created_at DESC) 
  WHERE status = 'Pending';

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

-- Log migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  '20250829120000_enhance_performance_indexes',
  NOW(),
  'Added comprehensive performance indexes for enhanced ICRS_SPARC backend operations'
);