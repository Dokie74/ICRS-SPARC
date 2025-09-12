-- Migration: Fix field naming after remote schema - rename camelCase to snake_case
-- Date: 2025-01-10
-- Purpose: Fix field naming that was introduced by remote schema migration
-- This runs AFTER 20250910182625_remote_schema.sql which created tables with camelCase names

-- =========================================================================
-- PREADMISSIONS TABLE FIELD RENAMING (AFTER REMOTE SCHEMA)
-- =========================================================================

-- Rename camelCase fields to snake_case in preadmissions table
DO $$
BEGIN
  -- Only rename if preadmissions table exists with camelCase field names
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preadmissions') THEN
    
    -- Rename admissionId to admission_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'admissionId') THEN
      ALTER TABLE "public"."preadmissions" RENAME COLUMN "admissionId" TO "admission_id";
      RAISE NOTICE 'Renamed preadmissions.admissionId to admission_id';
    END IF;
    
    -- Rename customerId to customer_id  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'customerId') THEN
      ALTER TABLE "public"."preadmissions" RENAME COLUMN "customerId" TO "customer_id";
      RAISE NOTICE 'Renamed preadmissions.customerId to customer_id';
    END IF;
    
    -- Rename entryNumber to entry_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'entryNumber') THEN
      ALTER TABLE "public"."preadmissions" RENAME COLUMN "entryNumber" TO "entry_number";
      RAISE NOTICE 'Renamed preadmissions.entryNumber to entry_number';
    END IF;
    
    -- Rename arrivalDate to arrival_date  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'arrivalDate') THEN
      ALTER TABLE "public"."preadmissions" RENAME COLUMN "arrivalDate" TO "arrival_date";
      RAISE NOTICE 'Renamed preadmissions.arrivalDate to arrival_date';
    END IF;

  END IF;
END
$$;

-- =========================================================================
-- PRESHIPMENTS TABLE FIELD RENAMING (AFTER REMOTE SCHEMA)
-- =========================================================================

-- Rename camelCase fields to snake_case in preshipments table
DO $$
BEGIN
  -- Only rename if preshipments table exists with camelCase field names
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preshipments') THEN
    
    -- Rename shipmentId to shipment_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'shipmentId') THEN
      ALTER TABLE "public"."preshipments" RENAME COLUMN "shipmentId" TO "shipment_id";
      RAISE NOTICE 'Renamed preshipments.shipmentId to shipment_id';
    END IF;
    
    -- Rename customerId to customer_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'customerId') THEN
      ALTER TABLE "public"."preshipments" RENAME COLUMN "customerId" TO "customer_id";
      RAISE NOTICE 'Renamed preshipments.customerId to customer_id';
    END IF;
    
    -- Rename entryNumber to entry_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'entryNumber') THEN
      ALTER TABLE "public"."preshipments" RENAME COLUMN "entryNumber" TO "entry_number";
      RAISE NOTICE 'Renamed preshipments.entryNumber to entry_number';
    END IF;

  END IF;
END
$$;

-- =========================================================================
-- UPDATE FOREIGN KEY CONSTRAINTS
-- =========================================================================

-- Update foreign key constraints after column renames
DO $$
BEGIN
  -- Update preadmissions foreign key constraints
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preadmissions') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    
    -- Drop old foreign key constraint (if exists)
    ALTER TABLE "public"."preadmissions" DROP CONSTRAINT IF EXISTS "preadmissions_customerid_fkey";
    
    -- Create new foreign key constraint with correct column name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'customer_id') THEN
      ALTER TABLE "public"."preadmissions" 
        ADD CONSTRAINT "preadmissions_customer_id_fkey" 
        FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
      RAISE NOTICE 'Updated preadmissions foreign key constraint to use customer_id';
    END IF;
  END IF;
  
  -- Update preshipments foreign key constraints  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preshipments') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    
    -- Drop old foreign key constraint (if exists)
    ALTER TABLE "public"."preshipments" DROP CONSTRAINT IF EXISTS "preshipments_customerid_fkey";
    
    -- Create new foreign key constraint with correct column name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'customer_id') THEN
      ALTER TABLE "public"."preshipments" 
        ADD CONSTRAINT "preshipments_customer_id_fkey" 
        FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
      RAISE NOTICE 'Updated preshipments foreign key constraint to use customer_id';
    END IF;
  END IF;
END
$$;

-- =========================================================================
-- UPDATE INDEXES  
-- =========================================================================

-- Update constraints and indexes to use snake_case column names
DO $$
BEGIN
  -- Update preadmissions constraints and indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preadmissions') THEN
    
    -- Drop old unique constraint (which automatically drops the underlying index)
    ALTER TABLE "public"."preadmissions" DROP CONSTRAINT IF EXISTS "preadmissions_admissionid_key";
    
    -- Drop other old indexes
    DROP INDEX IF EXISTS "idx_preadmissions_customer";
    
    -- Create new unique constraint with snake_case column name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'admission_id') THEN
      ALTER TABLE "public"."preadmissions" ADD CONSTRAINT "preadmissions_admission_id_key" UNIQUE ("admission_id");
      RAISE NOTICE 'Created unique constraint on preadmissions.admission_id';
    END IF;
    
    -- Create new index for customer_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'customer_id') THEN
      CREATE INDEX "idx_preadmissions_customer_id" ON "public"."preadmissions" USING btree ("customer_id");
      RAISE NOTICE 'Created index on preadmissions.customer_id';
    END IF;
    
  END IF;
  
  -- Update preshipments indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preshipments') THEN
    
    -- Drop old indexes  
    DROP INDEX IF EXISTS "idx_preshipments_customer";
    
    -- Create new indexes with snake_case column names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'customer_id') THEN
      CREATE INDEX "idx_preshipments_customer_id" ON "public"."preshipments" USING btree ("customer_id");
      RAISE NOTICE 'Created index on preshipments.customer_id';
    END IF;
    
  END IF;
END
$$;

-- =========================================================================
-- ADD COLUMN COMMENTS
-- =========================================================================

-- Add descriptive comments for renamed columns
DO $$
BEGIN
  -- Add comments for preadmissions columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preadmissions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'customer_id') THEN
      COMMENT ON COLUMN "public"."preadmissions"."customer_id" IS 'Foreign key reference to customers table';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'admission_id') THEN
      COMMENT ON COLUMN "public"."preadmissions"."admission_id" IS 'Unique admission identifier';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'entry_number') THEN
      COMMENT ON COLUMN "public"."preadmissions"."entry_number" IS 'CBP entry number for customs clearance';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preadmissions' AND column_name = 'arrival_date') THEN
      COMMENT ON COLUMN "public"."preadmissions"."arrival_date" IS 'Date of shipment arrival';
    END IF;
  END IF;
  
  -- Add comments for preshipments columns  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preshipments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'customer_id') THEN
      COMMENT ON COLUMN "public"."preshipments"."customer_id" IS 'Foreign key reference to customers table';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'shipment_id') THEN
      COMMENT ON COLUMN "public"."preshipments"."shipment_id" IS 'Unique shipment identifier';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preshipments' AND column_name = 'entry_number') THEN
      COMMENT ON COLUMN "public"."preshipments"."entry_number" IS 'CBP entry number for customs clearance';
    END IF;
  END IF;
END
$$;