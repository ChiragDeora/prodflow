-- =====================================================
-- DEBUG MACHINE MAPPING ISSUE
-- =====================================================

-- Check what machine IDs are actually available in the database
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_number
FROM machines 
ORDER BY category, machine_id;

-- Check IM machines specifically
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_number
FROM machines 
WHERE category = 'IM' OR type = 'IM'
ORDER BY machine_id;

-- Check Robot machines specifically
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_number
FROM machines 
WHERE category = 'Robot' OR type = 'Robot'
ORDER BY machine_id;

-- Check Conveyor machines specifically (Aux category)
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_number
FROM machines 
WHERE category = 'Aux' AND (machine_id ILIKE 'CONY%' OR model ILIKE '%conveyor%')
ORDER BY machine_id;

-- Check Hoist machines specifically (Aux category)
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_number
FROM machines 
WHERE category = 'Aux' AND (machine_id ILIKE 'SEPL%' OR model ILIKE '%hoist%' OR model ILIKE '%kg%')
ORDER BY machine_id;

-- Count machines by category
SELECT 
    category,
    COUNT(*) as count
FROM machines 
GROUP BY category
ORDER BY category;

-- Show all machine IDs that start with common patterns
SELECT 
    machine_id,
    make,
    model,
    category
FROM machines 
WHERE machine_id ILIKE 'JSW%' 
   OR machine_id ILIKE 'TOYO%' 
   OR machine_id ILIKE 'HAIT%' 
   OR machine_id ILIKE 'WITT%' 
   OR machine_id ILIKE 'SWTK%' 
   OR machine_id ILIKE 'CONY%' 
   OR machine_id ILIKE 'SEPL%'
ORDER BY machine_id;
