-- Migration: Create preshipments table
-- Purpose: Implement complete Pre-Shipments functionality matching original ICRS system
-- Impact: Creates preshipments table with ACE Entry Summary fields and driver signoff capabilities
-- Date: 2025-08-30
-- ROLLBACK: Execute corresponding rollback file to drop table and related objects

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create preshipments table with complete ACE Entry Summary support
CREATE TABLE IF NOT EXISTS preshipments (
    -- Primary identification
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipmentId text UNIQUE NOT NULL,
    type text NOT NULL CHECK (type IN ('7501 Consumption Entry', '7512 T&E Export')),
    customerId uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Items and entry information
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    entryNumber text,
    stage text NOT NULL DEFAULT 'Planning' CHECK (stage IN ('Planning', 'Picking', 'Packing', 'Loading', 'Ready to Ship', 'Shipped')),
    
    -- ACE Entry Summary Core Fields
    entry_summary_status text NOT NULL DEFAULT 'NOT_PREPARED' 
        CHECK (entry_summary_status IN ('NOT_PREPARED', 'DRAFT', 'READY_TO_FILE', 'FILED', 'ACCEPTED', 'REJECTED')),
    entry_summary_id uuid DEFAULT uuid_generate_v4(),
    filing_district_port text CHECK (filing_district_port ~ '^[A-Za-z0-9]{4}$'),
    entry_filer_code text CHECK (entry_filer_code ~ '^[A-Za-z0-9]{3}$'),
    importer_of_record_number text,
    date_of_importation date,
    foreign_trade_zone_id text,
    bill_of_lading_number text,
    voyage_flight_trip_number text,
    carrier_code text CHECK (carrier_code IS NULL OR carrier_code ~ '^[A-Z]{4}$'),
    importing_conveyance_name text,
    
    -- Manufacturer and Seller Information
    manufacturer_name text,
    manufacturer_address text,
    seller_name text,
    seller_address text,
    
    -- Bond and Entry Type Information
    bond_type_code text,
    surety_company_code text,
    consolidated_entry boolean DEFAULT false,
    weekly_entry boolean DEFAULT false,
    zone_week_ending_date date,
    
    -- Processing and Compliance
    requires_pga_review boolean DEFAULT false,
    compliance_notes text,
    estimated_total_value decimal(15,2) DEFAULT 0.00,
    estimated_duty_amount decimal(15,2) DEFAULT 0.00,
    
    -- Driver/Transport Information
    driver_name text,
    driver_license_number text,
    license_plate_number text,
    carrier_name text,
    signature_data jsonb,
    shipped_at timestamp with time zone,
    requested_ship_date date,
    tracking_number text,
    
    -- Workflow and Priority
    priority text DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    notes text,
    
    -- Audit trail
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_preshipments_shipment_id ON preshipments(shipmentId);
CREATE INDEX IF NOT EXISTS idx_preshipments_customer_id ON preshipments(customerId);
CREATE INDEX IF NOT EXISTS idx_preshipments_stage ON preshipments(stage);
CREATE INDEX IF NOT EXISTS idx_preshipments_type ON preshipments(type);
CREATE INDEX IF NOT EXISTS idx_preshipments_entry_summary_status ON preshipments(entry_summary_status);
CREATE INDEX IF NOT EXISTS idx_preshipments_requested_ship_date ON preshipments(requested_ship_date);
CREATE INDEX IF NOT EXISTS idx_preshipments_created_at ON preshipments(created_at);
CREATE INDEX IF NOT EXISTS idx_preshipments_entry_number ON preshipments(entryNumber) WHERE entryNumber IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preshipments_tracking_number ON preshipments(tracking_number) WHERE tracking_number IS NOT NULL;

-- Create GIN index for JSONB items column for efficient querying
CREATE INDEX IF NOT EXISTS idx_preshipments_items_gin ON preshipments USING gin(items);

-- Enable Row Level Security (RLS)
ALTER TABLE preshipments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to maintain data security
-- Policy: Users can view preshipments for their organization
CREATE POLICY "Users can view organization preshipments" ON preshipments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers c 
            WHERE c.id = preshipments.customerId 
            AND auth.uid() IN (SELECT user_id FROM user_customer_access WHERE customer_id = c.id)
        )
        OR 
        auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'manager'))
    );

-- Policy: Staff and managers can insert preshipments
CREATE POLICY "Staff can create preshipments" ON preshipments
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('staff', 'manager', 'admin'))
    );

-- Policy: Staff and managers can update preshipments
CREATE POLICY "Staff can update preshipments" ON preshipments
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('staff', 'manager', 'admin'))
    );

-- Policy: Only managers and admins can delete preshipments
CREATE POLICY "Managers can delete preshipments" ON preshipments
    FOR DELETE USING (
        auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('manager', 'admin'))
    );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_preshipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_preshipments_updated_at
    BEFORE UPDATE ON preshipments
    FOR EACH ROW
    EXECUTE FUNCTION update_preshipments_updated_at();

