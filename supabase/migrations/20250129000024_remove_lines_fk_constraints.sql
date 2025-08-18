-- Remove foreign key constraints from lines table to allow data import
-- This allows importing lines data even if the referenced machines don't exist yet

-- Drop foreign key constraints from lines table
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_im_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_robot_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_conveyor_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_hoist_machine;

-- Verify constraints are removed
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'lines' 
AND tc.constraint_type = 'FOREIGN KEY';
