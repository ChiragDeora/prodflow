-- =====================================================
-- REMOVE FOREIGN KEY CONSTRAINTS FROM LINES TABLE
-- =====================================================

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

-- =====================================================
-- RE-ADD FOREIGN KEY CONSTRAINTS (when ready)
-- =====================================================

-- Uncomment these lines when you want to re-add the constraints:
/*
ALTER TABLE lines ADD CONSTRAINT fk_lines_im_machine 
    FOREIGN KEY (im_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines ADD CONSTRAINT fk_lines_robot_machine 
    FOREIGN KEY (robot_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines ADD CONSTRAINT fk_lines_conveyor_machine 
    FOREIGN KEY (conveyor_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines ADD CONSTRAINT fk_lines_hoist_machine 
    FOREIGN KEY (hoist_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;
*/
