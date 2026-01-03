-- ============================================================================
-- FIX SFG BOM ITEM NAMES - Clear item_name when it matches sfg_code or is numeric
-- ============================================================================
-- This script fixes existing data where item_name contains codes instead of descriptive names
-- ============================================================================

-- Step 1: Update records where item_name equals sfg_code
-- ============================================================================
UPDATE sfg_bom
SET item_name = ''
WHERE item_name = sfg_code
  AND item_name IS NOT NULL
  AND sfg_code IS NOT NULL;

-- Step 2: Update records where item_name looks like a numeric code (9+ digits)
-- ============================================================================
UPDATE sfg_bom
SET item_name = ''
WHERE item_name ~ '^\d{9,}$'  -- Matches strings that are all digits, 9+ characters
  AND item_name IS NOT NULL;

-- Step 3: Verify the changes
-- ============================================================================
SELECT 
    'Total records' as metric,
    COUNT(*) as count
FROM sfg_bom

UNION ALL

SELECT 
    'Records with item_name = sfg_code' as metric,
    COUNT(*) as count
FROM sfg_bom
WHERE item_name = sfg_code
  AND item_name IS NOT NULL
  AND sfg_code IS NOT NULL

UNION ALL

SELECT 
    'Records with numeric item_name (9+ digits)' as metric,
    COUNT(*) as count
FROM sfg_bom
WHERE item_name ~ '^\d{9,}$'
  AND item_name IS NOT NULL

UNION ALL

SELECT 
    'Records with empty item_name' as metric,
    COUNT(*) as count
FROM sfg_bom
WHERE item_name = '' OR item_name IS NULL

UNION ALL

SELECT 
    'Records with valid item_name' as metric,
    COUNT(*) as count
FROM sfg_bom
WHERE item_name IS NOT NULL
  AND item_name != ''
  AND item_name != sfg_code
  AND NOT (item_name ~ '^\d{9,}$');

-- Step 4: Show sample of fixed records
-- ============================================================================
SELECT 
    sl_no,
    item_name,
    sfg_code,
    CASE 
        WHEN item_name = '' THEN 'CLEARED (was code)'
        WHEN item_name = sfg_code THEN 'NEEDS FIX (still matches code)'
        WHEN item_name ~ '^\d{9,}$' THEN 'NEEDS FIX (still numeric)'
        ELSE 'OK'
    END as status
FROM sfg_bom
ORDER BY sl_no
LIMIT 20;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this script:
-- 1. Records with item_name matching sfg_code will have item_name set to empty
-- 2. Records with numeric codes (9+ digits) in item_name will have item_name set to empty
-- 3. You can then manually update item_name with proper descriptive names, or
-- 4. Re-import the Excel file with correct Item Name values
-- ============================================================================

