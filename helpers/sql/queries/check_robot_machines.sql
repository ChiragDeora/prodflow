-- =====================================================
-- CHECK FOR ROBOT MACHINES WITH DIFFERENT PATTERNS
-- =====================================================

-- Check for any machines that might be robots
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

-- Check all machines to see if any are robots
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_no
FROM machines 
WHERE category = 'Robot' 
   OR type = 'Robot'
   OR type ILIKE '%robot%'
ORDER BY machine_id;

-- Show all unique categories and types
SELECT DISTINCT category, type
FROM machines 
ORDER BY category, type;