-- Create function to validate ACE Entry Summary data
CREATE OR REPLACE FUNCTION validate_ace_entry_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Filing District Port validation (4 alphanumeric characters)
    IF NEW.filing_district_port IS NOT NULL AND NEW.filing_district_port !~ '^[A-Za-z0-9]{4}$' THEN
        RAISE EXCEPTION 'Filing District Port must be exactly 4 alphanumeric characters';
    END IF;
    
    -- Entry Filer Code validation (3 alphanumeric characters)
    IF NEW.entry_filer_code IS NOT NULL AND NEW.entry_filer_code !~ '^[A-Za-z0-9]{3}$' THEN
        RAISE EXCEPTION 'Entry Filer Code must be exactly 3 alphanumeric characters';
    END IF;
    
    -- Carrier Code validation (4 letters for SCAC format)
    IF NEW.carrier_code IS NOT NULL AND NEW.carrier_code !~ '^[A-Z]{4}$' THEN
        RAISE EXCEPTION 'Carrier Code must be exactly 4 uppercase letters (SCAC format)';
    END IF;
    
    -- Weekly entry validation
    IF NEW.weekly_entry = true AND NEW.zone_week_ending_date IS NULL THEN
        RAISE EXCEPTION 'Zone week ending date is required for weekly entries';
    END IF;
    
    -- Entry Summary status transitions
    IF OLD.entry_summary_status IS NOT NULL AND OLD.entry_summary_status = 'FILED' AND 
       NEW.entry_summary_status NOT IN ('ACCEPTED', 'REJECTED') THEN
        RAISE EXCEPTION 'Filed entry summaries can only transition to ACCEPTED or REJECTED status';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_ace_entry_summary
    BEFORE INSERT OR UPDATE ON preshipments
    FOR EACH ROW
    EXECUTE FUNCTION validate_ace_entry_summary();

-- Create function to validate shipment finalization
CREATE OR REPLACE FUNCTION validate_shipment_finalization()
RETURNS TRIGGER AS $$
BEGIN
    -- Require driver information when stage is set to 'Shipped'
    IF NEW.stage = 'Shipped' AND (
        NEW.driver_name IS NULL OR NEW.driver_name = '' OR
        NEW.driver_license_number IS NULL OR NEW.driver_license_number = '' OR
        NEW.license_plate_number IS NULL OR NEW.license_plate_number = ''
    ) THEN
        RAISE EXCEPTION 'Driver name, license number, and license plate are required when marking shipment as shipped';
    END IF;
    
    -- Set shipped_at timestamp when stage changes to 'Shipped'
    IF NEW.stage = 'Shipped' AND (OLD.stage IS NULL OR OLD.stage != 'Shipped') THEN
        NEW.shipped_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_shipment_finalization
    BEFORE INSERT OR UPDATE ON preshipments
    FOR EACH ROW
    EXECUTE FUNCTION validate_shipment_finalization();

-- Create view for preshipment statistics
CREATE OR REPLACE VIEW preshipment_statistics AS
SELECT 
    COUNT(*) as total_preshipments,
    COUNT(CASE WHEN stage = 'Planning' THEN 1 END) as planning_count,
    COUNT(CASE WHEN stage = 'Picking' THEN 1 END) as picking_count,
    COUNT(CASE WHEN stage = 'Packing' THEN 1 END) as packing_count,
    COUNT(CASE WHEN stage = 'Loading' THEN 1 END) as loading_count,
    COUNT(CASE WHEN stage = 'Ready to Ship' THEN 1 END) as ready_to_ship_count,
    COUNT(CASE WHEN stage = 'Shipped' THEN 1 END) as shipped_count,
    COUNT(CASE WHEN entry_summary_status = 'NOT_PREPARED' THEN 1 END) as not_prepared_count,
    COUNT(CASE WHEN entry_summary_status = 'DRAFT' THEN 1 END) as draft_count,
    COUNT(CASE WHEN entry_summary_status = 'READY_TO_FILE' THEN 1 END) as ready_to_file_count,
    COUNT(CASE WHEN entry_summary_status = 'FILED' THEN 1 END) as filed_count,
    COUNT(CASE WHEN entry_summary_status = 'ACCEPTED' THEN 1 END) as accepted_count,
    COUNT(CASE WHEN entry_summary_status = 'REJECTED' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN type = '7501 Consumption Entry' THEN 1 END) as consumption_entry_count,
    COUNT(CASE WHEN type = '7512 T&E Export' THEN 1 END) as te_export_count,
    AVG(estimated_total_value) as avg_estimated_value,
    SUM(estimated_total_value) as total_estimated_value,
    AVG(estimated_duty_amount) as avg_estimated_duty,
    SUM(estimated_duty_amount) as total_estimated_duty
FROM preshipments;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON preshipments TO authenticated;
GRANT SELECT ON preshipment_statistics TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE preshipments IS 'Pre-shipment management for FTZ operations with complete ACE Entry Summary support';
COMMENT ON COLUMN preshipments.shipmentId IS 'Unique identifier for shipment tracking';
COMMENT ON COLUMN preshipments.type IS 'Entry type: 7501 Consumption Entry or 7512 T&E Export';
COMMENT ON COLUMN preshipments.items IS 'JSONB array of shipment items with lot, qty, part details';
COMMENT ON COLUMN preshipments.entry_summary_status IS 'ACE Entry Summary processing status';
COMMENT ON COLUMN preshipments.filing_district_port IS '4-character alphanumeric district/port code';
COMMENT ON COLUMN preshipments.entry_filer_code IS '3-character alphanumeric filer identification';
COMMENT ON COLUMN preshipments.carrier_code IS '4-letter SCAC (Standard Carrier Alpha Code)';
COMMENT ON COLUMN preshipments.stage IS 'Current processing stage of the shipment';
COMMENT ON COLUMN preshipments.signature_data IS 'Digital signature information for driver sign-off';
COMMENT ON VIEW preshipment_statistics IS 'Real-time statistics for preshipment dashboard';