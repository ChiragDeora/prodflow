-- ============================================================================
-- RENAME BOM_MASTER_TRIAL TO SFG_BOM
-- ============================================================================

-- Rename the table from bom_master_trial to sfg_bom
ALTER TABLE bom_master_trial RENAME TO sfg_bom;

-- Rename constraints to match the new table name (only if they exist)
DO $$
BEGIN
    -- Rename constraints if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bom_master_trial_lineage_fk' AND table_name = 'sfg_bom') THEN
        ALTER TABLE sfg_bom RENAME CONSTRAINT bom_master_trial_lineage_fk TO sfg_bom_lineage_fk;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bom_master_trial_created_by_fk' AND table_name = 'sfg_bom') THEN
        ALTER TABLE sfg_bom RENAME CONSTRAINT bom_master_trial_created_by_fk TO sfg_bom_created_by_fk;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bom_master_trial_sl_no_unique' AND table_name = 'sfg_bom') THEN
        ALTER TABLE sfg_bom RENAME CONSTRAINT bom_master_trial_sl_no_unique TO sfg_bom_sl_no_unique;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bom_master_trial_sfg_code_unique' AND table_name = 'sfg_bom') THEN
        ALTER TABLE sfg_bom RENAME CONSTRAINT bom_master_trial_sfg_code_unique TO sfg_bom_sfg_code_unique;
    END IF;
END $$;

-- Rename indexes to match the new table name
ALTER INDEX IF EXISTS idx_bom_master_trial_sl_no RENAME TO idx_sfg_bom_sl_no;
ALTER INDEX IF EXISTS idx_bom_master_trial_sfg_code RENAME TO idx_sfg_bom_sfg_code;
ALTER INDEX IF EXISTS idx_bom_master_trial_status RENAME TO idx_sfg_bom_status;
ALTER INDEX IF EXISTS idx_bom_master_trial_created_by RENAME TO idx_sfg_bom_created_by;

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
