-- ============================================================================
-- POPULATE SFG FIELDS WITH ACTUAL DATA
-- ============================================================================

-- Update all records to populate SFG fields with actual data
UPDATE bom_master_trial 
SET 
    sl_no = ROW_NUMBER() OVER (ORDER BY id),
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
WHERE sl_no IS NULL;

-- Verify the data was updated
SELECT 
    id,
    product_code,
    product_name,
    sl_no,
    item_name,
    sfg_code,
    pcs,
    part_weight_gm_pcs,
    colour,
    hp_percentage
FROM bom_master_trial 
ORDER BY id
LIMIT 5;
