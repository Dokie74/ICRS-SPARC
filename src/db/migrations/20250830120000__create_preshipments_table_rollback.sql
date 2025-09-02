-- Rollback Migration: Drop preshipments table and related objects
-- Purpose: Safely remove all preshipments functionality and related database objects
-- Impact: Completely removes preshipments table, indexes, triggers, functions, policies, and view
-- Date: 2025-08-30
-- WARNING: This will permanently delete all preshipment data

-- Drop the view first
DROP VIEW IF EXISTS preshipment_statistics;

-- Drop triggers and their functions
DROP TRIGGER IF EXISTS trigger_validate_shipment_finalization ON preshipments;
DROP TRIGGER IF EXISTS trigger_validate_ace_entry_summary ON preshipments;
DROP TRIGGER IF EXISTS trigger_preshipments_updated_at ON preshipments;

DROP FUNCTION IF EXISTS validate_shipment_finalization();
DROP FUNCTION IF EXISTS validate_ace_entry_summary();
DROP FUNCTION IF EXISTS update_preshipments_updated_at();

-- Drop RLS policies
DROP POLICY IF EXISTS "Managers can delete preshipments" ON preshipments;
DROP POLICY IF EXISTS "Staff can update preshipments" ON preshipments;
DROP POLICY IF EXISTS "Staff can create preshipments" ON preshipments;
DROP POLICY IF EXISTS "Users can view organization preshipments" ON preshipments;

-- Drop indexes (they will be automatically dropped with the table, but explicit for clarity)
DROP INDEX IF EXISTS idx_preshipments_items_gin;
DROP INDEX IF EXISTS idx_preshipments_tracking_number;
DROP INDEX IF EXISTS idx_preshipments_entry_number;
DROP INDEX IF EXISTS idx_preshipments_created_at;
DROP INDEX IF EXISTS idx_preshipments_requested_ship_date;
DROP INDEX IF EXISTS idx_preshipments_entry_summary_status;
DROP INDEX IF EXISTS idx_preshipments_type;
DROP INDEX IF EXISTS idx_preshipments_stage;
DROP INDEX IF EXISTS idx_preshipments_customer_id;
DROP INDEX IF EXISTS idx_preshipments_shipment_id;

-- Drop the main table (this also removes all associated indexes, constraints, and triggers)
DROP TABLE IF EXISTS preshipments CASCADE;

-- Note: We don't drop the uuid-ossp extension as it may be used by other tables
-- COMMENT: UUID extension left in place as it may be required by other system components