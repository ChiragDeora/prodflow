-- =====================================================
-- GET EXACT MACHINE TABLE HEADERS
-- =====================================================

-- Show the exact column structure of the machines table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'machines' 
ORDER BY ordinal_position;

-- Show sample data for each category
SELECT 'IM Machines' as category, machine_id, make, model, category, type, serial_no
FROM machines 
WHERE category = 'IM'
LIMIT 3;

SELECT 'Robot Machines' as category, machine_id, make, model, category, type, serial_no
FROM machines 
WHERE category = 'Robot'
LIMIT 3;

SELECT 'Aux Machines (Conveyors)' as category, machine_id, make, model, category, type, serial_no
FROM machines 
WHERE category = 'Aux' AND machine_id LIKE 'CONY%'
LIMIT 3;

SELECT 'Aux Machines (Hoists)' as category, machine_id, make, model, category, type, serial_no
FROM machines 
WHERE category = 'Aux' AND machine_id LIKE 'Hoist%'
LIMIT 3;
