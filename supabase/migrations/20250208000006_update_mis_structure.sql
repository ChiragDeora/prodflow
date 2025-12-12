-- ============================================================================
-- UPDATE MATERIAL ISSUE SLIP (MIS) STRUCTURE
-- Adds item_code field to match the new form layout
-- ============================================================================

-- Step 1: Add item_code column to MIS items table
ALTER TABLE store_mis_items
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);

-- Step 2: Add index for item_code
CREATE INDEX IF NOT EXISTS idx_mis_items_item_code 
ON store_mis_items(item_code);

-- Step 3: Update comments
COMMENT ON COLUMN store_mis_items.item_code IS 'Item Code';
