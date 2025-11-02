-- ============================================================================
-- RENAME ALL BOM_ TABLES TO SFG_BOM_ PREFIX
-- ============================================================================

-- First, let's see what bom_ tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE 'bom_%' 
AND table_schema = 'public'
ORDER BY table_name;

-- Rename bom_versions_trial to sfg_bom_versions_trial
ALTER TABLE bom_versions_trial RENAME TO sfg_bom_versions_trial;

-- Rename bom_components_trial to sfg_bom_components_trial
ALTER TABLE bom_components_trial RENAME TO sfg_bom_components_trial;

-- Rename bom_audit_trial to sfg_bom_audit_trial
ALTER TABLE bom_audit_trial RENAME TO sfg_bom_audit_trial;

-- Rename bom_lineage to sfg_bom_lineage
ALTER TABLE bom_lineage RENAME TO sfg_bom_lineage;

-- Update foreign key constraints in sfg_bom table
DO $$
BEGIN
    -- Update bom_lineage_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%lineage_fk%' 
        AND table_name = 'sfg_bom'
    ) THEN
        ALTER TABLE sfg_bom DROP CONSTRAINT IF EXISTS sfg_bom_lineage_fk;
        ALTER TABLE sfg_bom ADD CONSTRAINT sfg_bom_lineage_fk 
            FOREIGN KEY (bom_lineage_id) REFERENCES sfg_bom_lineage(id);
    END IF;
END $$;

-- Update foreign key constraints in sfg_bom_versions_trial
DO $$
BEGIN
    -- Update bom_master_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%master_id%' 
        AND table_name = 'sfg_bom_versions_trial'
    ) THEN
        ALTER TABLE sfg_bom_versions_trial DROP CONSTRAINT IF EXISTS bom_versions_trial_bom_master_id_fkey;
        ALTER TABLE sfg_bom_versions_trial ADD CONSTRAINT sfg_bom_versions_trial_sfg_bom_id_fkey 
            FOREIGN KEY (bom_master_id) REFERENCES sfg_bom(id);
    END IF;
    
    -- Update bom_lineage_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%lineage%' 
        AND table_name = 'sfg_bom_versions_trial'
    ) THEN
        ALTER TABLE sfg_bom_versions_trial DROP CONSTRAINT IF EXISTS bom_versions_trial_bom_lineage_id_fkey;
        ALTER TABLE sfg_bom_versions_trial ADD CONSTRAINT sfg_bom_versions_trial_lineage_fk 
            FOREIGN KEY (bom_lineage_id) REFERENCES sfg_bom_lineage(id);
    END IF;
END $$;

-- Update foreign key constraints in sfg_bom_components_trial
DO $$
BEGIN
    -- Update bom_version_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%version_id%' 
        AND table_name = 'sfg_bom_components_trial'
    ) THEN
        ALTER TABLE sfg_bom_components_trial DROP CONSTRAINT IF EXISTS bom_components_trial_bom_version_id_fkey;
        ALTER TABLE sfg_bom_components_trial ADD CONSTRAINT sfg_bom_components_trial_version_fk 
            FOREIGN KEY (bom_version_id) REFERENCES sfg_bom_versions_trial(id);
    END IF;
END $$;

-- Update foreign key constraints in sfg_bom_audit_trial
DO $$
BEGIN
    -- Update bom_master_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%master_id%' 
        AND table_name = 'sfg_bom_audit_trial'
    ) THEN
        ALTER TABLE sfg_bom_audit_trial DROP CONSTRAINT IF EXISTS bom_audit_trial_bom_master_id_fkey;
        ALTER TABLE sfg_bom_audit_trial ADD CONSTRAINT sfg_bom_audit_trial_sfg_bom_id_fkey 
            FOREIGN KEY (bom_master_id) REFERENCES sfg_bom(id);
    END IF;
END $$;

-- Drop old views
DROP VIEW IF EXISTS bom_master_with_versions;
DROP VIEW IF EXISTS bom_versions_with_components;
DROP VIEW IF EXISTS sfg_bom_with_versions;

