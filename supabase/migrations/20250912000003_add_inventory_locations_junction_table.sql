-- Migration: Add inventory_locations junction table for distributed storage
-- This enables one lot to be stored across multiple physical locations
-- Business requirement: Optimize warehouse space by storing inventory anywhere with space

CREATE TABLE IF NOT EXISTS inventory_locations (
  id SERIAL PRIMARY KEY,
  lot_id TEXT NOT NULL,
  location_id INTEGER NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  placed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE inventory_locations 
ADD CONSTRAINT fk_inventory_locations_lot_id 
FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE CASCADE;

ALTER TABLE inventory_locations 
ADD CONSTRAINT fk_inventory_locations_location_id 
FOREIGN KEY (location_id) REFERENCES storage_locations(id) ON DELETE RESTRICT;

ALTER TABLE inventory_locations 
ADD CONSTRAINT fk_inventory_locations_placed_by 
FOREIGN KEY (placed_by) REFERENCES employees(id) ON DELETE SET NULL;

-- Add unique constraint to prevent duplicate lot+location combinations
ALTER TABLE inventory_locations 
ADD CONSTRAINT uk_inventory_locations_lot_location 
UNIQUE(lot_id, location_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_locations_lot_id 
ON inventory_locations(lot_id);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_location_id 
ON inventory_locations(location_id);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_placed_at 
ON inventory_locations(placed_at);

-- Create a partial index for quick lookup of active placements
CREATE INDEX IF NOT EXISTS idx_inventory_locations_active 
ON inventory_locations(lot_id, location_id) 
WHERE quantity > 0;

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_inventory_locations_updated_at
    BEFORE UPDATE ON inventory_locations
    FOR EACH ROW
    EXECUTE PROCEDURE update_inventory_locations_updated_at();

-- Populate with existing data from inventory_lots.storage_location_id
-- This ensures backwards compatibility
INSERT INTO inventory_locations (lot_id, location_id, quantity, placed_at, placed_by, notes, created_at)
SELECT
    il.id as lot_id,
    il.storage_location_id as location_id,
    il.quantity as quantity,
    il.created_at as placed_at,
    NULL as placed_by, -- Assuming no employee data is available for this migration
    'Migrated from inventory_lots.storage_location_id' as notes,
    il.created_at as created_at
FROM inventory_lots il
WHERE il.storage_location_id IS NOT NULL
ON CONFLICT (lot_id, location_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE inventory_locations IS 'Junction table to support distributed inventory storage. One lot can be split across multiple physical locations for space optimization.';
COMMENT ON COLUMN inventory_locations.lot_id IS 'Reference to the inventory lot';
COMMENT ON COLUMN inventory_locations.location_id IS 'Reference to the physical storage location';
COMMENT ON COLUMN inventory_locations.quantity IS 'How much of this lot is stored at this location';
COMMENT ON COLUMN inventory_locations.placed_at IS 'When this portion was placed at this location';
COMMENT ON COLUMN inventory_locations.placed_by IS 'Employee who placed the inventory at this location';