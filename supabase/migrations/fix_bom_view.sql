-- ============================================================================
-- FIX BOM VIEW TO INCLUDE SFG FIELDS
-- ============================================================================

-- Drop and recreate the view to include all SFG fields
DROP VIEW IF EXISTS bom_master_with_versions;

CREATE VIEW bom_master_with_versions AS
SELECT 
    bm.*,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version
FROM bom_master_trial bm
LEFT JOIN bom_versions_trial bv ON bm.id = bv.bom_master_id
GROUP BY bm.id, bm.bom_lineage_id, bm.product_code, bm.product_name, bm.category, 
         bm.description, bm.status, bm.created_by, bm.created_at, bm.updated_at,
         bm.sl_no, bm.item_name, bm.sfg_code, bm.pcs, bm.part_weight_gm_pcs,
         bm.colour, bm.hp_percentage, bm.icp_percentage, bm.rcp_percentage,
         bm.ldpe_percentage, bm.gpps_percentage, bm.mb_percentage;

-- Test the view
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
    hp_percentage
FROM bom_master_with_versions 
ORDER BY id
LIMIT 3;
