-- Migration: 20250829121500_enhance_search_computed_columns.sql
-- Purpose: Add full-text search capabilities and computed columns for enhanced performance
-- Impact: Enables advanced search functionality and optimized inventory quantity calculations
-- Rollback: 20250829121500_rollback_enhance_search_computed_columns.sql

-- Add full-text search capabilities for parts catalog
ALTER TABLE parts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_search 
  ON parts USING gin(search_vector);

-- Function to update parts search vector
CREATE OR REPLACE FUNCTION update_parts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.part_number, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.material, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.hts_code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.country_of_origin, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain search vector
DROP TRIGGER IF EXISTS parts_search_vector_update ON parts;
CREATE TRIGGER parts_search_vector_update
  BEFORE INSERT OR UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_parts_search_vector();

-- Update existing parts with search vectors
UPDATE parts SET search_vector = 
  setweight(to_tsvector('english', COALESCE(description, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(part_number, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(material, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(hts_code, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(country_of_origin, '')), 'C')
WHERE search_vector IS NULL;

-- Add computed quantity column for inventory lots
ALTER TABLE inventory_lots ADD COLUMN IF NOT EXISTS computed_current_quantity INTEGER;

-- Function to calculate lot quantity from transactions
CREATE OR REPLACE FUNCTION calculate_lot_quantity(lot_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  total_received INTEGER;
  total_shipped INTEGER;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END), 0)
  INTO total_received, total_shipped
  FROM transactions
  WHERE lot_id = lot_id_param;
  
  RETURN total_received - total_shipped;
END;
$$ LANGUAGE plpgsql;

-- Function to update computed quantity
CREATE OR REPLACE FUNCTION update_lot_computed_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the related inventory lot's computed quantity
  UPDATE inventory_lots 
  SET computed_current_quantity = calculate_lot_quantity(COALESCE(NEW.lot_id, OLD.lot_id))
  WHERE id = COALESCE(NEW.lot_id, OLD.lot_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain computed quantity when transactions change
DROP TRIGGER IF EXISTS transaction_update_computed_quantity ON transactions;
CREATE TRIGGER transaction_update_computed_quantity
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_lot_computed_quantity();

-- Update existing inventory lots with computed quantities
UPDATE inventory_lots 
SET computed_current_quantity = calculate_lot_quantity(id)
WHERE computed_current_quantity IS NULL;

-- Enhanced search function for inventory
CREATE OR REPLACE FUNCTION search_inventory(
  search_term TEXT DEFAULT NULL,
  customer_filter UUID DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  part_description TEXT,
  customer_name TEXT,
  current_quantity INTEGER,
  status TEXT,
  admission_date TIMESTAMPTZ,
  location_code TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    il.id,
    p.description,
    c.name,
    COALESCE(il.computed_current_quantity, il.current_quantity) as current_quantity,
    il.status,
    il.admission_date,
    sl.location_code,
    CASE 
      WHEN search_term IS NOT NULL THEN 
        ts_rank(p.search_vector, plainto_tsquery('english', search_term))
      ELSE 0.0
    END as rank
  FROM inventory_lots il
  JOIN parts p ON il.part_id = p.id
  JOIN customers c ON il.customer_id = c.id
  LEFT JOIN storage_locations sl ON il.storage_location_id = sl.id
  WHERE 
    il.active = true 
    AND NOT il.voided
    AND (search_term IS NULL OR p.search_vector @@ plainto_tsquery('english', search_term))
    AND (customer_filter IS NULL OR il.customer_id = customer_filter)
    AND (status_filter IS NULL OR il.status = status_filter)
    AND COALESCE(il.computed_current_quantity, il.current_quantity) > 0
  ORDER BY 
    CASE WHEN search_term IS NOT NULL THEN 
      ts_rank(p.search_vector, plainto_tsquery('english', search_term)) 
    END DESC NULLS LAST,
    il.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Enhanced inventory summary function
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH inventory_stats AS (
    SELECT 
      COUNT(*) as total_lots,
      COUNT(*) FILTER (WHERE status NOT IN ('Depleted', 'Voided') AND COALESCE(computed_current_quantity, current_quantity) > 0) as active_lots,
      SUM(COALESCE(computed_current_quantity, current_quantity)) as total_quantity,
      SUM(total_value) as total_value,
      COUNT(DISTINCT customer_id) as customers_with_inventory,
      COUNT(DISTINCT part_id) as parts_in_stock,
      AVG(COALESCE(computed_current_quantity, current_quantity)) as avg_lot_size
    FROM inventory_lots
    WHERE active = true AND NOT voided
  ),
  status_breakdown AS (
    SELECT 
      status,
      COUNT(*) as count,
      SUM(COALESCE(computed_current_quantity, current_quantity)) as total_qty
    FROM inventory_lots
    WHERE active = true AND NOT voided
    GROUP BY status
  )
  SELECT json_build_object(
    'total_lots', i.total_lots,
    'active_lots', i.active_lots,
    'total_quantity', i.total_quantity,
    'total_value', i.total_value,
    'customers_with_inventory', i.customers_with_inventory,
    'parts_in_stock', i.parts_in_stock,
    'average_lot_size', ROUND(i.avg_lot_size, 2),
    'by_status', json_object_agg(sb.status, json_build_object(
      'count', sb.count,
      'total_quantity', sb.total_qty
    )),
    'last_updated', NOW()
  ) INTO result
  FROM inventory_stats i
  CROSS JOIN status_breakdown sb
  GROUP BY i.total_lots, i.active_lots, i.total_quantity, i.total_value, 
           i.customers_with_inventory, i.parts_in_stock, i.avg_lot_size;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Batch quantity update function for performance
CREATE OR REPLACE FUNCTION batch_update_lot_quantities(
  lot_updates JSON
)
RETURNS JSON AS $$
DECLARE
  update_record RECORD;
  results JSON[] := '{}';
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  current_timestamp TIMESTAMPTZ := NOW();
BEGIN
  FOR update_record IN 
    SELECT * FROM json_to_recordset(lot_updates) AS x(
      lot_id TEXT, 
      new_quantity INTEGER, 
      reason TEXT,
      user_id UUID
    )
  LOOP
    BEGIN
      -- Update lot quantity
      UPDATE inventory_lots 
      SET 
        current_quantity = update_record.new_quantity,
        computed_current_quantity = update_record.new_quantity,
        updated_at = current_timestamp,
        updated_by = update_record.user_id
      WHERE id = update_record.lot_id AND active = true;
      
      -- Get the previous quantity for transaction record
      DECLARE
        old_qty INTEGER;
      BEGIN
        SELECT current_quantity INTO old_qty 
        FROM inventory_lots 
        WHERE id = update_record.lot_id;
        
        -- Add transaction record
        INSERT INTO transactions (lot_id, type, quantity, source_document_number, created_by, created_at)
        VALUES (
          update_record.lot_id,
          'Bulk Adjustment',
          update_record.new_quantity - COALESCE(old_qty, 0),
          update_record.reason,
          update_record.user_id,
          current_timestamp
        );
      END;
      
      success_count := success_count + 1;
      results := results || json_build_object(
        'lot_id', update_record.lot_id, 
        'status', 'success',
        'new_quantity', update_record.new_quantity
      );
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      results := results || json_build_object(
        'lot_id', update_record.lot_id, 
        'status', 'error', 
        'message', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'total_processed', success_count + error_count,
    'results', results,
    'processed_at', current_timestamp
  );
END;
$$ LANGUAGE plpgsql;

-- Data integrity validation function
CREATE OR REPLACE FUNCTION validate_inventory_integrity()
RETURNS TABLE(
  lot_id TEXT,
  calculated_quantity INTEGER,
  stored_quantity INTEGER,
  computed_quantity INTEGER,
  difference INTEGER,
  needs_correction BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    il.id,
    calculate_lot_quantity(il.id) as calc_qty,
    il.current_quantity as stored_qty,
    il.computed_current_quantity as comp_qty,
    (calculate_lot_quantity(il.id) - il.current_quantity) as diff,
    (calculate_lot_quantity(il.id) != il.current_quantity OR 
     calculate_lot_quantity(il.id) != COALESCE(il.computed_current_quantity, il.current_quantity)) as needs_correction
  FROM inventory_lots il
  WHERE il.active = true
  ORDER BY ABS(calculate_lot_quantity(il.id) - il.current_quantity) DESC;
END;
$$ LANGUAGE plpgsql;

-- Analyze updated tables
ANALYZE parts;
ANALYZE inventory_lots;
ANALYZE transactions;

-- Log migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  '20250829121500_enhance_search_computed_columns',
  NOW(),
  'Added full-text search capabilities and computed columns for enhanced performance'
);