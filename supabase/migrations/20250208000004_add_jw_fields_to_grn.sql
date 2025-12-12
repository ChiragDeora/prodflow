-- ============================================================================
-- ADD JW-SPECIFIC FIELDS TO GRN TABLE
-- Adds fields needed for JW Annexure GRN (Job Work Annexure GRN)
-- ============================================================================

-- Step 1: Add JW-specific columns to the main GRN table
ALTER TABLE store_grn
  ADD COLUMN IF NOT EXISTS jw_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS jw_date DATE,
  ADD COLUMN IF NOT EXISTS challan_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS challan_date DATE;

-- Step 2: Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_grn_jw_no 
ON store_grn(jw_no);

CREATE INDEX IF NOT EXISTS idx_grn_challan_no 
ON store_grn(challan_no);

-- Step 3: Add JW-specific columns to items table
ALTER TABLE store_grn_items
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS indent_qty DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS rcd_qty DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS net_value DECIMAL(15, 2);

-- Step 4: Migrate existing data in items table
-- Copy grn_qty to rcd_qty for existing items
UPDATE store_grn_items
SET rcd_qty = grn_qty
WHERE rcd_qty IS NULL AND grn_qty IS NOT NULL;

-- Copy total_price to net_value for existing items
UPDATE store_grn_items
SET net_value = total_price
WHERE net_value IS NULL AND total_price IS NOT NULL;

-- Step 5: Update comments
COMMENT ON COLUMN store_grn.jw_no IS 'Job Work Number';
COMMENT ON COLUMN store_grn.jw_date IS 'Job Work Date';
COMMENT ON COLUMN store_grn.challan_no IS 'Challan Number';
COMMENT ON COLUMN store_grn.challan_date IS 'Challan Date';
COMMENT ON COLUMN store_grn_items.item_code IS 'Item Code';
COMMENT ON COLUMN store_grn_items.item_name IS 'Item Name';
COMMENT ON COLUMN store_grn_items.indent_qty IS 'Indent Quantity';
COMMENT ON COLUMN store_grn_items.rcd_qty IS 'Received Quantity';
COMMENT ON COLUMN store_grn_items.net_value IS 'Net Value (Rcd Qty × Rate)';
