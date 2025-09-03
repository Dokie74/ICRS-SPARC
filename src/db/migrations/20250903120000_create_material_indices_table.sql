-- Migration: Create material_indices table for quarterly pricing
-- Created: 2025-09-03
-- Description: Stores material pricing data from Shanghai Steel Price Index (SHSPI)

CREATE TABLE IF NOT EXISTS public.material_indices (
    id SERIAL PRIMARY KEY,
    material VARCHAR(50) NOT NULL, -- aluminum, steel, stainless_steel
    price_date DATE NOT NULL,
    price_usd_per_mt DECIMAL(10,4) NOT NULL, -- Price in USD per metric ton
    index_source VARCHAR(20) DEFAULT 'SHSPI', -- Shanghai Steel Price Index
    data_period VARCHAR(50), -- e.g., "January 2025", "Q1 2025"
    fx_rate_cny_usd DECIMAL(8,6), -- Exchange rate CNY to USD
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.employees(id),
    
    -- Ensure unique material pricing per date
    UNIQUE(material, price_date, index_source)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_indices_material ON public.material_indices(material);
CREATE INDEX IF NOT EXISTS idx_material_indices_price_date ON public.material_indices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_material_indices_material_date ON public.material_indices(material, price_date DESC);

-- Add Row Level Security
ALTER TABLE public.material_indices ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read material indices
CREATE POLICY "material_indices_read_policy" ON public.material_indices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only admin users can insert/update material indices
CREATE POLICY "material_indices_write_policy" ON public.material_indices
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_material_indices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_material_indices_updated_at
    BEFORE UPDATE ON public.material_indices
    FOR EACH ROW
    EXECUTE FUNCTION update_material_indices_updated_at();

-- Comments
COMMENT ON TABLE public.material_indices IS 'Material pricing indices for quarterly pricing adjustments';
COMMENT ON COLUMN public.material_indices.material IS 'Material type: aluminum, steel, stainless_steel';
COMMENT ON COLUMN public.material_indices.price_usd_per_mt IS 'Price in USD per metric ton from SHSPI';
COMMENT ON COLUMN public.material_indices.index_source IS 'Data source identifier (SHSPI, LME, etc.)';
COMMENT ON COLUMN public.material_indices.data_period IS 'Human-readable period description';
COMMENT ON COLUMN public.material_indices.fx_rate_cny_usd IS 'CNY to USD exchange rate at time of data';