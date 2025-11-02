-- =====================================================
-- CHECK MACHINE TABLE STRUCTURE
-- =====================================================

-- Check the actual machine table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'machines' 
ORDER BY ordinal_position;

-- Check what the primary key is
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'machines' 
AND tc.constraint_type = 'PRIMARY KEY';

-- Show sample machine data
SELECT machine_id, make, model, category, type
FROM machines 
LIMIT 5;
