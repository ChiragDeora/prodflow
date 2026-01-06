-- ============================================================================
-- FIX LOCAL_BOM_WITH_VERSIONS VIEW TO ENSURE ALL COLUMNS ARE INCLUDED
-- ============================================================================
-- This migration ensures the local_bom_with_versions view includes:
-- - item_name
-- - bopp_1, bopp_2
-- - qty_meter, qty_meter_2
-- - cbm
-- ============================================================================

-- First, ensure the cbm column exists in local_bom table (if it doesn't, add it)
ALTER TABLE local_bom 
ADD COLUMN IF NOT EXISTS cbm DECIMAL(10,4);

-- Ensure item_name column exists
ALTER TABLE local_bom 
ADD COLUMN IF NOT EXISTS item_name VARCHAR(200);

-- Drop the existing view
DROP VIEW IF EXISTS local_bom_with_versions CASCADE;

-- Recreate the view with all columns explicitly included
CREATE VIEW local_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_code,
    COALESCE(b.item_name, '') as item_name,
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
    COALESCE((SELECT MAX(version_number) FROM local_bom_versions WHERE local_bom_id = b.id), 0) as current_version,
    'LOCAL' as category
FROM local_bom b
ORDER BY b.sl_no;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the view includes all required columns
DO $$
DECLARE
    has_item_name BOOLEAN;
    has_bopp_1 BOOLEAN;
    has_bopp_2 BOOLEAN;
    has_qty_meter BOOLEAN;
    has_qty_meter_2 BOOLEAN;
    has_cbm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'local_bom_with_versions' 
        AND column_name = 'item_name'
    ) INTO has_item_name;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'local_bom_with_versions' 
        AND column_name = 'bopp_1'
    ) INTO has_bopp_1;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'local_bom_with_versions' 
        AND column_name = 'bopp_2'
    ) INTO has_bopp_2;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'local_bom_with_versions' 
        AND column_name = 'qty_meter'
    ) INTO has_qty_meter;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'local_bom_with_versions' 
        AND column_name = 'qty_meter_2'
    ) INTO has_qty_meter_2;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'local_bom_with_versions' 
        AND column_name = 'cbm'
    ) INTO has_cbm;
    
    IF has_item_name THEN
        RAISE NOTICE '✅ local_bom_with_versions view includes item_name column';
    ELSE
        RAISE EXCEPTION '❌ local_bom_with_versions view does NOT include item_name column';
    END IF;
    
    IF has_bopp_1 THEN
        RAISE NOTICE '✅ local_bom_with_versions view includes bopp_1 column';
    ELSE
        RAISE EXCEPTION '❌ local_bom_with_versions view does NOT include bopp_1 column';
    END IF;
    
    IF has_bopp_2 THEN
        RAISE NOTICE '✅ local_bom_with_versions view includes bopp_2 column';
    ELSE
        RAISE EXCEPTION '❌ local_bom_with_versions view does NOT include bopp_2 column';
    END IF;
    
    IF has_qty_meter THEN
        RAISE NOTICE '✅ local_bom_with_versions view includes qty_meter column';
    ELSE
        RAISE EXCEPTION '❌ local_bom_with_versions view does NOT include qty_meter column';
    END IF;
    
    IF has_qty_meter_2 THEN
        RAISE NOTICE '✅ local_bom_with_versions view includes qty_meter_2 column';
    ELSE
        RAISE EXCEPTION '❌ local_bom_with_versions view does NOT include qty_meter_2 column';
    END IF;
    
    IF has_cbm THEN
        RAISE NOTICE '✅ local_bom_with_versions view includes cbm column';
    ELSE
        RAISE EXCEPTION '❌ local_bom_with_versions view does NOT include cbm column';
    END IF;
END $$;

-- Show sample data to verify all columns are being selected
SELECT 
    'Sample LOCAL BOM data' as info,
    sl_no,
    item_code,
    item_name,
    bopp_1,
    qty_meter,
    bopp_2,
    qty_meter_2,
    cbm
FROM local_bom_with_versions
ORDER BY sl_no
LIMIT 5;

