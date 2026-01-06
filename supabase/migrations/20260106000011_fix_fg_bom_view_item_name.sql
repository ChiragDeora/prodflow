-- ============================================================================
-- FIX FG_BOM_WITH_VERSIONS VIEW TO ENSURE ITEM_NAME IS INCLUDED
-- ============================================================================
-- This migration ensures the fg_bom_with_versions view includes item_name
-- and is properly refreshed. It also handles the optional cbm column.
-- ============================================================================

-- First, ensure the cbm column exists in fg_bom table (if it doesn't, add it)
ALTER TABLE fg_bom 
ADD COLUMN IF NOT EXISTS cbm DECIMAL(10,4);

-- Drop the existing view
DROP VIEW IF EXISTS fg_bom_with_versions CASCADE;

-- Recreate the view with item_name and cbm always included
CREATE VIEW fg_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_code,
    COALESCE(b.item_name, '') as item_name,
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
    COALESCE(b.cbm, 0) as cbm,
    b.status,
    b.created_by,
    b.created_at,
    b.updated_at,
    COALESCE((SELECT MAX(version_number) FROM fg_bom_versions WHERE fg_bom_id = b.id), 0) as current_version,
    'FG' as category
FROM fg_bom b
ORDER BY b.sl_no;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the view includes item_name and cbm
DO $$
DECLARE
    has_item_name BOOLEAN;
    has_cbm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'fg_bom_with_versions' 
        AND column_name = 'item_name'
    ) INTO has_item_name;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'fg_bom_with_versions' 
        AND column_name = 'cbm'
    ) INTO has_cbm;
    
    IF has_item_name THEN
        RAISE NOTICE '✅ fg_bom_with_versions view includes item_name column';
    ELSE
        RAISE EXCEPTION '❌ fg_bom_with_versions view does NOT include item_name column';
    END IF;
    
    IF has_cbm THEN
        RAISE NOTICE '✅ fg_bom_with_versions view includes cbm column';
    ELSE
        RAISE EXCEPTION '❌ fg_bom_with_versions view does NOT include cbm column';
    END IF;
END $$;

-- Show sample data to verify item_name and cbm are being selected
SELECT 
    'Sample FG BOM data' as info,
    sl_no,
    item_code,
    item_name,
    party_name,
    cbm
FROM fg_bom_with_versions
ORDER BY sl_no
LIMIT 5;

