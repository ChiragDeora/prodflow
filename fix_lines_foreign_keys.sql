-- =====================================================
-- FIX LINES FOREIGN KEY RELATIONSHIPS
-- =====================================================
-- This script creates the missing foreign key constraints between lines and machines tables

-- First, let's check if the lines table exists and its current structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;

-- Check if foreign key constraints already exist
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

-- Check if machines table exists and has the correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'machines' 
AND column_name = 'machine_id'
ORDER BY ordinal_position;

-- =====================================================
-- CREATE FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop existing constraints if they exist (to avoid conflicts)
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_im_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_robot_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_conveyor_machine;
ALTER TABLE lines DROP CONSTRAINT IF EXISTS fk_lines_hoist_machine;

-- Create foreign key constraints
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
-- VERIFY THE CONSTRAINTS
-- =====================================================

-- Verify that all foreign key constraints are created
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

-- =====================================================
-- TEST THE RELATIONSHIPS
-- =====================================================

-- Test query to verify the relationships work
SELECT 
    l.line_id,
    l.line_name,
    l.im_machine_id,
    im.make as im_make,
    im.model as im_model,
    l.robot_machine_id,
    rm.make as robot_make,
    rm.model as robot_model
FROM lines l
LEFT JOIN machines im ON l.im_machine_id = im.machine_id
LEFT JOIN machines rm ON l.robot_machine_id = rm.machine_id
LIMIT 5;

-- =====================================================
-- CLEANUP ORPHANED REFERENCES (OPTIONAL)
-- =====================================================

-- If you have any orphaned references (lines pointing to non-existent machines), clean them up
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
-- FINAL VERIFICATION
-- =====================================================

-- Check for any remaining orphaned references
SELECT 
    'IM Machine' as machine_type,
    l.im_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.im_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.im_machine_id)

UNION ALL

SELECT 
    'Robot' as machine_type,
    l.robot_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.robot_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.robot_machine_id)

UNION ALL

SELECT 
    'Conveyor' as machine_type,
    l.conveyor_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.conveyor_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.conveyor_machine_id)

UNION ALL

SELECT 
    'Hoist' as machine_type,
    l.hoist_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.hoist_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.hoist_machine_id);

-- If the above query returns no rows, all foreign key relationships are valid!
