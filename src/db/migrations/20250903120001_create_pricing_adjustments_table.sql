-- Migration: Create pricing_adjustments table for quarterly pricing
-- Created: 2025-09-03
-- Description: Tracks quarterly pricing adjustments and their application status

CREATE TABLE IF NOT EXISTS public.pricing_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_name VARCHAR(100) NOT NULL, -- e.g., "Q1 2025 Aluminum Price Adjustment"
    material VARCHAR(50) NOT NULL, -- aluminum, steel, stainless_steel
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Timeline information
    data_months JSONB NOT NULL, -- Array of months used for calculation: ["2024-10", "2024-11", "2024-12"]
    communication_month VARCHAR(10), -- Month when adjustment is communicated: "2025-01"
    effective_month VARCHAR(10), -- Month when pricing becomes effective: "2025-02"
    
    -- Pricing information
    old_average_price DECIMAL(10,4), -- Previous 3-month average price per MT
    new_average_price DECIMAL(10,4) NOT NULL, -- New 3-month average price per MT
    price_change_usd DECIMAL(10,4), -- Absolute price change per MT
    price_change_percent DECIMAL(5,2), -- Percentage change
    
    -- Impact information
    parts_affected INTEGER DEFAULT 0, -- Number of parts updated
    total_cost_impact DECIMAL(15,4) DEFAULT 0, -- Total cost impact in USD
    customers_affected INTEGER DEFAULT 0, -- Number of customers affected
    
    -- Formula configuration
    pricing_formula VARCHAR(50) DEFAULT '3_month_rolling', -- Formula used for calculation
    formula_config JSONB, -- Configuration for the formula
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft', -- draft, applied, cancelled
    applied_at TIMESTAMPTZ, -- When the adjustment was applied
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.employees(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_adjustments_material ON public.pricing_adjustments(material);
CREATE INDEX IF NOT EXISTS idx_pricing_adjustments_status ON public.pricing_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_pricing_adjustments_date ON public.pricing_adjustments(adjustment_date DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_adjustments_material_status ON public.pricing_adjustments(material, status);

-- Add Row Level Security
ALTER TABLE public.pricing_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and manager users can read all pricing adjustments
CREATE POLICY "pricing_adjustments_read_policy" ON public.pricing_adjustments
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Policy: Only admin users can insert/update pricing adjustments
CREATE POLICY "pricing_adjustments_write_policy" ON public.pricing_adjustments
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_pricing_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pricing_adjustments_updated_at
    BEFORE UPDATE ON public.pricing_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_adjustments_updated_at();

-- Add constraint to ensure valid status values
ALTER TABLE public.pricing_adjustments
ADD CONSTRAINT check_valid_status CHECK (status IN ('draft', 'applied', 'cancelled'));

-- Add constraint to ensure pricing formula is valid
ALTER TABLE public.pricing_adjustments
ADD CONSTRAINT check_valid_formula CHECK (pricing_formula IN ('3_month_rolling', 'simple_average'));

-- Comments
COMMENT ON TABLE public.pricing_adjustments IS 'Quarterly pricing adjustments for material costs';
COMMENT ON COLUMN public.pricing_adjustments.adjustment_name IS 'Descriptive name for the pricing adjustment';
COMMENT ON COLUMN public.pricing_adjustments.data_months IS 'JSON array of months used for price calculation';
COMMENT ON COLUMN public.pricing_adjustments.communication_month IS 'Month when adjustment is communicated to customers';
COMMENT ON COLUMN public.pricing_adjustments.effective_month IS 'Month when new pricing becomes effective';
COMMENT ON COLUMN public.pricing_adjustments.pricing_formula IS 'Formula used: 3_month_rolling or simple_average';
COMMENT ON COLUMN public.pricing_adjustments.status IS 'Status: draft, applied, or cancelled';
COMMENT ON COLUMN public.pricing_adjustments.total_cost_impact IS 'Total cost impact across all affected parts';