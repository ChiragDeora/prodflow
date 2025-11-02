-- ============================================================================
-- DROP ALL SFG AND BOM TABLES - START FRESH
-- ============================================================================

-- First, let's see what tables we're going to drop
SELECT 
    'Tables to be dropped' as action,
    table_name
FROM information_schema.tables 
WHERE (table_name LIKE '%sfg%' OR table_name LIKE '%bom%')
AND table_schema = 'public'
ORDER BY table_name;

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS sfg_bom_with_versions CASCADE;
DROP VIEW IF EXISTS sfg_bom_versions_with_components CASCADE;
DROP VIEW IF EXISTS bom_master_with_versions CASCADE;
DROP VIEW IF EXISTS bom_versions_with_components CASCADE;
DROP VIEW IF EXISTS unified_bom_master CASCADE;
DROP VIEW IF EXISTS fg_bom_with_versions CASCADE;
DROP VIEW IF EXISTS local_bom_with_versions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS create_sfg_bom_version(UUID, INTEGER, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_sfg_bom_version_history(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_initial_sfg_bom_version() CASCADE;
DROP FUNCTION IF EXISTS get_next_bom_version(UUID) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_create_initial_sfg_bom_version ON sfg_bom;

-- Drop tables in dependency order (child tables first, then parent tables)
DROP TABLE IF EXISTS sfg_bom_audit_trial CASCADE;
DROP TABLE IF EXISTS sfg_bom_components_trial CASCADE;
DROP TABLE IF EXISTS sfg_bom_versions_trial CASCADE;
DROP TABLE IF EXISTS sfg_bom CASCADE;
DROP TABLE IF EXISTS sfg_bom_lineage CASCADE;

-- Drop original bom_ tables
DROP TABLE IF EXISTS bom_audit_trial CASCADE;
DROP TABLE IF EXISTS bom_components_trial CASCADE;
DROP TABLE IF EXISTS bom_versions_trial CASCADE;
DROP TABLE IF EXISTS bom_master_trial CASCADE;
DROP TABLE IF EXISTS bom_lineage CASCADE;

-- Drop FG and LOCAL tables if they exist
DROP TABLE IF EXISTS fg_bom CASCADE;
DROP TABLE IF EXISTS local_bom CASCADE;

-- Drop indexes (they should be dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_sfg_bom_sl_no CASCADE;
DROP INDEX IF EXISTS idx_sfg_bom_sfg_code CASCADE;
DROP INDEX IF EXISTS idx_sfg_bom_status CASCADE;
DROP INDEX IF EXISTS idx_sfg_bom_created_by CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_sl_no CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_fg_code CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_status CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_created_by CASCADE;
DROP INDEX IF EXISTS idx_local_bom_sl_no CASCADE;
DROP INDEX IF EXISTS idx_local_bom_local_code CASCADE;
DROP INDEX IF EXISTS idx_local_bom_status CASCADE;
DROP INDEX IF EXISTS idx_local_bom_created_by CASCADE;

-- Verify all tables are dropped
SELECT 
    'Remaining tables' as status,
    table_name
FROM information_schema.tables 
WHERE (table_name LIKE '%sfg%' OR table_name LIKE '%bom%')
AND table_schema = 'public'
ORDER BY table_name;

-- Show what tables remain in the database
SELECT 
    'All remaining tables' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name NOT LIKE 'auth_%'
ORDER BY table_name;
