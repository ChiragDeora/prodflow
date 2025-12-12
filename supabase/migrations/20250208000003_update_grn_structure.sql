-- ============================================================================
-- UPDATE GRN (GOODS RECEIPT NOTE) STRUCTURE
-- Changes the structure to match the new form layout with party details
-- and comprehensive financial fields
-- ============================================================================

-- Step 1: Add new columns to the main table for party details
ALTER TABLE store_grn
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gst_no VARCHAR(50);

-- Step 2: Add financial columns
ALTER TABLE store_grn
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_others DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_percentage DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_percentage DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utgst_percentage DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_in_words TEXT;

-- Step 3: Migrate existing data (if any)
-- Copy supplier_name to party_name for existing records
UPDATE store_grn
SET party_name = supplier_name
WHERE party_name IS NULL AND supplier_name IS NOT NULL;

-- Step 4: Drop old columns from main table (no data exists, so safe to drop)
ALTER TABLE store_grn
  DROP COLUMN IF EXISTS supplier_name,
  DROP COLUMN IF EXISTS type_of_material,
  DROP COLUMN IF EXISTS received_by,
  DROP COLUMN IF EXISTS verified_by;

-- Step 5: Update items table - add new columns
ALTER TABLE store_grn_items
  ADD COLUMN IF NOT EXISTS po_qty DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS grn_qty DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS rate DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(15, 2);

-- Step 6: Migrate existing data in items table
-- Copy total_qty to grn_qty for existing items
UPDATE store_grn_items
SET grn_qty = total_qty
WHERE grn_qty IS NULL AND total_qty IS NOT NULL;

-- Step 7: Drop old columns from items table (no data exists, so safe to drop)
ALTER TABLE store_grn_items
  DROP COLUMN IF EXISTS box_bag,
  DROP COLUMN IF EXISTS per_box_bag_qty;

-- Step 8: Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_grn_party_name 
ON store_grn(party_name);

CREATE INDEX IF NOT EXISTS idx_grn_gst_no 
ON store_grn(gst_no);

-- Step 9: Update comments
COMMENT ON COLUMN store_grn.party_name IS 'Party/Vendor Name';
COMMENT ON COLUMN store_grn.address IS 'Party Address';
COMMENT ON COLUMN store_grn.state IS 'State where party is located';
COMMENT ON COLUMN store_grn.gst_no IS 'GST Number of the party';
COMMENT ON COLUMN store_grn.total_amount IS 'Total Amount before taxes';
COMMENT ON COLUMN store_grn.freight_others IS 'Freight & Other Charges';
COMMENT ON COLUMN store_grn.igst_percentage IS 'IGST Percentage';
COMMENT ON COLUMN store_grn.cgst_percentage IS 'CGST Percentage';
COMMENT ON COLUMN store_grn.utgst_percentage IS 'UTGST Percentage';
COMMENT ON COLUMN store_grn.round_off IS 'Round Off Amount';
COMMENT ON COLUMN store_grn.final_amount IS 'Final Amount after all calculations';
COMMENT ON COLUMN store_grn.amount_in_words IS 'Amount in Words';
COMMENT ON COLUMN store_grn_items.po_qty IS 'Purchase Order Quantity';
COMMENT ON COLUMN store_grn_items.grn_qty IS 'GRN Quantity (actual received)';
COMMENT ON COLUMN store_grn_items.rate IS 'Rate per unit';
COMMENT ON COLUMN store_grn_items.total_price IS 'Total Price (GRN Qty × Rate)';
