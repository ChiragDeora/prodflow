-- Temporarily remove foreign key constraints from lines table to allow data import
-- This migration removes the constraints, allows data import, then re-adds them

-- =====================================================
-- 1. REMOVE FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop foreign key constraints from lines table
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_im_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_robot_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_conveyor_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_hoist_machine;

-- =====================================================
-- 2. VERIFY CONSTRAINTS ARE REMOVED
-- =====================================================

-- Check that all foreign key constraints are removed
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'lines' 
AND tc.constraint_type = 'FOREIGN KEY';

-- =====================================================
-- 3. CLEAN UP ANY ORPHANED REFERENCES (OPTIONAL)
-- =====================================================

-- Set machine references to NULL if the machines don't exist
UPDATE lines 
SET im_machine_id = NULL 
WHERE im_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.im_machine_id);

UPDATE lines 
SET robot_machine_id = NULL 
WHERE robot_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.robot_machine_id);

UPDATE lines 
SET conveyor_machine_id = NULL 
WHERE conveyor_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.conveyor_machine_id);

UPDATE lines 
SET hoist_machine_id = NULL 
WHERE hoist_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.hoist_machine_id);

-- =====================================================
-- 4. RE-ADD FOREIGN KEY CONSTRAINTS (AFTER DATA IMPORT)
-- =====================================================

-- Re-add foreign key constraints with ON DELETE SET NULL
ALTER TABLE lines 
ADD CONSTRAINT fk_lines_im_machine 
FOREIGN KEY (im_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines 
ADD CONSTRAINT fk_lines_robot_machine 
FOREIGN KEY (robot_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines 
ADD CONSTRAINT fk_lines_conveyor_machine 
FOREIGN KEY (conveyor_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines 
ADD CONSTRAINT fk_lines_hoist_machine 
FOREIGN KEY (hoist_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

-- =====================================================
-- 5. VERIFY CONSTRAINTS ARE RE-ADDED
-- =====================================================

-- Check that all foreign key constraints are back in place
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'lines' 
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;
