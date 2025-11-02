-- =====================================================
-- MACHINE DATA QUERIES
-- =====================================================

-- 1. Get all machine headers/columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'machines' 
ORDER BY ordinal_position;

-- 2. Get all unique categories
SELECT DISTINCT category 
FROM machines 
ORDER BY category;

-- 3. Get all unique makes
SELECT DISTINCT make 
FROM machines 
WHERE make IS NOT NULL
ORDER BY make;

-- 4. Get all unique models
SELECT DISTINCT model 
FROM machines 
WHERE model IS NOT NULL
ORDER BY model;

-- =====================================================
-- SAMPLE MACHINES (1 of each type)
-- =====================================================

-- 5. Get 1 IM Machine
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'IM'
ORDER BY machine_id
LIMIT 1;

-- 6. Get 1 Robot Machine
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'Robot'
ORDER BY machine_id
LIMIT 1;

-- 7. Get 1 Conveyor Machine (Aux category with conveyor characteristics)
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'Aux' 
AND (make = 'Wittmaan' OR make = 'Switek')
AND (model ILIKE '%TW40%' OR model ILIKE '%700%')
ORDER BY machine_id
LIMIT 1;

-- 8. Get 1 Hoist Machine (Aux category with hoist characteristics)
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'Aux' 
AND make = 'Shajanand'
AND machine_id LIKE 'SEPL%'
ORDER BY machine_id
LIMIT 1;

-- =====================================================
-- ALL MACHINES BY CATEGORY
-- =====================================================

-- 9. All IM Machines
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'IM'
ORDER BY machine_id;

-- 10. All Robot Machines
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'Robot'
ORDER BY machine_id;

-- 11. All Conveyor Machines
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'Aux' 
AND (make = 'Wittmaan' OR make = 'Switek')
AND (model ILIKE '%TW40%' OR model ILIKE '%700%')
ORDER BY machine_id;

-- 12. All Hoist Machines
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE category = 'Aux' 
AND make = 'Shajanand'
AND machine_id LIKE 'SEPL%'
ORDER BY machine_id;

-- =====================================================
-- MACHINE COUNT BY CATEGORY
-- =====================================================

-- 13. Count machines by category
SELECT category, COUNT(*) as count
FROM machines 
GROUP BY category
ORDER BY category;

-- 14. Count machines by make
SELECT make, COUNT(*) as count
FROM machines 
WHERE make IS NOT NULL
GROUP BY make
ORDER BY make;
