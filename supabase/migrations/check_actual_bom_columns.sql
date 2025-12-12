-- Check actual column names in BOM tables to fix the view creation

-- SFG BOM columns
SELECT 'SFG_BOM_COLUMNS' as table_info, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'sfg_bom'
ORDER BY ordinal_position;

-- FG BOM columns  
SELECT 'FG_BOM_COLUMNS' as table_info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'fg_bom'
ORDER BY ordinal_position;

-- LOCAL BOM columns (we already saw this structure)
SELECT 'LOCAL_BOM_COLUMNS' as table_info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'local_bom'
ORDER BY ordinal_position;
