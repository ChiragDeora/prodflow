-- Test machine updates directly in the database
-- This will help identify if the issue is with RLS policies or something else

-- First, let's check the current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'machines'
ORDER BY policyname;

-- Check if we can update a machine directly
UPDATE machines 
SET line = 'LINE-001' 
WHERE machine_id = 'JSW-1';

-- Check the result
SELECT 
    machine_id,
    line,
    'Update test completed' as status
FROM machines 
WHERE machine_id = 'JSW-1';

-- Check if there are any triggers that might be causing issues
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'machines';

-- Check for any unique constraints that might cause conflicts
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'machines'
AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_type, kcu.column_name;
