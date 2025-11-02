-- ============================================================================
-- POPULATE BOM MASTER TRIAL WITH SAMPLE SFG DATA
-- ============================================================================

-- First, let's see what data we currently have
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
    mb_percentage
FROM bom_master_trial 
LIMIT 5;

-- Update existing records to have some sample SFG data
UPDATE bom_master_trial 
SET 
    sl_no = 1,
    item_name = product_name,
    sfg_code = product_code,
    pcs = 100,
    part_weight_gm_pcs = 25.5,
    colour = 'Black',
    hp_percentage = 60.0,
    icp_percentage = 30.0,
    rcp_percentage = 10.0,
    ldpe_percentage = 0.0,
    gpps_percentage = 0.0,
    mb_percentage = 0.0
WHERE category = 'SFG' AND sl_no IS NULL;

-- Update FG records
UPDATE bom_master_trial 
SET 
    sl_no = 4,
    item_name = product_name,
    sfg_code = product_code,
    pcs = 50,
    part_weight_gm_pcs = 45.2,
    colour = 'White',
    hp_percentage = 40.0,
    icp_percentage = 50.0,
    rcp_percentage = 5.0,
    ldpe_percentage = 5.0,
    gpps_percentage = 0.0,
    mb_percentage = 0.0
WHERE category = 'FG' AND sl_no IS NULL;

-- Update LOCAL records
UPDATE bom_master_trial 
SET 
    sl_no = 6,
    item_name = product_name,
    sfg_code = product_code,
    pcs = 200,
    part_weight_gm_pcs = 15.8,
    colour = 'Blue',
    hp_percentage = 70.0,
    icp_percentage = 20.0,
    rcp_percentage = 5.0,
    ldpe_percentage = 0.0,
    gpps_percentage = 5.0,
    mb_percentage = 0.0
WHERE category = 'LOCAL' AND sl_no IS NULL;

-- Show the updated data
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
    mb_percentage
FROM bom_master_trial 
ORDER BY sl_no
LIMIT 10;

-- Show success message
SELECT 'Sample SFG data successfully populated in BOM Master Trial table' as status;
