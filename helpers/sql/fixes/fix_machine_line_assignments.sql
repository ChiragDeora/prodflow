-- Fix machine line assignments based on line master data
-- This script will assign machines to lines based on the line master table

-- Step 1: Clear existing line assignments from machines
UPDATE machines SET line = NULL;

-- Step 2: Assign IM machines to lines based on line master data
UPDATE machines SET line = 'LINE-001' WHERE machine_id = 'TOYO-1';
UPDATE machines SET line = 'LINE-002' WHERE machine_id = 'JSW-1';
UPDATE machines SET line = 'LINE-003' WHERE machine_id = 'HAIT-3';
UPDATE machines SET line = 'LINE-004' WHERE machine_id = 'JSW-5';
UPDATE machines SET line = 'LINE-005' WHERE machine_id = 'JSW-6';
UPDATE machines SET line = 'LINE-006' WHERE machine_id = 'JSW-7';
UPDATE machines SET line = 'LINE-007' WHERE machine_id = 'TOYO-2';
UPDATE machines SET line = 'LINE-008' WHERE machine_id = 'JSW-8';
UPDATE machines SET line = 'LINE-009' WHERE machine_id = 'JSW-9';
UPDATE machines SET line = 'LINE-010' WHERE machine_id = 'JSW-10';
UPDATE machines SET line = 'LINE-011' WHERE machine_id = 'JSW-4';
UPDATE machines SET line = 'LINE-012' WHERE machine_id = 'JSW-2';
UPDATE machines SET line = 'LINE-013' WHERE machine_id = 'JSW-3';
UPDATE machines SET line = 'LINE-014' WHERE machine_id = 'HAIT-4';
UPDATE machines SET line = 'LINE-015' WHERE machine_id = 'HAIT-1';
UPDATE machines SET line = 'LINE-016' WHERE machine_id = 'HAIT-2';

-- Step 3: Update lines table with machine assignments
UPDATE lines SET im_machine_id = 'TOYO-1' WHERE line_id = 'LINE-001';
UPDATE lines SET im_machine_id = 'JSW-1' WHERE line_id = 'LINE-002';
UPDATE lines SET im_machine_id = 'HAIT-3' WHERE line_id = 'LINE-003';
UPDATE lines SET im_machine_id = 'JSW-5' WHERE line_id = 'LINE-004';
UPDATE lines SET im_machine_id = 'JSW-6' WHERE line_id = 'LINE-005';
UPDATE lines SET im_machine_id = 'JSW-7' WHERE line_id = 'LINE-006';
UPDATE lines SET im_machine_id = 'TOYO-2' WHERE line_id = 'LINE-007';
UPDATE lines SET im_machine_id = 'JSW-8' WHERE line_id = 'LINE-008';
UPDATE lines SET im_machine_id = 'JSW-9' WHERE line_id = 'LINE-009';
UPDATE lines SET im_machine_id = 'JSW-10' WHERE line_id = 'LINE-010';
UPDATE lines SET im_machine_id = 'JSW-4' WHERE line_id = 'LINE-011';
UPDATE lines SET im_machine_id = 'JSW-2' WHERE line_id = 'LINE-012';
UPDATE lines SET im_machine_id = 'JSW-3' WHERE line_id = 'LINE-013';
UPDATE lines SET im_machine_id = 'HAIT-4' WHERE line_id = 'LINE-014';
UPDATE lines SET im_machine_id = 'HAIT-1' WHERE line_id = 'LINE-015';
UPDATE lines SET im_machine_id = 'HAIT-2' WHERE line_id = 'LINE-016';

-- Step 4: Assign Robot machines to lines
UPDATE lines SET robot_machine_id = 'WITT-1' WHERE line_id = 'LINE-001';
UPDATE lines SET robot_machine_id = 'WITT-2' WHERE line_id = 'LINE-002';
UPDATE lines SET robot_machine_id = 'WITT-14' WHERE line_id = 'LINE-003';
UPDATE lines SET robot_machine_id = 'WITT-10' WHERE line_id = 'LINE-004';
UPDATE lines SET robot_machine_id = 'WITT-5' WHERE line_id = 'LINE-005';
UPDATE lines SET robot_machine_id = 'WITT-6' WHERE line_id = 'LINE-006';
UPDATE lines SET robot_machine_id = 'WITT-7' WHERE line_id = 'LINE-007';
UPDATE lines SET robot_machine_id = 'WITT-11' WHERE line_id = 'LINE-008';
UPDATE lines SET robot_machine_id = 'WITT-12' WHERE line_id = 'LINE-009';
UPDATE lines SET robot_machine_id = 'SWTK-1' WHERE line_id = 'LINE-010';
UPDATE lines SET robot_machine_id = 'WITT-13' WHERE line_id = 'LINE-011';
UPDATE lines SET robot_machine_id = 'WITT-3' WHERE line_id = 'LINE-012';
UPDATE lines SET robot_machine_id = 'WITT-4' WHERE line_id = 'LINE-013';
UPDATE lines SET robot_machine_id = 'WITT-15' WHERE line_id = 'LINE-014';
UPDATE lines SET robot_machine_id = 'WITT-8' WHERE line_id = 'LINE-015';
UPDATE lines SET robot_machine_id = 'WITT-9' WHERE line_id = 'LINE-016';

