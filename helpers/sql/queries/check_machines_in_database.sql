-- Check what machines exist in the database
-- This will help identify why machine updates are failing

-- Show all machines with their IDs
SELECT 
    machine_id,
    make,
    model,
    category,
    line,
    status
FROM machines 
ORDER BY machine_id;

-- Count machines by category
SELECT 
    category,
    COUNT(*) as count
FROM machines 
GROUP BY category
ORDER BY category;

-- Check if specific machine IDs exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM machines WHERE machine_id = 'JSW-1') THEN 'JSW-1 EXISTS'
        ELSE 'JSW-1 NOT FOUND'
    END as jsw1_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM machines WHERE machine_id = 'TOYO-1') THEN 'TOYO-1 EXISTS'
        ELSE 'TOYO-1 NOT FOUND'
    END as toyo1_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM machines WHERE machine_id = 'WITT-1') THEN 'WITT-1 EXISTS'
        ELSE 'WITT-1 NOT FOUND'
    END as witt1_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM machines WHERE machine_id = 'CONY-1') THEN 'CONY-1 EXISTS'
        ELSE 'CONY-1 NOT FOUND'
    END as cony1_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM machines WHERE machine_id = 'Hoist-1') THEN 'Hoist-1 EXISTS'
        ELSE 'Hoist-1 NOT FOUND'
    END as hoist1_status;

-- Show sample of actual machine IDs that exist
SELECT 
    'Sample existing machine IDs:' as info,
    string_agg(machine_id, ', ' ORDER BY machine_id) as machine_ids
FROM (
    SELECT DISTINCT machine_id 
    FROM machines 
    ORDER BY machine_id 
    LIMIT 10
) as sample_machines;
