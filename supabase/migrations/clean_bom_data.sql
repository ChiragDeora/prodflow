-- ============================================================================
-- CLEAN DATA IN BOM TABLES: SFG, FG, and LOCAL
-- ============================================================================
-- This script removes all data from:
-- - sfg_bom (Semi-Finished Goods BOM)
-- - fg_bom (Finished Goods BOM)
-- - local_bom (Local BOM)
-- - And their corresponding version tables
-- ============================================================================

-- Step 1: Clean version tables first (due to foreign key constraints)
-- ============================================================================

-- Clean SFG BOM versions
TRUNCATE TABLE sfg_bom_versions CASCADE;

-- Clean FG BOM versions
TRUNCATE TABLE fg_bom_versions CASCADE;

-- Clean LOCAL BOM versions
TRUNCATE TABLE local_bom_versions CASCADE;

-- Step 2: Clean main BOM tables
-- ============================================================================

-- Clean SFG BOM table
TRUNCATE TABLE sfg_bom CASCADE;

-- Clean FG BOM table
TRUNCATE TABLE fg_bom CASCADE;

-- Clean LOCAL BOM table
TRUNCATE TABLE local_bom CASCADE;

-- ============================================================================
-- ALTERNATIVE: If you prefer DELETE instead of TRUNCATE
-- ============================================================================
-- Note: DELETE is slower but allows WHERE clauses for selective deletion
-- Uncomment the following if you want to use DELETE instead:

-- DELETE FROM sfg_bom_versions;
-- DELETE FROM fg_bom_versions;
-- DELETE FROM local_bom_versions;
-- DELETE FROM sfg_bom;
-- DELETE FROM fg_bom;
-- DELETE FROM local_bom;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables are empty
SELECT 
    'sfg_bom' as table_name, 
    COUNT(*) as record_count 
FROM sfg_bom
UNION ALL
SELECT 
    'fg_bom' as table_name, 
    COUNT(*) as record_count 
FROM fg_bom
UNION ALL
SELECT 
    'local_bom' as table_name, 
    COUNT(*) as record_count 
FROM local_bom
UNION ALL
SELECT 
    'sfg_bom_versions' as table_name, 
    COUNT(*) as record_count 
FROM sfg_bom_versions
UNION ALL
SELECT 
    'fg_bom_versions' as table_name, 
    COUNT(*) as record_count 
FROM fg_bom_versions
UNION ALL
SELECT 
    'local_bom_versions' as table_name, 
    COUNT(*) as record_count 
FROM local_bom_versions;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. TRUNCATE CASCADE automatically handles foreign key relationships
-- 2. TRUNCATE is faster than DELETE for removing all data
-- 3. TRUNCATE resets auto-increment sequences (if any)
-- 4. TRUNCATE cannot be rolled back in some databases, but PostgreSQL supports it
-- 5. If you need to delete specific records, use DELETE with WHERE clause instead
-- ============================================================================

