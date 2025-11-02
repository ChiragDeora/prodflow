-- Update BOPP column names for consistency
-- Change bopp_1_2 to bopp_2 in all BOM tables

-- Update FG BOM table
ALTER TABLE fg_bom RENAME COLUMN bopp_1_2 TO bopp_2;

-- Update LOCAL BOM table  
ALTER TABLE local_bom RENAME COLUMN bopp_1_2 TO bopp_2;

-- Update FG BOM versions table
ALTER TABLE fg_bom_versions RENAME COLUMN bopp_1_2 TO bopp_2;

-- Update LOCAL BOM versions table
ALTER TABLE local_bom_versions RENAME COLUMN bopp_1_2 TO bopp_2;

-- Update the immutable views to reflect the new column names
-- Drop existing views first
DROP VIEW IF EXISTS fg_bom_with_versions;
DROP VIEW IF EXISTS local_bom_with_versions;

-- Recreate FG BOM view
CREATE VIEW fg_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_code,
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
    COALESCE(bv.version_number, 1) as version_number
FROM fg_bom b
LEFT JOIN fg_bom_versions bv ON b.id = bv.fg_bom_id;

-- Recreate LOCAL BOM view
CREATE VIEW local_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_code,
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
    COALESCE(bv.version_number, 1) as version_number
FROM local_bom b
LEFT JOIN local_bom_versions bv ON b.id = bv.local_bom_id;

-- Verify the changes
SELECT 'FG BOM columns:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fg_bom' AND column_name LIKE '%bopp%'
ORDER BY column_name;

SELECT 'LOCAL BOM columns:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'local_bom' AND column_name LIKE '%bopp%'
ORDER BY column_name;