-- Step 5: Assign Hoist machines to lines
UPDATE lines SET hoist_machine_id = 'Hoist-1' WHERE line_id = 'LINE-001';
UPDATE lines SET hoist_machine_id = 'Hoist-2' WHERE line_id = 'LINE-002';
UPDATE lines SET hoist_machine_id = 'Hoist-3' WHERE line_id = 'LINE-003';
UPDATE lines SET hoist_machine_id = 'Hoist-4' WHERE line_id = 'LINE-004';
UPDATE lines SET hoist_machine_id = 'Hoist-5' WHERE line_id = 'LINE-005';
UPDATE lines SET hoist_machine_id = 'Hoist-6' WHERE line_id = 'LINE-006';
UPDATE lines SET hoist_machine_id = 'Hoist-7' WHERE line_id = 'LINE-007';
UPDATE lines SET hoist_machine_id = 'Hoist-8' WHERE line_id = 'LINE-008';
UPDATE lines SET hoist_machine_id = 'Hoist-17' WHERE line_id = 'LINE-009';
UPDATE lines SET hoist_machine_id = 'Hoist-18' WHERE line_id = 'LINE-010';
UPDATE lines SET hoist_machine_id = 'Hoist-11' WHERE line_id = 'LINE-011';
UPDATE lines SET hoist_machine_id = 'Hoist-12' WHERE line_id = 'LINE-012';
UPDATE lines SET hoist_machine_id = 'Hoist-13' WHERE line_id = 'LINE-013';
UPDATE lines SET hoist_machine_id = 'Hoist-14' WHERE line_id = 'LINE-014';
UPDATE lines SET hoist_machine_id = 'Hoist-15' WHERE line_id = 'LINE-015';
UPDATE lines SET hoist_machine_id = 'Hoist-16' WHERE line_id = 'LINE-016';

-- Step 6: Assign Conveyor machines to lines
UPDATE lines SET conveyor_machine_id = 'CONY-1' WHERE line_id = 'LINE-001';
UPDATE lines SET conveyor_machine_id = 'CONY-2' WHERE line_id = 'LINE-002';
UPDATE lines SET conveyor_machine_id = 'CONY-3' WHERE line_id = 'LINE-003';
UPDATE lines SET conveyor_machine_id = 'CONY-4' WHERE line_id = 'LINE-004';
UPDATE lines SET conveyor_machine_id = 'CONY-5' WHERE line_id = 'LINE-005';
UPDATE lines SET conveyor_machine_id = 'CONY-6' WHERE line_id = 'LINE-006';
UPDATE lines SET conveyor_machine_id = 'CONY-7' WHERE line_id = 'LINE-007';
UPDATE lines SET conveyor_machine_id = 'CONY-8' WHERE line_id = 'LINE-008';
UPDATE lines SET conveyor_machine_id = 'CONY-9' WHERE line_id = 'LINE-009';
UPDATE lines SET conveyor_machine_id = 'CONY-10' WHERE line_id = 'LINE-010';
UPDATE lines SET conveyor_machine_id = 'CONY-11' WHERE line_id = 'LINE-011';
UPDATE lines SET conveyor_machine_id = 'CONY-12' WHERE line_id = 'LINE-012';
UPDATE lines SET conveyor_machine_id = 'CONY-13' WHERE line_id = 'LINE-013';
UPDATE lines SET conveyor_machine_id = 'CONY-14' WHERE line_id = 'LINE-014';
UPDATE lines SET conveyor_machine_id = 'CONY-15' WHERE line_id = 'LINE-015';
UPDATE lines SET conveyor_machine_id = 'CONY-16' WHERE line_id = 'LINE-016';

-- Step 7: Verify the assignments
SELECT 
    'Machine line assignments completed' as status,
    COUNT(*) as machines_with_lines
FROM machines 
WHERE line IS NOT NULL;

-- Step 8: Show sample assignments
SELECT 
    m.machine_id,
    m.make,
    m.model,
    m.line,
    l.line_name
FROM machines m
LEFT JOIN lines l ON m.line = l.line_id
WHERE m.line IS NOT NULL
ORDER BY m.line
LIMIT 10;
