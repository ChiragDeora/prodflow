-- ============================================================================
-- TEST BOM DATA - Check what's actually in the database
-- ============================================================================

-- Check the view that the API uses
SELECT 
    id,
    product_code,
    product_name,
    category,
    sl_no,
    item_name,
    sfg_code,
    pcs,
    part_weight_gm_pcs,
    colour,
    hp_percentage,
    icp_percentage,
    rcp_percentage,
    ldpe_percentage,
    gpps_percentage,
    mb_percentage,
    total_versions,
    latest_version,
    active_version
FROM bom_master_with_versions 
ORDER BY id
LIMIT 3;

-- Check if the SFG fields exist in the table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bom_master_trial' 
AND column_name IN ('sl_no', 'item_name', 'sfg_code', 'pcs', 'part_weight_gm_pcs', 'colour', 'hp_percentage', 'icp_percentage', 'rcp_percentage', 'ldpe_percentage', 'gpps_percentage', 'mb_percentage')
ORDER BY column_name;
