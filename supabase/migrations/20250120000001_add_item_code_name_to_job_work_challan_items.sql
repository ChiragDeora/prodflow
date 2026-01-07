-- ============================================================================
-- ADD item_code AND item_name TO store_job_work_challan_items
-- ============================================================================
-- Adds item_code and item_name columns to link items to FG stock
-- Preserves existing material_description for backward compatibility
-- ============================================================================

-- Add item_code column (links to stock_items.item_code)
ALTER TABLE store_job_work_challan_items
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);

-- Add item_name column (replaces material_description in UI, but both are stored)
ALTER TABLE store_job_work_challan_items
  ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);

-- Create index on item_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_work_challan_items_item_code 
  ON store_job_work_challan_items(item_code);

-- Update comments
COMMENT ON COLUMN store_job_work_challan_items.item_code IS 'Item code linking to stock_items.item_code (FG stock)';
COMMENT ON COLUMN store_job_work_challan_items.item_name IS 'Item name (replaces material_description in UI)';
COMMENT ON COLUMN store_job_work_challan_items.material_description IS 'Material description (kept for backward compatibility)';

