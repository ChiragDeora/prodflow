-- =====================================================
-- CROSS CHECK EXCEL HEADERS WITH MACHINE MASTER
-- =====================================================

-- Check IM machines (for "IM" column)
SELECT 'IM Machines' as excel_column, machine_id, make, model
FROM machines 
WHERE category = 'IM'
ORDER BY machine_id;

-- Check Robot machines (for "Robot" column)
SELECT 'Robot Machines' as excel_column, machine_id, make, model
FROM machines 
WHERE category = 'Robot'
ORDER BY machine_id;

-- Check Conveyor machines (for "Conveyor" column)
SELECT 'Conveyor Machines' as excel_column, machine_id, make, model
FROM machines 
WHERE category = 'Aux' AND machine_id LIKE 'CONY%'
ORDER BY machine_id;

-- Check Hoist machines (for "Hoist" column)
SELECT 'Hoist Machines' as excel_column, machine_id, make, model
FROM machines 
WHERE category = 'Aux' AND machine_id LIKE 'Hoist%'
ORDER BY machine_id;
