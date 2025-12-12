-- Check BOM table structures to understand current schema

-- Check SFG BOM structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sfg_bom'
ORDER BY ordinal_position;

-- Check FG BOM structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'fg_bom'
ORDER BY ordinal_position;

-- Check LOCAL BOM structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'local_bom'
ORDER BY ordinal_position;

-- Sample data from each table
SELECT 'SFG_BOM' as table_name, * FROM sfg_bom LIMIT 3;
SELECT 'FG_BOM' as table_name, * FROM fg_bom LIMIT 3;  
SELECT 'LOCAL_BOM' as table_name, * FROM local_bom LIMIT 3;
