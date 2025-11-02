-- Check FG BOM data to see decimal values
-- This will show how the data is actually stored in the database

-- FG BOM has these quantity fields
SELECT 
    id,
    sl_no,
    item_code,
    party_name,
    sfg_1_qty,
    sfg_2_qty,
    cnt_qty,
    poly_qty,
    qty_meter,
    qty_meter_2
FROM fg_bom 
ORDER BY sl_no 
LIMIT 5;

-- Check data types of FG BOM quantity columns
SELECT 
    'FG BOM' as table_info,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'fg_bom' 
  AND column_name IN ('qty_meter', 'qty_meter_2')
ORDER BY column_name;

-- SFG BOM has different fields (no sfg_1_qty, cnt_qty, etc.)
SELECT 
    id,
    sl_no,
    item_name,
    sfg_code,
    pcs,
    part_weight_gm_pcs,
    hp_percentage,
    icp_percentage,
    rcp_percentage,
    ldpe_percentage,
    gpps_percentage,
    mb_percentage
FROM sfg_bom 
ORDER BY sl_no 
LIMIT 5;

-- Check data types of SFG BOM numeric columns
SELECT 
    'SFG BOM' as table_info,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'sfg_bom' 
  AND column_name IN ('pcs', 'part_weight_gm_pcs', 'hp_percentage', 'icp_percentage', 'rcp_percentage', 'ldpe_percentage', 'gpps_percentage', 'mb_percentage')
ORDER BY column_name;
