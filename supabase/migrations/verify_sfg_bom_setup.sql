-- ============================================================================
-- VERIFY SFG_BOM TABLE SETUP AND DATA
-- ============================================================================

-- Check if sfg_bom table exists and show its structure
SELECT 
    'sfg_bom table exists' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sfg_bom');

-- Show sfg_bom table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sfg_bom' 
ORDER BY ordinal_position;

-- Check record count in sfg_bom
SELECT 
    'SFG BOM Records' as table_name,
    COUNT(*) as total_records
FROM sfg_bom;

-- Show sample data from sfg_bom
SELECT 
    id,
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
    status,
    created_at
FROM sfg_bom 
ORDER BY sl_no
LIMIT 10;

-- Check if version control is working
SELECT 
    'Version Control Status' as check_type,
    COUNT(*) as total_versions
FROM bom_versions_trial bv
JOIN sfg_bom s ON bv.bom_master_id = s.id;

-- Show SFG BOM with version information
SELECT 
    s.sl_no,
    s.item_name,
    s.sfg_code,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version
FROM sfg_bom s
LEFT JOIN bom_versions_trial bv ON s.id = bv.bom_master_id
GROUP BY s.id, s.sl_no, s.item_name, s.sfg_code
ORDER BY s.sl_no
LIMIT 5;

-- Check constraints and indexes
SELECT 
    'Constraints' as info_type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'sfg_bom';

SELECT 
    'Indexes' as info_type,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'sfg_bom';
