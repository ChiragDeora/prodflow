-- Add line column to machines table and establish foreign key relationships
-- This migration fixes the missing foreign key relationships between lines and machines tables

-- =====================================================
-- 1. ADD LINE COLUMN TO MACHINES TABLE
-- =====================================================

-- Add the line column to machines table (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machines' AND column_name = 'line'
    ) THEN
        ALTER TABLE machines ADD COLUMN line VARCHAR(50);
        RAISE NOTICE 'Line column added successfully to machines table';
    ELSE
        RAISE NOTICE 'Line column already exists in machines table';
    END IF;
END $$;

-- Add comment to the new column
COMMENT ON COLUMN machines.line IS 'Reference to the line this machine belongs to (e.g., LINE-001, LINE-002)';

-- Create index on the new line column for better performance
CREATE INDEX IF NOT EXISTS idx_machines_line ON machines(line);

-- =====================================================
-- 2. ADD FOREIGN KEY CONSTRAINT FROM MACHINES TO LINES
-- =====================================================

-- Add foreign key constraint from machines to lines table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'machines' 
        AND constraint_name = 'fk_machines_line'
    ) THEN
        ALTER TABLE machines 
        ADD CONSTRAINT fk_machines_line 
        FOREIGN KEY (line) REFERENCES lines(line_id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint fk_machines_line added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_machines_line already exists';
    END IF;
END $$;

-- =====================================================
-- 3. VERIFY FOREIGN KEY CONSTRAINTS ON LINES TABLE
-- =====================================================

-- Ensure all foreign key constraints exist on lines table
DO $$ 
BEGIN
    -- Add fk_lines_im_machine if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'lines' 
        AND constraint_name = 'fk_lines_im_machine'
    ) THEN
        ALTER TABLE lines 
        ADD CONSTRAINT fk_lines_im_machine 
        FOREIGN KEY (im_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint fk_lines_im_machine added successfully';
    END IF;

    -- Add fk_lines_robot_machine if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'lines' 
        AND constraint_name = 'fk_lines_robot_machine'
    ) THEN
        ALTER TABLE lines 
        ADD CONSTRAINT fk_lines_robot_machine 
        FOREIGN KEY (robot_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint fk_lines_robot_machine added successfully';
    END IF;

    -- Add fk_lines_conveyor_machine if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'lines' 
        AND constraint_name = 'fk_lines_conveyor_machine'
    ) THEN
        ALTER TABLE lines 
        ADD CONSTRAINT fk_lines_conveyor_machine 
        FOREIGN KEY (conveyor_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint fk_lines_conveyor_machine added successfully';
    END IF;

    -- Add fk_lines_hoist_machine if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'lines' 
        AND constraint_name = 'fk_lines_hoist_machine'
    ) THEN
        ALTER TABLE lines 
        ADD CONSTRAINT fk_lines_hoist_machine 
        FOREIGN KEY (hoist_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint fk_lines_hoist_machine added successfully';
    END IF;
END $$;

-- =====================================================
-- 4. DROP SAMPLE DATA (KEEP STRUCTURE)
-- =====================================================

-- Clear any existing sample data from lines table
DELETE FROM lines;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Verify machines table has line column
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'machines' 
AND column_name IN ('line')
ORDER BY ordinal_position;

-- Check all foreign key constraints
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
WHERE tc.table_name IN ('machines', 'lines')
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- Check lines table structure (without data)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;

-- Show table description and comments
SELECT 
    'lines' as table_name,
    'Production lines connecting IM machines, robots, conveyors, and hoists' as table_description;

-- Show column descriptions
SELECT 
    column_name,
    col_description((table_schema||'.'||table_name)::regclass, ordinal_position) as column_description
FROM information_schema.columns 
WHERE table_name = 'lines' 
AND col_description((table_schema||'.'||table_name)::regclass, ordinal_position) IS NOT NULL
ORDER BY ordinal_position;
