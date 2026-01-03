-- ============================================================================
-- ADD ITEM_NAME COLUMN TO LOCAL_BOM TABLE
-- ============================================================================
-- This migration adds the item_name column to local_bom table to support
-- descriptive item names in addition to item_code
-- ============================================================================

-- Add item_name column to local_bom table
ALTER TABLE local_bom 
ADD COLUMN IF NOT EXISTS item_name VARCHAR(200);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_local_bom_item_name ON local_bom(item_name);

-- Note: CBM column already exists in the table (as shown in the user's schema)
-- No need to add it

-- Verification query
SELECT 
    'local_bom columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'local_bom'
  AND column_name IN ('item_name', 'cbm')
ORDER BY ordinal_position;

-- Show sample data
SELECT 
    sl_no,
    item_code,
    item_name,
    pack_size,
    cbm
FROM local_bom
ORDER BY sl_no
LIMIT 10;

-- ============================================================================
-- NOTES
-- ============================================================================
-- The item_name column is optional and can be populated via:
-- 1. Excel import (if "Item Name" column is present)
-- 2. Manual entry through the UI
-- 3. Programmatic updates
--
-- The cbm (Cubic Meter) column already exists and will be populated from Excel
-- if "CBM" column is present in the import file.
-- ============================================================================

