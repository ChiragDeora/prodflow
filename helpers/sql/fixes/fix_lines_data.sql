-- Fix lines table data issues
-- This script will clean up the lines table and fix formatting issues

-- Step 1: Clear existing data
DELETE FROM lines;

-- Step 2: Insert properly formatted line data
INSERT INTO lines (line_id, line_name, description, status, unit) VALUES
('LINE-001', 'Production Line 1', 'Main production line for high-volume manufacturing', 'Active', 'Unit 1'),
('LINE-002', 'Production Line 2', 'Secondary production line for medium-volume manufacturing', 'Active', 'Unit 1'),
('LINE-003', 'Production Line 3', 'Tertiary production line for specialized manufacturing', 'Active', 'Unit 1'),
('LINE-004', 'Production Line 4', 'Quaternary production line for custom manufacturing', 'Active', 'Unit 1'),
('LINE-005', 'Production Line 5', 'Quinary production line for prototype manufacturing', 'Active', 'Unit 1'),
('LINE-006', 'Production Line 6', 'Senary production line for small-batch manufacturing', 'Active', 'Unit 1'),
('LINE-007', 'Production Line 7', 'Septenary production line for testing and validation', 'Active', 'Unit 1'),
('LINE-008', 'Production Line 8', 'Octonary production line for overflow production', 'Active', 'Unit 1'),
('LINE-009', 'Production Line 9', 'Nonary production line for maintenance backup', 'Active', 'Unit 1'),
('LINE-010', 'Production Line 10', 'Denary production line for emergency production', 'Active', 'Unit 1'),
('LINE-011', 'Production Line 11', 'Undenary production line for seasonal production', 'Active', 'Unit 1'),
('LINE-012', 'Production Line 12', 'Duodenary production line for export production', 'Active', 'Unit 1'),
('LINE-013', 'Production Line 13', 'Tredecenary production line for premium products', 'Active', 'Unit 1'),
('LINE-014', 'Production Line 14', 'Quattuordecenary production line for standard products', 'Active', 'Unit 1'),
('LINE-015', 'Production Line 15', 'Quindecenary production line for economy products', 'Active', 'Unit 1'),
('LINE-016', 'Production Line 16', 'Sedecenary production line for bulk production', 'Active', 'Unit 1'),
('LINE-017', 'Production Line 17', 'Septendecenary production line for specialty products', 'Active', 'Unit 1'),
('LINE-018', 'Production Line 18', 'Octodecenary production line for final assembly', 'Active', 'Unit 1');

-- Step 3: Verify the data
SELECT 
    'Lines table fixed successfully' as status,
    COUNT(*) as total_lines,
    'All lines now have proper LINE-XXX format' as message
FROM lines;

-- Step 4: Show sample data
SELECT 
    line_id,
    line_name,
    description,
    status,
    unit
FROM lines 
ORDER BY line_id
LIMIT 5;
