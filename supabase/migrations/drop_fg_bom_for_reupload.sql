-- Drop FG BOM tables and related objects for clean reupload
-- This script will remove all FG BOM data and structure

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS fg_bom_with_versions;

-- Drop version tables
DROP TABLE IF EXISTS fg_bom_versions;

-- Drop main FG BOM table
DROP TABLE IF EXISTS fg_bom;

-- Verify all FG BOM objects are dropped
SELECT 
    'Tables' as object_type,
    table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%fg_bom%' 
   OR table_name LIKE '%fg_bom%'
UNION ALL
SELECT 
    'Views' as object_type,
    table_name as view_name
FROM information_schema.views 
WHERE table_name LIKE '%fg_bom%' 
   OR table_name LIKE '%fg_bom%'
UNION ALL
SELECT 
    'Functions' as object_type,
    routine_name
FROM information_schema.routines 
WHERE routine_name LIKE '%fg_bom%' 
   OR routine_name LIKE '%fg_bom%';

-- If any objects remain, they will be listed above
-- If no results, all FG BOM objects have been successfully dropped
