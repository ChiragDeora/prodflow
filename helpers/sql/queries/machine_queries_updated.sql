-- =====================================================
-- MACHINE DATA QUERIES (UPDATED FOR ACTUAL STRUCTURE)
-- =====================================================

-- 1. Get all machine headers/columns (confirmed structure)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'machines' 
ORDER BY ordinal_position;

-- 2. Get all unique types
SELECT DISTINCT type 
FROM machines 
WHERE type IS NOT NULL
ORDER BY type;

-- 3. Get all unique categories
SELECT DISTINCT category 
FROM machines 
WHERE category IS NOT NULL
ORDER BY category;

-- 4. Compare type vs category
SELECT DISTINCT type, category
FROM machines 
WHERE type IS NOT NULL OR category IS NOT NULL
ORDER BY type, category;

-- 5. Get all unique makes
SELECT DISTINCT make 
FROM machines 
WHERE make IS NOT NULL
ORDER BY make;

-- 6. Get all unique models
SELECT DISTINCT model 
FROM machines 
WHERE model IS NOT NULL
ORDER BY model;

-- =====================================================
-- SAMPLE MACHINES (1 of each type)
-- =====================================================

-- 7. Get 1 IM Machine (check both type and category)
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE (category = 'IM' OR type = 'IM')
ORDER BY machine_id
LIMIT 1;

-- 8. Get 1 Robot Machine (check both type and category)
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE (category = 'Robot' OR type = 'Robot')
ORDER BY machine_id
LIMIT 1;

-- 9. Get 1 Conveyor Machine (Aux category/type)
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE (category = 'Aux' OR type = 'Aux')
AND machine_id LIKE 'CONY%'
ORDER BY machine_id
LIMIT 1;

-- 10. Get 1 Hoist Machine (Aux category/type)
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE (category = 'Aux' OR type = 'Aux')
AND (machine_id LIKE 'SEPL%' OR model ILIKE '%hoist%' OR model ILIKE '%2000%' OR model ILIKE '%3000%')
ORDER BY machine_id
LIMIT 1;

-- =====================================================
-- ALL MACHINES BY CATEGORY
-- =====================================================

-- 9. All IM Machines
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE category = 'IM'
ORDER BY machine_id;

-- 10. All Robot Machines
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE category = 'Robot'
ORDER BY machine_id;

-- 11. All Conveyor Machines (CONY-* pattern)
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE category = 'Aux' 
AND machine_id LIKE 'CONY%'
ORDER BY machine_id;

-- 12. All Hoist Machines (SEPL* pattern or capacity-based)
SELECT machine_id, make, model, serial_no, category, capacity_tons, type
FROM machines 
WHERE category = 'Aux' 
AND (machine_id LIKE 'SEPL%' OR model ILIKE '%hoist%' OR model ILIKE '%2000%' OR model ILIKE '%3000%')
ORDER BY machine_id;

-- =====================================================
-- MACHINE COUNT BY CATEGORY
-- =====================================================

-- 13. Count machines by category
SELECT category, COUNT(*) as count
FROM machines 
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;

-- 14. Count machines by make
SELECT make, COUNT(*) as count
FROM machines 
WHERE make IS NOT NULL
GROUP BY make
ORDER BY make;

-- =====================================================
-- QUICK REFERENCE QUERIES
-- =====================================================

-- 15. Get all CONY machines (Conveyors)
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE machine_id LIKE 'CONY%'
ORDER BY machine_id;

-- 16. Get all SEPL machines (Hoists)
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE machine_id LIKE 'SEPL%'
ORDER BY machine_id;

-- 17. Get all JSW machines
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE make = 'JSW'
ORDER BY machine_id;

-- 18. Get all Wittmaan machines
SELECT machine_id, make, model, serial_no, category
FROM machines 
WHERE make = 'Wittmaan'
ORDER BY machine_id;
