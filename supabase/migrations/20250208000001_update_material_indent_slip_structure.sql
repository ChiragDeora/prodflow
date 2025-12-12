-- ============================================================================
-- UPDATE MATERIAL INDENT SLIP STRUCTURE
-- Changes the structure to match the new form layout with party details
-- and updated item fields
-- ============================================================================

-- Step 1: Add new columns to the main table
-- Note: ident_no is added with a default first, then we'll make it NOT NULL after dropping old columns
ALTER TABLE purchase_material_indent_slip
  ADD COLUMN IF NOT EXISTS ident_no VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gst_no VARCHAR(50);

-- Step 2: Rename indent_date to indent_date (keep as is, but ensure it exists)
-- The indent_date column already exists, so we'll keep it

-- Step 3: Update items table - add new columns
ALTER TABLE purchase_material_indent_slip_items
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dimension VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pack_size VARCHAR(100),
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color_remarks TEXT;

-- Step 4: Drop old unique constraint on doc_no if it exists
DROP INDEX IF EXISTS idx_material_indent_doc_no;

-- Step 5: Make ident_no unique (will be set to NOT NULL in Step 6a)
CREATE UNIQUE INDEX IF NOT EXISTS idx_material_indent_ident_no 
ON purchase_material_indent_slip(ident_no);

-- Step 6: Drop old columns from main table (no data exists, so safe to drop)
ALTER TABLE purchase_material_indent_slip
  DROP COLUMN IF EXISTS doc_no,
  DROP COLUMN IF EXISTS department_name,
  DROP COLUMN IF EXISTS person_name,
  DROP COLUMN IF EXISTS sr_no,
  DROP COLUMN IF EXISTS to_address,
  DROP COLUMN IF EXISTS purchase_store_incharge;

-- Step 6a: Make ident_no NOT NULL and remove default (safe since no data exists)
ALTER TABLE purchase_material_indent_slip
  ALTER COLUMN ident_no DROP DEFAULT,
  ALTER COLUMN ident_no SET NOT NULL;

-- Step 7: Drop old columns from items table (no data exists, so safe to drop)
ALTER TABLE purchase_material_indent_slip_items
  DROP COLUMN IF EXISTS description_specification,
  DROP COLUMN IF EXISTS make_mfg_remarks;

-- Step 8: Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_material_indent_party_name 
ON purchase_material_indent_slip(party_name);

CREATE INDEX IF NOT EXISTS idx_material_indent_gst_no 
ON purchase_material_indent_slip(gst_no);

CREATE INDEX IF NOT EXISTS idx_material_indent_items_item_code 
ON purchase_material_indent_slip_items(item_code);

CREATE INDEX IF NOT EXISTS idx_material_indent_items_party_name 
ON purchase_material_indent_slip_items(party_name);

-- Step 9: Update comments
COMMENT ON COLUMN purchase_material_indent_slip.ident_no IS 'Indent Number (replaces doc_no)';
COMMENT ON COLUMN purchase_material_indent_slip.party_name IS 'Party Name for the indent';
COMMENT ON COLUMN purchase_material_indent_slip.address IS 'Party Address';
COMMENT ON COLUMN purchase_material_indent_slip.state IS 'State where party is located';
COMMENT ON COLUMN purchase_material_indent_slip.gst_no IS 'GST Number of the party';
COMMENT ON COLUMN purchase_material_indent_slip_items.item_code IS 'Item Code';
COMMENT ON COLUMN purchase_material_indent_slip_items.item_name IS 'Item Name';
COMMENT ON COLUMN purchase_material_indent_slip_items.dimension IS 'Item Dimensions';
COMMENT ON COLUMN purchase_material_indent_slip_items.pack_size IS 'Pack Size';
COMMENT ON COLUMN purchase_material_indent_slip_items.party_name IS 'Party Name for this specific item';
COMMENT ON COLUMN purchase_material_indent_slip_items.color_remarks IS 'Color / Remarks';
