-- ============================================================================
-- ADD ITEM CODE TO PURCHASE ORDER ITEMS
-- Adds item_code column to purchase_purchase_order_items table
-- Updates po_type default to CAPITAL
-- ============================================================================

-- Step 1: Add item_code column to purchase order items table
ALTER TABLE purchase_purchase_order_items
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(255);

-- Step 2: Update po_type default to CAPITAL (was OPERATIONAL)
ALTER TABLE purchase_purchase_order
  ALTER COLUMN po_type SET DEFAULT 'CAPITAL';

-- Step 3: Update existing records with NULL po_type to CAPITAL
UPDATE purchase_purchase_order
SET po_type = 'CAPITAL'
WHERE po_type IS NULL;

-- Step 4: Add index for item_code for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_code 
ON purchase_purchase_order_items(item_code);

-- Step 5: Add comments
COMMENT ON COLUMN purchase_purchase_order_items.item_code IS 'Item code for operational purchase orders (only when po_type is OPERATIONAL)';
COMMENT ON COLUMN purchase_purchase_order.po_type IS 'Purchase Order Type: CAPITAL or OPERATIONAL (default: CAPITAL)';

