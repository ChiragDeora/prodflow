-- ============================================================================
-- SIMPLE RENAME BOM_MASTER_TRIAL TO SFG_BOM
-- ============================================================================

-- First, let's see what constraints exist
SELECT 
    constraint_name, 
    constraint_type, 
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'bom_master_trial';

-- Rename the table from bom_master_trial to sfg_bom
ALTER TABLE bom_master_trial RENAME TO sfg_bom;

-- Drop the old view
DROP VIEW IF EXISTS bom_master_with_versions;

-- Create a new view for sfg_bom
CREATE VIEW sfg_bom_with_versions AS
SELECT 
    bm.*,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version
FROM sfg_bom bm
LEFT JOIN bom_versions_trial bv ON bm.id = bv.bom_master_id
GROUP BY bm.id, bm.bom_lineage_id, bm.sl_no, bm.item_name, bm.sfg_code, bm.pcs, 
         bm.part_weight_gm_pcs, bm.colour, bm.hp_percentage, bm.icp_percentage, 
         bm.rcp_percentage, bm.ldpe_percentage, bm.gpps_percentage, bm.mb_percentage,
         bm.status, bm.created_by, bm.created_at, bm.updated_at;

-- Verify the rename
SELECT 
    'SFG BOM Records' as table_name, 
    COUNT(*) as record_count 
FROM sfg_bom;

-- Show sample data
SELECT 
    id, sl_no, item_name, sfg_code, pcs, part_weight_gm_pcs, 
    colour, hp_percentage, icp_percentage, rcp_percentage
FROM sfg_bom 
ORDER BY sl_no
LIMIT 5;
