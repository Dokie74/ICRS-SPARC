-- Migration: Create part_pricing_history table for quarterly pricing
-- Created: 2025-09-03
-- Description: Maintains historical record of part price changes from pricing adjustments

CREATE TABLE IF NOT EXISTS public.part_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    adjustment_id UUID NOT NULL REFERENCES public.pricing_adjustments(id) ON DELETE CASCADE,
    
    -- Price information before and after adjustment
    old_material_price DECIMAL(10,4) NOT NULL, -- Previous material cost
    new_material_price DECIMAL(10,4) NOT NULL, -- New material cost
    old_total_price DECIMAL(10,4) NOT NULL, -- Previous total part cost (standard_value)
    new_total_price DECIMAL(10,4) NOT NULL, -- New total part cost (standard_value)
    
    -- Weight and rate information
    material_weight DECIMAL(8,4) NOT NULL, -- Weight of material in the part (kg)
    price_adjustment_per_kg DECIMAL(10,6) NOT NULL, -- Price adjustment per kilogram
    
    -- Effective date
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.employees(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_part_id ON public.part_pricing_history(part_id);
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_adjustment_id ON public.part_pricing_history(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_effective_date ON public.part_pricing_history(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_part_effective ON public.part_pricing_history(part_id, effective_date DESC);

-- Add Row Level Security
ALTER TABLE public.part_pricing_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and manager users can read pricing history
CREATE POLICY "part_pricing_history_read_policy" ON public.part_pricing_history
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Policy: Only admin users can insert pricing history (system-generated)
CREATE POLICY "part_pricing_history_write_policy" ON public.part_pricing_history
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add check constraints
ALTER TABLE public.part_pricing_history
ADD CONSTRAINT check_positive_material_weight CHECK (material_weight > 0);

ALTER TABLE public.part_pricing_history
ADD CONSTRAINT check_positive_prices CHECK (
    old_material_price >= 0 AND 
    new_material_price >= 0 AND
    old_total_price >= 0 AND
    new_total_price >= 0
);

-- Create a function to calculate price impact percentage
CREATE OR REPLACE FUNCTION calculate_price_impact_percentage(
    old_price DECIMAL(10,4),
    new_price DECIMAL(10,4)
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF old_price = 0 THEN
        RETURN NULL;
    END IF;
    RETURN ROUND(((new_price - old_price) / old_price * 100), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view for easy pricing history analysis
CREATE OR REPLACE VIEW pricing_history_analysis AS
SELECT 
    h.id,
    h.part_id,
    p.description as part_description,
    p.material,
    h.adjustment_id,
    a.adjustment_name,
    h.old_material_price,
    h.new_material_price,
    h.old_total_price,
    h.new_total_price,
    h.material_weight,
    h.price_adjustment_per_kg,
    h.effective_date,
    
    -- Calculated fields
    (h.new_material_price - h.old_material_price) as material_price_change,
    (h.new_total_price - h.old_total_price) as total_price_change,
    calculate_price_impact_percentage(h.old_material_price, h.new_material_price) as material_price_change_percent,
    calculate_price_impact_percentage(h.old_total_price, h.new_total_price) as total_price_change_percent,
    
    h.created_at,
    e.name as created_by_name
FROM public.part_pricing_history h
JOIN public.parts p ON h.part_id = p.id
JOIN public.pricing_adjustments a ON h.adjustment_id = a.id
LEFT JOIN public.employees e ON h.created_by = e.id
ORDER BY h.effective_date DESC, h.created_at DESC;

-- Comments
COMMENT ON TABLE public.part_pricing_history IS 'Historical record of part price changes from quarterly pricing adjustments';
COMMENT ON COLUMN public.part_pricing_history.old_material_price IS 'Material cost before the adjustment';
COMMENT ON COLUMN public.part_pricing_history.new_material_price IS 'Material cost after the adjustment';
COMMENT ON COLUMN public.part_pricing_history.old_total_price IS 'Total part cost (standard_value) before adjustment';
COMMENT ON COLUMN public.part_pricing_history.new_total_price IS 'Total part cost (standard_value) after adjustment';
COMMENT ON COLUMN public.part_pricing_history.material_weight IS 'Weight of material in the part (kilograms)';
COMMENT ON COLUMN public.part_pricing_history.price_adjustment_per_kg IS 'Price adjustment per kilogram of material';
COMMENT ON VIEW pricing_history_analysis IS 'Analysis view showing pricing history with calculated percentage changes';

-- Grant permissions to the view
ALTER VIEW pricing_history_analysis OWNER TO postgres;
GRANT SELECT ON pricing_history_analysis TO authenticated;