-- Create new views with updated table names
CREATE VIEW sfg_bom_with_versions AS
SELECT 
    bm.*,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version
FROM sfg_bom bm
LEFT JOIN sfg_bom_versions_trial bv ON bm.id = bv.bom_master_id
GROUP BY bm.id, bm.bom_lineage_id, bm.sl_no, bm.item_name, bm.sfg_code, bm.pcs, 
         bm.part_weight_gm_pcs, bm.colour, bm.hp_percentage, bm.icp_percentage, 
         bm.rcp_percentage, bm.ldpe_percentage, bm.gpps_percentage, bm.mb_percentage,
         bm.status, bm.created_by, bm.created_at, bm.updated_at;

CREATE VIEW sfg_bom_versions_with_components AS
SELECT 
    bv.*,
    bm.sfg_code,
    bm.item_name,
    bm.sl_no,
    COUNT(bc.id) as total_components,
    SUM(bc.quantity) as total_quantity
FROM sfg_bom_versions_trial bv
JOIN sfg_bom bm ON bv.bom_master_id = bm.id
LEFT JOIN sfg_bom_components_trial bc ON bv.id = bc.bom_version_id
GROUP BY bv.id, bv.bom_master_id, bv.bom_lineage_id, bv.version_number, bv.is_active,
         bv.notes, bv.change_reason, bv.created_by, bv.created_at, bv.updated_at,
         bm.sfg_code, bm.item_name, bm.sl_no;

-- Update functions to use new table names
DROP FUNCTION IF EXISTS create_sfg_bom_version(UUID, INTEGER, BOOLEAN, UUID);
CREATE OR REPLACE FUNCTION create_sfg_bom_version(
    p_sfg_bom_id UUID,
    p_version_number INTEGER,
    p_is_active BOOLEAN DEFAULT FALSE,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
BEGIN
    -- Insert new version
    INSERT INTO sfg_bom_versions_trial (
        bom_master_id,
        version_number,
        is_active,
        created_by,
        created_at
    ) VALUES (
        p_sfg_bom_id,
        p_version_number,
        p_is_active,
        p_created_by,
        NOW()
    ) RETURNING id INTO v_version_id;
    
    -- If this is the active version, deactivate others
    IF p_is_active THEN
        UPDATE sfg_bom_versions_trial 
        SET is_active = FALSE 
        WHERE bom_master_id = p_sfg_bom_id 
        AND id != v_version_id;
    END IF;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_sfg_bom_version_history(UUID);
CREATE OR REPLACE FUNCTION get_sfg_bom_version_history(p_sfg_bom_id UUID)
RETURNS TABLE (
    version_id UUID,
    version_number INTEGER,
    is_active BOOLEAN,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bv.id,
        bv.version_number,
        bv.is_active,
        bv.created_by,
        bv.created_at
    FROM sfg_bom_versions_trial bv
    WHERE bv.bom_master_id = p_sfg_bom_id
    ORDER BY bv.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Update trigger function
DROP FUNCTION IF EXISTS create_initial_sfg_bom_version();
CREATE OR REPLACE FUNCTION create_initial_sfg_bom_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial version 1
    INSERT INTO sfg_bom_versions_trial (
        bom_master_id,
        version_number,
        is_active,
        created_by,
        created_at
    ) VALUES (
        NEW.id,
        1,
        TRUE,
        NEW.created_by,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the renaming
SELECT 
    'Renamed Tables' as info,
    table_name
FROM information_schema.tables 
WHERE table_name LIKE 'sfg_bom_%' 
AND table_schema = 'public'
ORDER BY table_name;

-- Show record counts
SELECT 'SFG BOM Records' as table_name, COUNT(*) as record_count FROM sfg_bom
UNION ALL
SELECT 'SFG BOM Versions' as table_name, COUNT(*) as record_count FROM sfg_bom_versions_trial
UNION ALL
SELECT 'SFG BOM Components' as table_name, COUNT(*) as record_count FROM sfg_bom_components_trial
UNION ALL
SELECT 'SFG BOM Audit' as table_name, COUNT(*) as record_count FROM sfg_bom_audit_trial;
