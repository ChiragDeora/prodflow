-- Dynamic fix for lines table data issues
-- This script will clean up the lines table without hardcoding machine assignments

-- Step 1: Remove the redundant line_name column if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lines' AND column_name = 'line_name'
    ) THEN
        ALTER TABLE lines DROP COLUMN line_name;
        RAISE NOTICE 'line_name column removed successfully';
    ELSE
        RAISE NOTICE 'line_name column does not exist';
    END IF;
END $$;

-- Step 2: Clear existing data
DELETE FROM lines;

-- Step 2: Insert properly formatted line data (only the basic structure)
INSERT INTO lines (line_id, description, status, unit) VALUES
('LINE-001', 'Production Line 1', 'Active', 'Unit 1'),
('LINE-002', 'Production Line 2', 'Active', 'Unit 1'),
('LINE-003', 'Production Line 3', 'Active', 'Unit 1'),
('LINE-004', 'Production Line 4', 'Active', 'Unit 1'),
('LINE-005', 'Production Line 5', 'Active', 'Unit 1'),
('LINE-006', 'Production Line 6', 'Active', 'Unit 1'),
('LINE-007', 'Production Line 7', 'Active', 'Unit 1'),
('LINE-008', 'Production Line 8', 'Active', 'Unit 1'),
('LINE-009', 'Production Line 9', 'Active', 'Unit 1'),
('LINE-010', 'Production Line 10', 'Active', 'Unit 1'),
('LINE-011', 'Production Line 11', 'Active', 'Unit 1'),
('LINE-012', 'Production Line 12', 'Active', 'Unit 1'),
('LINE-013', 'Production Line 13', 'Active', 'Unit 1'),
('LINE-014', 'Production Line 14', 'Active', 'Unit 1'),
('LINE-015', 'Production Line 15', 'Active', 'Unit 1'),
('LINE-016', 'Production Line 16', 'Active', 'Unit 1'),
('LINE-017', 'Production Line 17', 'Active', 'Unit 1'),
('LINE-018', 'Production Line 18', 'Active', 'Unit 1');

-- Step 3: Clear existing line assignments from machines (reset to clean state)
UPDATE machines SET line = NULL;

-- Step 4: Verify the clean state
SELECT 
    'Lines table cleaned successfully' as status,
    COUNT(*) as total_lines,
    'Machine assignments cleared - ready for dynamic assignment' as message
FROM lines;

-- Step 5: Show current state
SELECT 
    'Current state after cleanup' as info,
    COUNT(*) as total_machines,
    COUNT(CASE WHEN line IS NOT NULL THEN 1 END) as machines_with_lines,
    COUNT(CASE WHEN line IS NULL THEN 1 END) as machines_without_lines
FROM machines;
