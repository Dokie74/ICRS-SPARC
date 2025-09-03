-- Migration: ALTER preadmissions table to add spreadsheet fields (SAFE APPROACH)
-- Purpose: Add missing fields from FTZ tracking spreadsheet while preserving existing data
-- Impact: Adds new columns to existing preadmissions table without affecting current functionality
-- Date: 2025-09-03
-- ROLLBACK: Execute corresponding rollback file to drop only the newly added columns

-- Add spreadsheet-specific fields that don't exist in current table
-- Note: Keeping existing camelCase fields (admissionId, customerId) for backward compatibility

-- 1. ZONE STATUS (maps to Status column: PF/NPF/D/ZR)
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS zone_status text 
CHECK (zone_status IN ('PF', 'NPF', 'D', 'ZR'));

-- 2. SUPPLIER INFORMATION (maps to Supplier2 column)
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS primary_supplier_name text;

-- 3. SHIPMENT IDENTIFICATION
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS shipment_lot_id text;

-- 4. BOL AND CONTAINER DETAILS
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS bol_date date;
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS seal_number text;

-- 5. FTZ SPECIFIC DATES
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS luc_ship_date date; -- LUC Ship Date

-- 6. FINANCIAL INFORMATION
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS bond_amount decimal(15,2) DEFAULT 0.00;

-- 7. INVOICE AND BILLING
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS freight_invoice_date date;
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS ship_invoice_number text;
ALTER TABLE preadmissions ADD COLUMN IF NOT EXISTS uscbp_master_billing text;

-- 8. ITEMS TABLE for Part ID and Quantity (maps to Part ID and # Pcs columns)
CREATE TABLE IF NOT EXISTS preadmission_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    preadmission_id uuid NOT NULL, -- Links to preadmissions.id (uuid primary key)
    
    -- Part Information (maps to Part ID and # Pcs columns from spreadsheet)
    part_id text NOT NULL, -- Maps to Part ID column
    variant_id uuid,
    quantity integer NOT NULL, -- Maps to # Pcs column
    
    -- Package Information
    package_quantity integer,
    package_type text,
    gross_weight decimal(10,2),
    
    -- Supplier and Origin
    supplier_id uuid,
    country_of_origin text,
    hts_code text,
    
    -- Audit trail
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Foreign key constraint
    CONSTRAINT fk_preadmission_items_preadmission 
        FOREIGN KEY (preadmission_id) 
        REFERENCES preadmissions(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_preadmissions_zone_status ON preadmissions(zone_status);
CREATE INDEX IF NOT EXISTS idx_preadmissions_primary_supplier ON preadmissions(primary_supplier_name);
CREATE INDEX IF NOT EXISTS idx_preadmissions_year ON preadmissions(year);
CREATE INDEX IF NOT EXISTS idx_preadmissions_shipment_lot_id ON preadmissions(shipment_lot_id);

-- Indexes for preadmission_items
CREATE INDEX IF NOT EXISTS idx_preadmission_items_preadmission_id ON preadmission_items(preadmission_id);
CREATE INDEX IF NOT EXISTS idx_preadmission_items_part_id ON preadmission_items(part_id);

-- Add comments to document the purpose of new fields
COMMENT ON COLUMN preadmissions.zone_status IS 'FTZ zone status from spreadsheet Status column (PF/NPF/D/ZR)';
COMMENT ON COLUMN preadmissions.primary_supplier_name IS 'Primary supplier from spreadsheet Supplier2 column';
COMMENT ON COLUMN preadmissions.year IS 'Year from spreadsheet Year column';
COMMENT ON COLUMN preadmissions.shipment_lot_id IS 'Shipment identifier from spreadsheet Shipment/Lot ID column';
COMMENT ON COLUMN preadmissions.bol_date IS 'Bill of Lading date from spreadsheet BOL Date column';
COMMENT ON COLUMN preadmissions.seal_number IS 'Container seal number from spreadsheet Seal # column';
COMMENT ON COLUMN preadmissions.luc_ship_date IS 'Last Use/Ship date from spreadsheet LUC Ship Date column';
COMMENT ON COLUMN preadmissions.bond_amount IS 'Bond amount from spreadsheet Bond column';
COMMENT ON COLUMN preadmissions.freight_invoice_date IS 'Freight invoice date from spreadsheet Freight Invoice Date column';
COMMENT ON COLUMN preadmissions.ship_invoice_number IS 'Ship invoice number from spreadsheet Ship Inv. column';
COMMENT ON COLUMN preadmissions.uscbp_master_billing IS 'USCBP Master Bill number from spreadsheet USCBP Master Bill # column';

-- Enable Row Level Security for preadmission_items if not already enabled
ALTER TABLE preadmission_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for preadmission_items (allow access if user has access to parent preadmission)
CREATE POLICY "Users can access preadmission items for their accessible preadmissions"
ON preadmission_items
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM preadmissions 
        WHERE preadmissions.id = preadmission_items.preadmission_id
        AND (
            auth.uid() IS NOT NULL  -- Authenticated users only
            -- Add additional RLS logic here if needed based on existing preadmissions RLS
        )
    )
);