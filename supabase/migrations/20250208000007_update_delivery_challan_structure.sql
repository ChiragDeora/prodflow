-- ============================================================================
-- UPDATE DELIVERY CHALLAN STRUCTURE
-- Changes the structure to match the new form layout with party details
-- and comprehensive item fields
-- ============================================================================

-- Step 1: Add new columns to the main table for party details
ALTER TABLE dispatch_delivery_challan
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS gst_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dc_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dc_date DATE,
  ADD COLUMN IF NOT EXISTS po_no VARCHAR(100);

-- Step 2: Migrate existing data (if any)
-- Copy sr_no to dc_no for existing records
UPDATE dispatch_delivery_challan
SET dc_no = sr_no
WHERE dc_no IS NULL AND sr_no IS NOT NULL;

-- Copy date to dc_date for existing records
UPDATE dispatch_delivery_challan
SET dc_date = date
WHERE dc_date IS NULL AND date IS NOT NULL;

-- Copy to_address to address for existing records
UPDATE dispatch_delivery_challan
SET address = to_address
WHERE address IS NULL AND to_address IS NOT NULL;

-- Step 3: Update items table - add new columns
ALTER TABLE dispatch_delivery_challan_items
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS item_description VARCHAR(255),
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pack_size VARCHAR(100),
  ADD COLUMN IF NOT EXISTS box_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS no_of_pcs DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS value DECIMAL(15, 2);

-- Step 4: Migrate existing data in items table
-- Copy material_description to item_description for existing items
UPDATE dispatch_delivery_challan_items
SET item_description = material_description
WHERE item_description IS NULL AND material_description IS NOT NULL;

-- Copy qty to no_of_pcs for existing items
UPDATE dispatch_delivery_challan_items
SET no_of_pcs = qty
WHERE no_of_pcs IS NULL AND qty IS NOT NULL;

-- Step 5: Drop old columns from main table (no data exists, so safe to drop)
ALTER TABLE dispatch_delivery_challan
  DROP COLUMN IF EXISTS sr_no,
  DROP COLUMN IF EXISTS to_address,
  DROP COLUMN IF EXISTS total_qty,
  DROP COLUMN IF EXISTS received_by,
  DROP COLUMN IF EXISTS prepared_by,
  DROP COLUMN IF EXISTS checked_by,
  DROP COLUMN IF EXISTS authorized_signatory;

-- Step 6: Drop old columns from items table (no data exists, so safe to drop)
ALTER TABLE dispatch_delivery_challan_items
  DROP COLUMN IF EXISTS material_description,
  DROP COLUMN IF EXISTS qty,
  DROP COLUMN IF EXISTS remarks;

-- Step 7: Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_delivery_challan_dc_no 
ON dispatch_delivery_challan(dc_no);

CREATE INDEX IF NOT EXISTS idx_delivery_challan_party_name 
ON dispatch_delivery_challan(party_name);

CREATE INDEX IF NOT EXISTS idx_delivery_challan_gst_no 
ON dispatch_delivery_challan(gst_no);

CREATE INDEX IF NOT EXISTS idx_delivery_challan_po_no 
ON dispatch_delivery_challan(po_no);

CREATE INDEX IF NOT EXISTS idx_delivery_challan_items_item_code 
ON dispatch_delivery_challan_items(item_code);

CREATE INDEX IF NOT EXISTS idx_delivery_challan_items_hsn_code 
ON dispatch_delivery_challan_items(hsn_code);

-- Step 8: Update comments
COMMENT ON COLUMN dispatch_delivery_challan.party_name IS 'Party/Vendor Name';
COMMENT ON COLUMN dispatch_delivery_challan.address IS 'Party Address';
COMMENT ON COLUMN dispatch_delivery_challan.gst_no IS 'GST Number of the party';
COMMENT ON COLUMN dispatch_delivery_challan.dc_no IS 'Delivery Challan Number';
COMMENT ON COLUMN dispatch_delivery_challan.dc_date IS 'Delivery Challan Date';
COMMENT ON COLUMN dispatch_delivery_challan.po_no IS 'Purchase Order Number';
COMMENT ON COLUMN dispatch_delivery_challan_items.item_code IS 'Item Code';
COMMENT ON COLUMN dispatch_delivery_challan_items.item_description IS 'Item Description';
COMMENT ON COLUMN dispatch_delivery_challan_items.hsn_code IS 'HSN Code';
COMMENT ON COLUMN dispatch_delivery_challan_items.pack_size IS 'Pack Size';
COMMENT ON COLUMN dispatch_delivery_challan_items.box_no IS 'Box Number';
COMMENT ON COLUMN dispatch_delivery_challan_items.no_of_pcs IS 'Number of Pieces';
COMMENT ON COLUMN dispatch_delivery_challan_items.value IS 'Value';
