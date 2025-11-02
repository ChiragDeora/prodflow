-- =====================================================
-- COMPREHENSIVE FIX FOR LINES TABLE
-- =====================================================

-- Step 1: Drop all foreign key constraints (if they exist)
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_im_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_robot_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_conveyor_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_hoist_machine;

-- Step 2: Verify all constraints are removed
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'lines' 
AND tc.constraint_type = 'FOREIGN KEY';

-- Step 3: Check if lines table exists and its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;

-- Step 4: Check if machines table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'machines'
) as machines_table_exists;

-- Step 5: Check sample machine IDs that exist
SELECT machine_id, make, model, category 
FROM machines 
LIMIT 5;

-- Step 6: If you want to temporarily allow any machine IDs (for testing)
-- Make the foreign key columns nullable
ALTER TABLE lines ALTER COLUMN im_machine_id DROP NOT NULL;
ALTER TABLE lines ALTER COLUMN robot_machine_id DROP NOT NULL;
ALTER TABLE lines ALTER COLUMN conveyor_machine_id DROP NOT NULL;
ALTER TABLE lines ALTER COLUMN hoist_machine_id DROP NOT NULL;

-- Step 7: Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lines' 
AND column_name IN ('im_machine_id', 'robot_machine_id', 'conveyor_machine_id', 'hoist_machine_id')
ORDER BY ordinal_position;

-- =====================================================
-- OPTIONAL: Re-add foreign key constraints (only after successful import)
-- =====================================================

/*
-- Uncomment and run this section AFTER your import works successfully:

-- Re-add foreign key constraints
ALTER TABLE lines ADD CONSTRAINT fk_lines_im_machine 
    FOREIGN KEY (im_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines ADD CONSTRAINT fk_lines_robot_machine 
    FOREIGN KEY (robot_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines ADD CONSTRAINT fk_lines_conveyor_machine 
    FOREIGN KEY (conveyor_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

ALTER TABLE lines ADD CONSTRAINT fk_lines_hoist_machine 
    FOREIGN KEY (hoist_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

-- Make columns NOT NULL again (optional)
ALTER TABLE lines ALTER COLUMN im_machine_id SET NOT NULL;
ALTER TABLE lines ALTER COLUMN robot_machine_id SET NOT NULL;
ALTER TABLE lines ALTER COLUMN conveyor_machine_id SET NOT NULL;
ALTER TABLE lines ALTER COLUMN hoist_machine_id SET NOT NULL;
*/
