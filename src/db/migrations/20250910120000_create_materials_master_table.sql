-- Migration: Create materials master table
-- Created: 2025-09-10
-- Description: Creates proper materials master table separate from material_indices pricing table

-- Create materials master table
CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'steel', 'aluminum', 'copper'
    name VARCHAR(100) NOT NULL, -- e.g., 'Steel', 'Aluminum', 'Copper'
    category VARCHAR(50) NOT NULL, -- e.g., 'metal', 'polymer', 'ceramic'
    description TEXT,
    color VARCHAR(50), -- CSS classes for UI display
    icon VARCHAR(50), -- FontAwesome icon classes
    density DECIMAL(8,4), -- kg/m³ for weight calculations
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.employees(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_code ON public.materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON public.materials(is_active);

-- Add Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read materials
CREATE POLICY "materials_read_policy" ON public.materials
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only staff can insert/update materials
CREATE POLICY "materials_write_policy" ON public.materials
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_materials_updated_at
    BEFORE UPDATE ON public.materials
    FOR EACH ROW
    EXECUTE FUNCTION update_materials_updated_at();

-- Insert predefined materials from materialTypes.js
INSERT INTO public.materials (code, name, category, description, color, icon) VALUES
    ('steel', 'Steel', 'metal', 'Carbon steel and steel alloys', 'bg-gray-100 text-gray-800', 'fas fa-hammer'),
    ('aluminum', 'Aluminum', 'metal', 'Aluminum and aluminum alloys', 'bg-blue-100 text-blue-800', 'fas fa-cube'),
    ('copper', 'Copper', 'metal', 'Copper and copper alloys', 'bg-orange-100 text-orange-800', 'fas fa-circle'),
    ('brass', 'Brass', 'metal', 'Brass and brass alloys', 'bg-yellow-100 text-yellow-800', 'fas fa-circle'),
    ('plastic', 'Plastic', 'polymer', 'Plastic and polymer materials', 'bg-green-100 text-green-800', 'fas fa-shapes'),
    ('rubber', 'Rubber', 'polymer', 'Rubber and elastomeric materials', 'bg-purple-100 text-purple-800', 'fas fa-circle'),
    ('glass', 'Glass', 'ceramic', 'Glass and glass-ceramic materials', 'bg-indigo-100 text-indigo-800', 'fas fa-gem'),
    ('ceramic', 'Ceramic', 'ceramic', 'Ceramic and ceramic composite materials', 'bg-red-100 text-red-800', 'fas fa-shapes'),
    ('composite', 'Composite', 'composite', 'Composite and layered materials', 'bg-teal-100 text-teal-800', 'fas fa-layer-group'),
    ('wood', 'Wood', 'organic', 'Wood and wood-based materials', 'bg-amber-100 text-amber-800', 'fas fa-tree'),
    ('fabric', 'Fabric', 'textile', 'Fabric and textile materials', 'bg-pink-100 text-pink-800', 'fas fa-cut'),
    ('paper', 'Paper', 'organic', 'Paper and paper-based materials', 'bg-slate-100 text-slate-800', 'fas fa-file'),
    ('other', 'Other', 'misc', 'Other miscellaneous materials', 'bg-gray-100 text-gray-800', 'fas fa-question')
ON CONFLICT (code) DO NOTHING;

-- Comments
COMMENT ON TABLE public.materials IS 'Master table for material types used in parts and inventory';
COMMENT ON COLUMN public.materials.code IS 'Unique material code used in application (e.g., steel, aluminum)';
COMMENT ON COLUMN public.materials.name IS 'Display name for the material';
COMMENT ON COLUMN public.materials.category IS 'Material category (metal, polymer, ceramic, etc.)';
COMMENT ON COLUMN public.materials.color IS 'CSS classes for UI display colors';
COMMENT ON COLUMN public.materials.icon IS 'FontAwesome icon class for UI display';
COMMENT ON COLUMN public.materials.density IS 'Material density in kg/m³ for weight calculations';