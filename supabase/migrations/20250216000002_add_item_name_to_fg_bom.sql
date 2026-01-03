-- ============================================================================
-- ADD ITEM_NAME COLUMN TO FG_BOM TABLE
-- ============================================================================
-- This migration adds the item_name column to fg_bom table to support
-- descriptive item names (e.g., "RP-Ro10-Ex") in addition to item_code
-- ============================================================================

-- Add item_name column to fg_bom table
ALTER TABLE fg_bom 
ADD COLUMN IF NOT EXISTS item_name VARCHAR(200);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fg_bom_item_name ON fg_bom(item_name);

-- Update existing records: if item_name is empty and item_code is not numeric,
-- we could potentially derive item_name from item_code, but for now we'll leave it empty
-- Users can update via Excel import or manual entry

-- Verification query
SELECT 
    'fg_bom columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'fg_bom'
  AND column_name = 'item_name'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
    sl_no,
    item_code,
    item_name,
    party_name,
    pack_size
FROM fg_bom
ORDER BY sl_no
LIMIT 10;

-- ============================================================================
-- NOTES
-- ============================================================================
-- The item_name column is optional and can be populated via:
-- 1. Excel import (if "Item Name" column is present)
-- 2. Manual entry through the UI
-- 3. Programmatic updates
-- ============================================================================

