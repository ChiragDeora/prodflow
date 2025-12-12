-- ============================================================================
-- UPDATE PURCHASE ORDER STRUCTURE
-- Changes the structure to match the new form layout with party details
-- and comprehensive terms & conditions
-- ============================================================================

-- Step 1: Add new columns to the main table for party details
ALTER TABLE purchase_purchase_order
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gst_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ref_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_terms TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS packing_charges TEXT,
  ADD COLUMN IF NOT EXISTS warranty TEXT,
  ADD COLUMN IF NOT EXISTS other_terms TEXT;

-- Step 2: Migrate existing data (if any)
-- Copy to_address to address for existing records
UPDATE purchase_purchase_order
SET address = to_address
WHERE address IS NULL AND to_address IS NOT NULL;

-- Step 3: Set default delivery address
UPDATE purchase_purchase_order
SET delivery_address = 'Plot 32&33, Silver Industrial Estate, Village Bhimpore, Nani Daman - 396 210'
WHERE delivery_address IS NULL;

-- Step 4: Drop old columns from main table (no data exists, so safe to drop)
ALTER TABLE purchase_purchase_order
  DROP COLUMN IF EXISTS to_address;

-- Step 5: Add column for rate in items table (rename unit_price conceptually, but keep both for compatibility)
ALTER TABLE purchase_purchase_order_items
  ADD COLUMN IF NOT EXISTS rate DECIMAL(15, 2);

-- Step 6: Migrate unit_price to rate for existing items
UPDATE purchase_purchase_order_items
SET rate = unit_price
WHERE rate IS NULL AND unit_price IS NOT NULL;

-- Step 7: Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_purchase_order_party_name 
ON purchase_purchase_order(party_name);

CREATE INDEX IF NOT EXISTS idx_purchase_order_gst_no 
ON purchase_purchase_order(gst_no);

CREATE INDEX IF NOT EXISTS idx_purchase_order_ref_date 
ON purchase_purchase_order(ref_date);

-- Step 8: Update comments
COMMENT ON COLUMN purchase_purchase_order.party_name IS 'Party/Vendor Name';
COMMENT ON COLUMN purchase_purchase_order.address IS 'Party Address';
COMMENT ON COLUMN purchase_purchase_order.state IS 'State where party is located';
COMMENT ON COLUMN purchase_purchase_order.gst_no IS 'GST Number of the party';
COMMENT ON COLUMN purchase_purchase_order.ref_date IS 'Reference Date';
COMMENT ON COLUMN purchase_purchase_order.delivery_address IS 'Delivery Address';
COMMENT ON COLUMN purchase_purchase_order.delivery_terms IS 'Delivery Terms';
COMMENT ON COLUMN purchase_purchase_order.payment_terms IS 'Payment Terms';
COMMENT ON COLUMN purchase_purchase_order.packing_charges IS 'Packing Charges';
COMMENT ON COLUMN purchase_purchase_order.warranty IS 'Warranty Details';
COMMENT ON COLUMN purchase_purchase_order.other_terms IS 'Other Terms & Conditions';
COMMENT ON COLUMN purchase_purchase_order_items.rate IS 'Rate per unit (same as unit_price)';
