-- Temporary SQL file to apply pricing table adaptations

-- Add missing columns to pricing_adjustments
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

-- Create missing part_pricing_history table
CREATE TABLE IF NOT EXISTS public.part_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL,
    adjustment_id INTEGER NOT NULL,
    old_material_price DECIMAL(10,4) NOT NULL,
    new_material_price DECIMAL(10,4) NOT NULL,
    old_total_price DECIMAL(10,4) NOT NULL,
    new_total_price DECIMAL(10,4) NOT NULL,
    material_weight DECIMAL(8,4) NOT NULL,
    price_adjustment_per_kg DECIMAL(10,6) NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Enable RLS on part_pricing_history
ALTER TABLE public.part_pricing_history ENABLE ROW LEVEL SECURITY;

-- Create access policy
CREATE POLICY "Enable access for authenticated users" ON "public"."part_pricing_history" USING (("auth"."role"() = 'authenticated'::"text"));

-- Update existing data
UPDATE public.pricing_adjustments SET status = 'applied' WHERE status IS NULL AND applied_at IS NOT NULL;
UPDATE public.pricing_adjustments SET status = 'draft' WHERE status IS NULL;
UPDATE public.pricing_adjustments SET pricing_formula = '3_month_rolling' WHERE pricing_formula IS NULL;