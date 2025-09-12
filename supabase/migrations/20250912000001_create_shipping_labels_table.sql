-- Migration: Create shipping_labels table for outbound shipping label management
-- Date: 2025-01-10
-- Purpose: Support shipping label generation and tracking for preshipments

-- Create shipping_labels table
CREATE TABLE IF NOT EXISTS "public"."shipping_labels" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "shipment_id" text NOT NULL,
    "carrier" text NOT NULL,
    "service_type" text NOT NULL,
    "tracking_number" text NOT NULL,
    "ship_from" jsonb NOT NULL,
    "ship_to" jsonb NOT NULL,
    "package_info" jsonb NOT NULL,
    "items" jsonb NOT NULL,
    "label_format" text DEFAULT 'PDF',
    "label_url" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_by" uuid,
    CONSTRAINT "shipping_labels_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shipping_labels_tracking_number_key" UNIQUE ("tracking_number")
);

-- Set table ownership
ALTER TABLE "public"."shipping_labels" OWNER TO "postgres";

-- Add table comments
COMMENT ON TABLE "public"."shipping_labels" IS 'Stores shipping label information for outbound FTZ shipments';

-- Add column comments
COMMENT ON COLUMN "public"."shipping_labels"."shipment_id" IS 'Reference to preshipment ID';
COMMENT ON COLUMN "public"."shipping_labels"."carrier" IS 'Shipping carrier (UPS, FedEx, USPS, etc.)';
COMMENT ON COLUMN "public"."shipping_labels"."service_type" IS 'Shipping service level (STANDARD, EXPRESS, etc.)';
COMMENT ON COLUMN "public"."shipping_labels"."tracking_number" IS 'Unique tracking number for shipment';
COMMENT ON COLUMN "public"."shipping_labels"."ship_from" IS 'Origin address information as JSON';
COMMENT ON COLUMN "public"."shipping_labels"."ship_to" IS 'Destination address information as JSON';
COMMENT ON COLUMN "public"."shipping_labels"."package_info" IS 'Package dimensions and weight as JSON';
COMMENT ON COLUMN "public"."shipping_labels"."items" IS 'Detailed item information for customs as JSON';
COMMENT ON COLUMN "public"."shipping_labels"."label_format" IS 'Label file format (PDF, PNG, etc.)';
COMMENT ON COLUMN "public"."shipping_labels"."label_url" IS 'URL or path to generated label file';

-- Create indexes for performance
CREATE INDEX "idx_shipping_labels_shipment_id" ON "public"."shipping_labels" USING btree ("shipment_id");
CREATE INDEX "idx_shipping_labels_tracking_number" ON "public"."shipping_labels" USING btree ("tracking_number");
CREATE INDEX "idx_shipping_labels_carrier" ON "public"."shipping_labels" USING btree ("carrier");
CREATE INDEX "idx_shipping_labels_created_at" ON "public"."shipping_labels" USING btree ("created_at");

-- Add foreign key constraint to preshipments (if shipment_id should reference preshipments.id)
-- Note: Commenting out since preshipments table uses integer ID and this uses text shipment_id
-- ALTER TABLE "public"."shipping_labels" 
--   ADD CONSTRAINT "shipping_labels_shipment_id_fkey" 
--   FOREIGN KEY ("shipment_id") REFERENCES "public"."preshipments"("id");

-- Add foreign key constraint to employees for created_by (if employees table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    ALTER TABLE "public"."shipping_labels" 
      ADD CONSTRAINT "shipping_labels_created_by_fkey" 
      FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id");
  END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE "public"."shipping_labels" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (conditional on employees table existence)
DO $$
BEGIN
  -- Basic policies that don't depend on employees table
  EXECUTE 'CREATE POLICY "Enable access for authenticated users" ON "public"."shipping_labels" USING (auth.role() = ''authenticated'')';
  EXECUTE 'CREATE POLICY "shipping_labels_select_policy" ON "public"."shipping_labels" FOR SELECT USING (auth.role() = ''authenticated'')';
  
  -- Role-based policies only if employees table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    EXECUTE 'CREATE POLICY "shipping_labels_insert_policy" ON "public"."shipping_labels" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role IN (''manager'', ''admin'')))';
    EXECUTE 'CREATE POLICY "shipping_labels_update_policy" ON "public"."shipping_labels" FOR UPDATE USING (EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role IN (''manager'', ''admin'')))';
    EXECUTE 'CREATE POLICY "shipping_labels_delete_policy" ON "public"."shipping_labels" FOR DELETE USING (EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role = ''admin''))';
  ELSE
    -- Fallback policies without role checking
    EXECUTE 'CREATE POLICY "shipping_labels_insert_policy" ON "public"."shipping_labels" FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';
    EXECUTE 'CREATE POLICY "shipping_labels_update_policy" ON "public"."shipping_labels" FOR UPDATE USING (auth.role() = ''authenticated'')';
    EXECUTE 'CREATE POLICY "shipping_labels_delete_policy" ON "public"."shipping_labels" FOR DELETE USING (auth.role() = ''authenticated'')';
  END IF;
END
$$;