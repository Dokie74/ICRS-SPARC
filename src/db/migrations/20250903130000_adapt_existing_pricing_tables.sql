-- Migration: Adapt existing pricing tables for quarterly pricing compatibility
-- Created: 2025-09-03
-- Description: Enhance existing tables and create missing part_pricing_history table

-- ========================================
-- 1. ADD MISSING COLUMNS TO pricing_adjustments
-- ========================================

-- Add columns that are missing from our implementation requirements
ALTER TABLE public.pricing_adjustments 
ADD COLUMN IF NOT EXISTS data_months JSONB,
ADD COLUMN IF NOT EXISTS communication_month VARCHAR(10),
ADD COLUMN IF NOT EXISTS effective_month VARCHAR(10),
ADD COLUMN IF NOT EXISTS old_average_price DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS parts_affected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_impact DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customers_affected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pricing_formula VARCHAR(50) DEFAULT '3_month_rolling',
ADD COLUMN IF NOT EXISTS formula_config JSONB,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add check constraints for new columns
ALTER TABLE public.pricing_adjustments 
ADD CONSTRAINT IF NOT EXISTS check_valid_status 
    CHECK (status IN ('draft', 'applied', 'cancelled'));

ALTER TABLE public.pricing_adjustments 
ADD CONSTRAINT IF NOT EXISTS check_valid_pricing_formula 
    CHECK (pricing_formula IN ('3_month_rolling', 'simple_average', 'quarterly_standard'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_pricing_adjustments_status_enhanced 
    ON public.pricing_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_pricing_adjustments_material_status_enhanced 
    ON public.pricing_adjustments(material, status);
CREATE INDEX IF NOT EXISTS idx_pricing_adjustments_effective_month 
    ON public.pricing_adjustments(effective_month);

-- ========================================
-- 2. CREATE MISSING part_pricing_history TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.part_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    adjustment_id INTEGER NOT NULL REFERENCES public.pricing_adjustments(id) ON DELETE CASCADE,
    
    -- Price information before and after adjustment
    old_material_price DECIMAL(10,4) NOT NULL,
    new_material_price DECIMAL(10,4) NOT NULL,
    old_total_price DECIMAL(10,4) NOT NULL,
    new_total_price DECIMAL(10,4) NOT NULL,
    
    -- Weight and rate information
    material_weight DECIMAL(8,4) NOT NULL,
    price_adjustment_per_kg DECIMAL(10,6) NOT NULL,
    
    -- Effective date
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.employees(id)
);

-- Create indexes for part_pricing_history
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_part_id 
    ON public.part_pricing_history(part_id);
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_adjustment_id 
    ON public.part_pricing_history(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_effective_date 
    ON public.part_pricing_history(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_part_pricing_history_part_effective 
    ON public.part_pricing_history(part_id, effective_date DESC);

-- ========================================
-- 3. ADD ROW LEVEL SECURITY TO NEW TABLE
-- ========================================

-- Enable RLS on part_pricing_history
ALTER TABLE public.part_pricing_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and manager users can read pricing history
CREATE POLICY "part_pricing_history_read_policy" ON public.part_pricing_history
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE (user_id = auth.uid() OR email = auth.email()) 
            AND role IN ('admin', 'manager')
        )
    );

-- Policy: Only admin users can insert pricing history (system-generated)
CREATE POLICY "part_pricing_history_write_policy" ON public.part_pricing_history
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE (user_id = auth.uid() OR email = auth.email()) 
            AND role = 'admin'
        )
    );

-- ========================================
-- 4. UPDATE EXISTING TRIGGERS AND FUNCTIONS
-- ========================================

-- Create or update trigger for pricing_adjustments updated_at
CREATE OR REPLACE TRIGGER trigger_pricing_adjustments_updated_at
    BEFORE UPDATE ON public.pricing_adjustments
    FOR EACH ROW EXECUTE FUNCTION update_pricing_adjustments_updated_at();

-- Add trigger for material_indices updated_at (if not exists)
CREATE OR REPLACE TRIGGER trigger_material_indices_updated_at
    BEFORE UPDATE ON public.material_indices
    FOR EACH ROW EXECUTE FUNCTION update_material_indices_updated_at();

-- ========================================
-- 5. DATA MIGRATION (if needed)
-- ========================================

-- Update existing pricing_adjustments to have proper status
UPDATE public.pricing_adjustments 
SET status = 'applied' 
WHERE status IS NULL AND applied_at IS NOT NULL;

UPDATE public.pricing_adjustments 
SET status = 'draft' 
WHERE status IS NULL;

-- Set default pricing_formula for existing records
UPDATE public.pricing_adjustments 
SET pricing_formula = '3_month_rolling'
WHERE pricing_formula IS NULL;

-- ========================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.part_pricing_history IS 
'Historical record of part price changes from quarterly pricing adjustments';

COMMENT ON COLUMN public.pricing_adjustments.data_months IS 
'JSON array of months used for calculation: ["2024-10", "2024-11", "2024-12"]';

COMMENT ON COLUMN public.pricing_adjustments.communication_month IS 
'Month when adjustment is communicated to customers';

COMMENT ON COLUMN public.pricing_adjustments.effective_month IS 
'Month when new pricing becomes effective';

COMMENT ON COLUMN public.pricing_adjustments.pricing_formula IS 
'Formula used for calculation: 3_month_rolling, simple_average, quarterly_standard';

COMMENT ON COLUMN public.pricing_adjustments.status IS 
'Status of adjustment: draft, applied, cancelled';

-- ========================================
-- Migration completed successfully
-- ========================================