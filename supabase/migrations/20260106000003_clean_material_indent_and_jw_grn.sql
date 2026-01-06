-- ============================================================================
-- CLEAN MATERIAL INDENT SLIP AND JW ANNEXURE GRN
-- Date: 2026-01-06
-- Purpose: Delete Material Indent Slips from 4th and 5th Jan, and JW Annexure GRN from 4th and 5th Jan
-- Note: Must delete JW Annexure GRN first as it references Material Indent Slips
-- ============================================================================

-- STEP 1: Delete JW Annexure GRN first (they reference Material Indent Slips)

-- 1. Delete JW Annexure GRN items from 4th Jan
-- Items are deleted via CASCADE when parent is deleted, but we'll delete explicitly first
DELETE FROM store_jw_annexure_grn_items
WHERE jw_annexure_grn_id IN (
    SELECT id FROM store_jw_annexure_grn 
    WHERE DATE(date) = '2026-01-04'
);

-- 2. Delete JW Annexure GRN headers from 4th Jan
DELETE FROM store_jw_annexure_grn
WHERE DATE(date) = '2026-01-04';

-- 3. Delete JW Annexure GRN items from 5th Jan
DELETE FROM store_jw_annexure_grn_items
WHERE jw_annexure_grn_id IN (
    SELECT id FROM store_jw_annexure_grn 
    WHERE DATE(date) = '2026-01-05'
);

-- 4. Delete JW Annexure GRN headers from 5th Jan
DELETE FROM store_jw_annexure_grn
WHERE DATE(date) = '2026-01-05';

-- STEP 2: Now delete Material Indent Slips (after JW GRN references are removed)

-- 5. Delete Material Indent Slip items from 4th Jan
-- Items are deleted via CASCADE when parent is deleted, but we'll delete explicitly first
DELETE FROM purchase_material_indent_slip_items
WHERE indent_slip_id IN (
    SELECT id FROM purchase_material_indent_slip 
    WHERE DATE(date) = '2026-01-04'
);

-- 6. Delete Material Indent Slip headers from 4th Jan
DELETE FROM purchase_material_indent_slip
WHERE DATE(date) = '2026-01-04';

-- 7. Delete Material Indent Slip items from 5th Jan
DELETE FROM purchase_material_indent_slip_items
WHERE indent_slip_id IN (
    SELECT id FROM purchase_material_indent_slip 
    WHERE DATE(date) = '2026-01-05'
);

-- 8. Delete Material Indent Slip headers from 5th Jan
DELETE FROM purchase_material_indent_slip
WHERE DATE(date) = '2026-01-05';

-- Verify deletions
SELECT 
    'Material Indent Slip (4th Jan)' as table_name, 
    COUNT(*) as remaining_count 
FROM purchase_material_indent_slip 
WHERE DATE(date) = '2026-01-04'
UNION ALL
SELECT 
    'Material Indent Slip (5th Jan)', 
    COUNT(*) 
FROM purchase_material_indent_slip 
WHERE DATE(date) = '2026-01-05'
UNION ALL
SELECT 
    'JW Annexure GRN (4th Jan)', 
    COUNT(*) 
FROM store_jw_annexure_grn 
WHERE DATE(date) = '2026-01-04'
UNION ALL
SELECT 
    'JW Annexure GRN (5th Jan)', 
    COUNT(*) 
FROM store_jw_annexure_grn 
WHERE DATE(date) = '2026-01-05';

