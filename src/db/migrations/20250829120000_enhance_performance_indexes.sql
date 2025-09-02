-- Migration: 20250829120000_enhance_performance_indexes.sql
-- Purpose: Add performance indexes for enhanced ICRS_SPARC backend operations
-- Impact: Improves query performance for inventory tracking, user management, and real-time operations
-- Rollback: 20250829120000_rollback_enhance_performance_indexes.sql

-- Enable better memory allocation for index creation
SET maintenance_work_mem = '256MB';

-- Inventory lots performance indexes
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

CREATE INDEX IF NOT EXISTS idx_transactions_created_by 
  ON transactions(created_by, created_at DESC) 
  WHERE created_by IS NOT NULL;

-- Preadmissions workflow indexes
CREATE INDEX IF NOT EXISTS idx_preadmissions_customer_stage 
  ON preadmissions(customer_id, stage);

CREATE INDEX IF NOT EXISTS idx_preadmissions_stage_created_at 
  ON preadmissions(stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preadmissions_created_at 
  ON preadmissions(created_at DESC);

-- Preshipments workflow indexes (will be available after preshipments table is created)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'preshipments') THEN
    CREATE INDEX IF NOT EXISTS idx_preshipments_customer_status 
      ON preshipments(customerId, stage);
    
    CREATE INDEX IF NOT EXISTS idx_preshipments_status_date 
      ON preshipments(stage, requested_ship_date DESC);
  END IF;
END $$;

-- User and employee management indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_name 
      ON employees(name);
    
    CREATE INDEX IF NOT EXISTS idx_employees_email 
      ON employees(email);
      
    CREATE INDEX IF NOT EXISTS idx_employees_role 
      ON employees(role);
  END IF;
END $$;

-- User permissions indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_page_permissions') THEN
    CREATE INDEX IF NOT EXISTS idx_user_page_permissions_user_active 
      ON user_page_permissions(user_id, is_active) 
      WHERE is_active = true;

    CREATE INDEX IF NOT EXISTS idx_user_page_permissions_page_user 
      ON user_page_permissions(page_name, user_id) 
      WHERE is_active = true;
  END IF;
END $$;

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

-- Audit log indexes for compliance reporting (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
      ON audit_log(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_log_user_action 
      ON audit_log(user_id, action, created_at DESC) 
      WHERE user_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_audit_log_action_created_at 
      ON audit_log(action, created_at DESC);
  END IF;
END $$;

-- Entry summaries and customs declarations indexes (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entry_summaries') THEN
    CREATE INDEX IF NOT EXISTS idx_entry_summaries_customer_status 
      ON entry_summaries(customer_id, status);

    CREATE INDEX IF NOT EXISTS idx_entry_summaries_entry_date 
      ON entry_summaries(entry_date DESC) 
      WHERE entry_date IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entry_summary_items') THEN
    CREATE INDEX IF NOT EXISTS idx_entry_summary_items_entry_id 
      ON entry_summary_items(entry_summary_id);

    CREATE INDEX IF NOT EXISTS idx_entry_summary_items_lot_id 
      ON entry_summary_items(lot_id);
  END IF;
END $$;

-- Preshipment items indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'preshipment_items') THEN
    CREATE INDEX IF NOT EXISTS idx_preshipment_items_preshipment_id 
      ON preshipment_items(preshipment_id);

    CREATE INDEX IF NOT EXISTS idx_preshipment_items_lot_id 
      ON preshipment_items(lot_id);
  END IF;
END $$;

-- Performance monitoring
CREATE INDEX IF NOT EXISTS idx_inventory_lots_quantity 
  ON inventory_lots(quantity) 
  WHERE quantity > 0;

-- Partial indexes for common filtering scenarios
CREATE INDEX IF NOT EXISTS idx_preadmissions_customer_created 
  ON preadmissions(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preadmissions_stage 
  ON preadmissions(stage);

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