-- Rollback Migration: Remove quarterly pricing tables
-- Created: 2025-09-03
-- Description: Complete rollback of quarterly pricing functionality

-- WARNING: This will permanently delete all quarterly pricing data!
-- Use with caution in production environments

-- Drop views first
DROP VIEW IF EXISTS pricing_history_analysis;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_price_impact_percentage(DECIMAL(10,4), DECIMAL(10,4));
DROP FUNCTION IF EXISTS update_pricing_adjustments_updated_at();
DROP FUNCTION IF EXISTS update_material_indices_updated_at();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.part_pricing_history CASCADE;
DROP TABLE IF EXISTS public.pricing_adjustments CASCADE; 
DROP TABLE IF EXISTS public.material_indices CASCADE;

-- Note: This rollback removes all quarterly pricing functionality
-- To restore, re-run the create migration files in order:
-- 1. 20250903120000_create_material_indices_table.sql
-- 2. 20250903120001_create_pricing_adjustments_table.sql  
-- 3. 20250903120002_create_part_pricing_history_table.sql