-- ============================================================================
-- ADD SPARE PARTS SUPPORT TO STOCK LEDGER SYSTEM
-- ============================================================================
-- This migration adds support for spare parts / maintenance items:
-- 1. Adds new columns to stock_items table for spare parts management
-- 2. Updates the item_type constraint to include 'SPARE'
-- 3. Creates indexes for new columns
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD NEW COLUMNS TO STOCK_ITEMS TABLE
-- ============================================================================

-- Add for_machine column (which machine this spare is used in)
ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS for_machine VARCHAR(50);

-- Add for_mold column (which mold this spare is used in)
ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS for_mold VARCHAR(50);

-- Add min_stock_level column (for low stock alerts)
ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(15,3) DEFAULT 0;

-- Add reorder_qty column (suggested reorder quantity)
ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS reorder_qty DECIMAL(15,3) DEFAULT 0;

-- ============================================================================
-- SECTION 2: UPDATE ITEM_TYPE CHECK CONSTRAINT
-- ============================================================================

-- Drop the existing CHECK constraint on item_type
ALTER TABLE stock_items
  DROP CONSTRAINT IF EXISTS stock_items_item_type_check;

-- Add new CHECK constraint that includes 'SPARE'
ALTER TABLE stock_items
  ADD CONSTRAINT stock_items_item_type_check 
  CHECK (item_type IN ('RM', 'PM', 'SFG', 'FG', 'SPARE'));

-- ============================================================================
-- SECTION 3: UPDATE UNIT_OF_MEASURE CHECK CONSTRAINT
-- ============================================================================

-- Drop the existing CHECK constraint on unit_of_measure
ALTER TABLE stock_items
  DROP CONSTRAINT IF EXISTS stock_items_unit_of_measure_check;

-- Add new CHECK constraint with more units for spare parts
ALTER TABLE stock_items
  ADD CONSTRAINT stock_items_unit_of_measure_check 
  CHECK (unit_of_measure IN ('KG', 'NOS', 'METERS', 'PCS', 'LTR', 'MTR', 'SET'));

-- ============================================================================
-- SECTION 4: CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Index for filtering by category (useful for spare parts categories)
CREATE INDEX IF NOT EXISTS idx_stock_items_category_type ON stock_items(category, item_type);

-- Index for filtering spares by machine
CREATE INDEX IF NOT EXISTS idx_stock_items_for_machine ON stock_items(for_machine) WHERE for_machine IS NOT NULL;

-- Index for filtering spares by mold
CREATE INDEX IF NOT EXISTS idx_stock_items_for_mold ON stock_items(for_mold) WHERE for_mold IS NOT NULL;

-- Index for low stock alerts (items below min_stock_level)
CREATE INDEX IF NOT EXISTS idx_stock_items_min_stock ON stock_items(min_stock_level) WHERE min_stock_level > 0;

-- ============================================================================
-- SECTION 5: CREATE VIEW FOR SPARE PARTS WITH STOCK
-- ============================================================================

-- Drop existing view if it exists (for idempotency)
DROP VIEW IF EXISTS spare_parts_with_stock;

-- Create view for spare parts with current stock levels
CREATE VIEW spare_parts_with_stock AS
SELECT 
  si.id,
  si.item_code,
  si.item_name,
  si.item_type,
  si.category,
  si.sub_category,
  si.for_machine,
  si.for_mold,
  si.unit_of_measure,
  si.min_stock_level,
  si.reorder_qty,
  si.is_active,
  si.created_at,
  si.updated_at,
  COALESCE(sb_store.current_balance, 0) AS store_balance,
  COALESCE(sb_prod.current_balance, 0) AS production_balance,
  COALESCE(sb_store.current_balance, 0) + COALESCE(sb_prod.current_balance, 0) AS total_balance,
  CASE 
    WHEN si.min_stock_level > 0 AND (COALESCE(sb_store.current_balance, 0) + COALESCE(sb_prod.current_balance, 0)) < si.min_stock_level 
    THEN TRUE 
    ELSE FALSE 
  END AS is_low_stock
FROM stock_items si
LEFT JOIN stock_balances sb_store ON si.item_code = sb_store.item_code AND sb_store.location_code = 'STORE'
LEFT JOIN stock_balances sb_prod ON si.item_code = sb_prod.item_code AND sb_prod.location_code = 'PRODUCTION'
WHERE si.item_type = 'SPARE' AND si.is_active = TRUE
ORDER BY si.category, si.item_name;

-- ============================================================================
-- SECTION 6: CREATE FUNCTION TO GENERATE SPARE PART CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_spare_part_code(p_category VARCHAR(50))
RETURNS VARCHAR(50) AS $$
DECLARE
  v_category_short VARCHAR(3);
  v_sequence INTEGER;
  v_code VARCHAR(50);
BEGIN
  -- Get first 3 characters of category (uppercase)
  v_category_short := UPPER(LEFT(p_category, 3));
  
  -- Get next sequence number for this category
  SELECT COALESCE(MAX(
    CASE 
      WHEN item_code ~ ('^SPARE-' || v_category_short || '-[0-9]{3}$')
      THEN CAST(SUBSTRING(item_code FROM '[0-9]{3}$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO v_sequence
  FROM stock_items
  WHERE item_type = 'SPARE'
    AND item_code LIKE 'SPARE-' || v_category_short || '-%';
  
  -- Generate code: SPARE-{CATEGORY_3_CHARS}-{SEQUENCE_3_DIGITS}
  v_code := 'SPARE-' || v_category_short || '-' || LPAD(v_sequence::VARCHAR, 3, '0');
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 7: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN stock_items.category IS 'For SPARE: BEARING, SEAL, ELECTRICAL, etc. For RM: PP, MB, etc.';
COMMENT ON COLUMN stock_items.sub_category IS 'For SPARE: sub-category like BALL_BEARING. For RM: HP, ICP, etc.';
COMMENT ON COLUMN stock_items.for_machine IS 'For SPARE: Which machine this spare part is used in (optional)';
COMMENT ON COLUMN stock_items.for_mold IS 'For SPARE: Which mold this spare part is used in (optional)';
COMMENT ON COLUMN stock_items.min_stock_level IS 'Minimum stock level for low stock alerts (default 0 = no alert)';
COMMENT ON COLUMN stock_items.reorder_qty IS 'Suggested reorder quantity when stock is low (default 0)';
COMMENT ON VIEW spare_parts_with_stock IS 'View showing all spare parts with their current stock levels and low stock status';
COMMENT ON FUNCTION generate_spare_part_code IS 'Generates unique spare part code: SPARE-{CATEGORY_3_CHARS}-{SEQUENCE}';

-- ============================================================================
-- END OF SPARE PARTS SUPPORT MIGRATION
-- ============================================================================

