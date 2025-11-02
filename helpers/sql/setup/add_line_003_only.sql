-- =====================================================
-- ADD ONLY LINE-003 (MINIMAL FIX)
-- =====================================================
-- This adds only LINE-003 to fix the foreign key constraint error
-- No destructive changes, preserves all existing data

-- Add LINE-003 if it doesn't exist
INSERT INTO lines (line_id, line_name, description, status, unit) 
SELECT 'LINE-003', 'TOYO-1', 'TOYO Line 1 with IM machine, robot, conveyor and hoist', 'Active', 'Unit 1'
WHERE NOT EXISTS (SELECT 1 FROM lines WHERE line_id = 'LINE-003');

-- Now assign JSW-1 to LINE-003 (this should work now)
UPDATE machines 
SET line = 'LINE-003' 
WHERE machine_id = 'JSW-1';

-- Verify the fix
SELECT 
    'LINE-003 Added Successfully' as status,
    (SELECT COUNT(*) FROM lines WHERE line_id = 'LINE-003') as line_003_exists,
    (SELECT line FROM machines WHERE machine_id = 'JSW-1') as jsw1_line_assignment;
