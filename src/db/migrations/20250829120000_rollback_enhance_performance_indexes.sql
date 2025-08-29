-- Rollback Migration: 20250829120000_rollback_enhance_performance_indexes.sql
-- Purpose: Remove performance indexes added in 20250829120000_enhance_performance_indexes.sql
-- Impact: Removes performance optimizations - use only if indexes cause issues

-- Remove inventory lots performance indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_customer_id_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_part_id_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_status_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_admission_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_customer_part_status;

-- Remove transaction history performance indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_lot_id_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_type_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_created_by;

-- Remove preadmissions workflow indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_preadmissions_customer_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_preadmissions_status_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_preadmissions_part_customer;

-- Remove preshipments workflow indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_preshipments_customer_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_preshipments_status_date;

-- Remove user and employee management indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_employees_user_id_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_employees_role_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_employees_employee_number;

-- Remove user permissions indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_user_page_permissions_user_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_page_permissions_page_user;

-- Remove parts catalog indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_parts_hts_code;
DROP INDEX CONCURRENTLY IF EXISTS idx_parts_country_origin;
DROP INDEX CONCURRENTLY IF EXISTS idx_parts_part_number;

-- Remove customer management indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_code_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_name_active;

-- Remove storage locations indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_storage_locations_code_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_storage_locations_zone_active;

-- Remove audit log indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_user_action;
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_action_created_at;

-- Remove entry summaries indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_entry_summaries_customer_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_entry_summaries_entry_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_entry_summary_items_entry_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_entry_summary_items_lot_id;

-- Remove preshipment items indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_preshipment_items_preshipment_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_preshipment_items_lot_id;

-- Remove performance monitoring indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_current_quantity;

-- Remove partial indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_inventory_lots_in_stock;
DROP INDEX CONCURRENTLY IF EXISTS idx_preadmissions_pending;
DROP INDEX CONCURRENTLY IF EXISTS idx_preshipments_pending;

-- Log rollback completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  '20250829120000_rollback_enhance_performance_indexes',
  NOW(),
  'Rolled back performance indexes from 20250829120000_enhance_performance_indexes'
);