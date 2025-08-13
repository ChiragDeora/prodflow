-- =====================================================
-- GET ACTUAL ROBOT MACHINES FROM DATABASE
-- =====================================================

-- Get all Robot machines
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_no
FROM machines 
WHERE category = 'Robot' OR type = 'Robot'
ORDER BY machine_id;

-- Get all machines with Robot in the name or type
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_no
FROM machines 
WHERE machine_id ILIKE '%robot%' 
   OR machine_id ILIKE '%witt%' 
   OR machine_id ILIKE '%swtk%'
   OR make ILIKE '%witt%'
   OR make ILIKE '%switek%'
   OR model ILIKE '%robot%'
ORDER BY machine_id;
