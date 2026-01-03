-- ============================================================================
-- UPDATE LOCAL_BOM_WITH_VERSIONS VIEW TO INCLUDE ITEM_NAME
-- ============================================================================
-- This migration updates the local_bom_with_versions view to include
-- the item_name column from the local_bom table
-- ============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS local_bom_with_versions;

-- Recreate the view with item_name column
CREATE VIEW local_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_code,
    b.item_name,  -- Added item_name column
    b.pack_size,
    b.sfg_1,
    b.sfg_1_qty,
    b.sfg_2,
    b.sfg_2_qty,
    b.cnt_code,
    b.cnt_qty,
    b.polybag_code,
    b.poly_qty,
    b.bopp_1,
    b.qty_meter,
    b.bopp_2,
    b.qty_meter_2,
    b.cbm,
    b.status,
    b.created_by,
    b.created_at,
    b.updated_at,
    COALESCE((SELECT MAX(version_number) FROM local_bom_versions WHERE local_bom_id = b.id), 0) as current_version,
    'LOCAL' as category
FROM local_bom b
ORDER BY b.sl_no;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the view includes item_name
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'local_bom_with_versions'
  AND column_name = 'item_name'
ORDER BY ordinal_position;

-- ============================================================================
-- NOTES
-- ============================================================================
-- The view now includes:
-- - item_name: Descriptive name for the item (from local_bom.item_name)
--
-- This column will be available when querying via the API's getByCategory('LOCAL')
-- ============================================================================
