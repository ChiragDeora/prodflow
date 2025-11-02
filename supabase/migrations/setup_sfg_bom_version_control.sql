-- ============================================================================
-- SETUP VERSION CONTROL FOR SFG BOM
-- ============================================================================

-- First, let's check the current structure of bom_versions_trial
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bom_versions_trial' 
ORDER BY ordinal_position;

-- Check if bom_versions_trial has the right foreign key to sfg_bom
SELECT 
    constraint_name,
    constraint_type,
    table_name,
    column_name
FROM information_schema.key_column_usage 
WHERE table_name = 'bom_versions_trial' 
AND constraint_name LIKE '%fk%';

-- Update bom_versions_trial to reference sfg_bom instead of bom_master_trial
-- First, drop the old foreign key constraint if it exists
DO $$
BEGIN
    -- Drop old foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%bom_master_trial%' 
        AND table_name = 'bom_versions_trial'
    ) THEN
        ALTER TABLE bom_versions_trial DROP CONSTRAINT IF EXISTS bom_versions_trial_bom_master_id_fkey;
    END IF;
END $$;

-- Add new foreign key constraint to reference sfg_bom
ALTER TABLE bom_versions_trial 
ADD CONSTRAINT bom_versions_trial_sfg_bom_id_fkey 
FOREIGN KEY (bom_master_id) REFERENCES sfg_bom(id) ON DELETE CASCADE;

-- Create a view that combines sfg_bom with version information
DROP VIEW IF EXISTS sfg_bom_with_versions;
CREATE VIEW sfg_bom_with_versions AS
SELECT 
    bm.*,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version,
    STRING_AGG(DISTINCT bv.version_number::text, ', ' ORDER BY bv.version_number::text) as all_versions
FROM sfg_bom bm
LEFT JOIN bom_versions_trial bv ON bm.id = bv.bom_master_id
GROUP BY bm.id, bm.bom_lineage_id, bm.sl_no, bm.item_name, bm.sfg_code, bm.pcs, 
         bm.part_weight_gm_pcs, bm.colour, bm.hp_percentage, bm.icp_percentage, 
         bm.rcp_percentage, bm.ldpe_percentage, bm.gpps_percentage, bm.mb_percentage,
         bm.status, bm.created_by, bm.created_at, bm.updated_at;

-- Create a function to create a new version of an SFG BOM
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
    INSERT INTO bom_versions_trial (
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
        UPDATE bom_versions_trial 
        SET is_active = FALSE 
        WHERE bom_master_id = p_sfg_bom_id 
        AND id != v_version_id;
    END IF;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get version history for an SFG BOM
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
    FROM bom_versions_trial bv
    WHERE bv.bom_master_id = p_sfg_bom_id
    ORDER BY bv.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create version 1 when a new SFG BOM is created
CREATE OR REPLACE FUNCTION create_initial_sfg_bom_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial version 1
    INSERT INTO bom_versions_trial (
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

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_initial_sfg_bom_version ON sfg_bom;
CREATE TRIGGER trigger_create_initial_sfg_bom_version
    AFTER INSERT ON sfg_bom
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_sfg_bom_version();

-- Test the version control system
SELECT 
    'SFG BOM with Version Info' as test_name,
    COUNT(*) as total_records
FROM sfg_bom_with_versions;

-- Show sample data with version information
SELECT 
    sl_no,
    item_name,
    sfg_code,
    total_versions,
    latest_version,
    active_version,
    all_versions
FROM sfg_bom_with_versions 
ORDER BY sl_no
LIMIT 5;
