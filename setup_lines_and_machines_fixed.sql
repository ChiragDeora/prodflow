-- =====================================================
-- COMPLETE SETUP: LINES TABLE + MACHINES LINE COLUMN (FIXED)
-- =====================================================
-- This script creates the lines table first, then adds line column to machines
-- Run this script in order to avoid foreign key constraint errors

-- =====================================================
-- 1. CREATE THE LINES TABLE FIRST
-- =====================================================

-- Drop the lines table if it exists (to start fresh)
DROP TABLE IF EXISTS lines CASCADE;

-- Create the lines table
CREATE TABLE lines (
    line_id VARCHAR(50) PRIMARY KEY,
    line_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    im_machine_id VARCHAR(50),
    robot_machine_id VARCHAR(50),
    conveyor_machine_id VARCHAR(50),
    hoist_machine_id VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Maintenance')) DEFAULT 'Active',
    unit VARCHAR(50) DEFAULT 'Unit 1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_lines_status ON lines(status);
CREATE INDEX idx_lines_unit ON lines(unit);
CREATE INDEX idx_lines_im_machine ON lines(im_machine_id);
CREATE INDEX idx_lines_robot_machine ON lines(robot_machine_id);
CREATE INDEX idx_lines_conveyor_machine ON lines(conveyor_machine_id);
CREATE INDEX idx_lines_hoist_machine ON lines(hoist_machine_id);
CREATE INDEX idx_lines_line_name ON lines(line_name);

-- Enable RLS
ALTER TABLE lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all for authenticated users" ON lines
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lines_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_lines_updated_at_column
    BEFORE UPDATE ON lines
    FOR EACH ROW
    EXECUTE FUNCTION update_lines_updated_at_column();

-- Add comments to table and columns
COMMENT ON TABLE lines IS 'Production lines connecting IM machines, robots, conveyors, and hoists';
COMMENT ON COLUMN lines.line_id IS 'Unique identifier for the line (e.g., LINE-001)';
COMMENT ON COLUMN lines.line_name IS 'Name of the production line (e.g., JSW-7)';
COMMENT ON COLUMN lines.description IS 'Description of the production line';
COMMENT ON COLUMN lines.im_machine_id IS 'Reference to IM machine in this line';
COMMENT ON COLUMN lines.robot_machine_id IS 'Reference to robot machine in this line';
COMMENT ON COLUMN lines.conveyor_machine_id IS 'Reference to conveyor machine in this line';
COMMENT ON COLUMN lines.hoist_machine_id IS 'Reference to hoist machine in this line';
COMMENT ON COLUMN lines.status IS 'Current status of the line (Active, Inactive, Maintenance)';
COMMENT ON COLUMN lines.unit IS 'Factory unit identifier (Unit 1, Unit 2, etc.)';

-- =====================================================
-- 2. ADD LINE COLUMN TO MACHINES TABLE
-- =====================================================

-- Add the new line column (only if it doesn't exist)
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
-- 3. CREATE FOREIGN KEY CONSTRAINTS
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

-- Add foreign key constraints from lines to machines table
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
-- 4. INSERT SAMPLE LINES (REQUIRED FOR MACHINE ASSIGNMENT)
-- =====================================================

-- Insert sample production lines (this is required for machine assignment)
INSERT INTO lines (line_id, line_name, description, status, unit) VALUES
('LINE-001', 'JSW-7', 'JSW Line 7 with IM machine, robot, conveyor and hoist', 'Active', 'Unit 1'),
('LINE-002', 'JSW-8', 'JSW Line 8 with IM machine, robot, conveyor and hoist', 'Active', 'Unit 1'),
('LINE-003', 'TOYO-1', 'TOYO Line 1 with IM machine, robot, conveyor and hoist', 'Active', 'Unit 1'),
('LINE-004', 'HAIT-1', 'HAIT Line 1 with IM machine, robot, conveyor and hoist', 'Maintenance', 'Unit 1'),
('LINE-005', 'JSW-9', 'JSW Line 9 with IM machine, robot, conveyor and hoist', 'Inactive', 'Unit 1');

-- =====================================================
-- 5. ASSIGN MACHINES TO LINES (AFTER LINES ARE CREATED)
-- =====================================================

-- Assign JSW-1 to LINE-003 as requested (only if JSW-1 exists)
UPDATE machines 
SET line = 'LINE-003' 
WHERE machine_id = 'JSW-1';

-- Assign other machines to lines (examples - only if machines exist)
UPDATE machines SET line = 'LINE-001' WHERE machine_id = 'JSW-2';
UPDATE machines SET line = 'LINE-002' WHERE machine_id = 'JSW-3';
UPDATE machines SET line = 'LINE-001' WHERE machine_id = 'TOYO-1';
UPDATE machines SET line = 'LINE-004' WHERE machine_id = 'HAIT-1';

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Verify lines table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;

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

-- Check foreign key constraints
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

-- Check lines created
SELECT 
    line_id,
    line_name,
    description,
    status,
    unit
FROM lines
ORDER BY line_name;

-- Check machines assigned to lines
SELECT 
    m.machine_id,
    m.make,
    m.model,
    m.category,
    m.line,
    l.line_name,
    l.description
FROM machines m
LEFT JOIN lines l ON m.line = l.line_id
WHERE m.line IS NOT NULL
ORDER BY m.line, m.machine_id;

-- Check machines not assigned to any line
SELECT 
    machine_id,
    make,
    model,
    category
FROM machines 
WHERE line IS NULL
ORDER BY category, machine_id;

-- Count machines by line
SELECT 
    COALESCE(line, 'Unassigned') as line,
    COUNT(*) as machine_count
FROM machines 
GROUP BY line
ORDER BY line;

-- =====================================================
-- 7. SUMMARY
-- =====================================================

-- Show summary of the complete setup
SELECT 
    'Complete Setup Summary' as status,
    (SELECT COUNT(*) FROM lines) as total_lines,
    (SELECT COUNT(*) FROM machines) as total_machines,
    (SELECT COUNT(*) FROM machines WHERE line IS NOT NULL) as assigned_machines,
    (SELECT COUNT(*) FROM machines WHERE line IS NULL) as unassigned_machines;
