-- ============================================================================
-- CHECK AND FIX BOM TABLES
-- ============================================================================

-- Check if tables exist
SELECT 
    'SFG BOM Table' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'sfg_bom') as exists
UNION ALL
SELECT 
    'FG BOM Table' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'fg_bom') as exists
UNION ALL
SELECT 
    'LOCAL BOM Table' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'local_bom') as exists;

-- Check if views exist
SELECT 
    'SFG BOM View' as view_name,
    EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'sfg_bom_with_versions') as exists
UNION ALL
SELECT 
    'FG BOM View' as view_name,
    EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'fg_bom_with_versions') as exists
UNION ALL
SELECT 
    'LOCAL BOM View' as view_name,
    EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'local_bom_with_versions') as exists;

-- If tables don't exist, run the main script
-- Copy and paste the contents of 'create_sfg_fg_local_tables_with_correct_headers.sql' here
