-- =====================================================
-- GET REMAINING MACHINE TYPES FOR MAPPING ANALYSIS
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

-- Get all Conveyor machines (Aux category)
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_no
FROM machines 
WHERE category = 'Aux' AND (machine_id ILIKE 'CONY%' OR model ILIKE '%conveyor%')
ORDER BY machine_id;

-- Get all Hoist machines (Aux category)
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_no
FROM machines 
WHERE category = 'Aux' AND (machine_id ILIKE 'SEPL%' OR model ILIKE '%hoist%' OR model ILIKE '%kg%')
ORDER BY machine_id;

-- Get all Aux machines to see what's available
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_no
FROM machines 
WHERE category = 'Aux'
ORDER BY machine_id;
