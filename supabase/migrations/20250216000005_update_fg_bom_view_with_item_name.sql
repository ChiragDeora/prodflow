-- ============================================================================
-- UPDATE FG_BOM_WITH_VERSIONS VIEW TO INCLUDE ITEM_NAME AND CBM
-- ============================================================================
-- This migration updates the fg_bom_with_versions view to include
-- the item_name and cbm columns from the fg_bom table
-- ============================================================================

-- First, ensure the cbm column exists in fg_bom table
ALTER TABLE fg_bom 
ADD COLUMN IF NOT EXISTS cbm DECIMAL(10,4);

-- Drop the existing view
DROP VIEW IF EXISTS fg_bom_with_versions;

-- Create a function to recreate the view with proper column handling
CREATE OR REPLACE FUNCTION recreate_fg_bom_view()
RETURNS void AS $$
DECLARE
    cbm_exists BOOLEAN;
    view_sql TEXT;
BEGIN
    -- Check if cbm column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'fg_bom' 
        AND column_name = 'cbm'
    ) INTO cbm_exists;
    
    -- Build view SQL based on whether cbm exists
    IF cbm_exists THEN
        view_sql := 'CREATE VIEW fg_bom_with_versions AS
        SELECT 
            b.id,
            b.sl_no,
            b.item_code,
            b.item_name,
            b.party_name,
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
            COALESCE((SELECT MAX(version_number) FROM fg_bom_versions WHERE fg_bom_id = b.id), 0) as current_version,
            ''FG'' as category
        FROM fg_bom b
        ORDER BY b.sl_no;';
    ELSE
        view_sql := 'CREATE VIEW fg_bom_with_versions AS
        SELECT 
            b.id,
            b.sl_no,
            b.item_code,
            b.item_name,
            b.party_name,
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
            b.status,
            b.created_by,
            b.created_at,
            b.updated_at,
            COALESCE((SELECT MAX(version_number) FROM fg_bom_versions WHERE fg_bom_id = b.id), 0) as current_version,
            ''FG'' as category
        FROM fg_bom b
        ORDER BY b.sl_no;';
    END IF;
    
    EXECUTE view_sql;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create the view
SELECT recreate_fg_bom_view();

-- Drop the temporary function
DROP FUNCTION IF EXISTS recreate_fg_bom_view();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the view includes item_name and cbm
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'fg_bom_with_versions'
  AND column_name IN ('item_name', 'cbm')
ORDER BY ordinal_position;

-- ============================================================================
-- NOTES
-- ============================================================================
-- The view now includes:
-- - item_name: Descriptive name for the item (from fg_bom.item_name)
-- - cbm: Cubic meter value (from fg_bom.cbm) - if the column exists
--
-- These columns will be available when querying via the API's getByCategory('FG')
-- ============================================================================
