-- =====================================================
-- CREATE LINES TABLE COMPLETE SETUP
-- =====================================================
-- This script creates the lines table from scratch with all necessary components

-- =====================================================
-- 1. CREATE THE LINES TABLE
-- =====================================================

-- Drop the table if it exists (to start fresh)
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

-- =====================================================
-- 2. CREATE FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraints to machines table
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
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX idx_lines_status ON lines(status);
CREATE INDEX idx_lines_unit ON lines(unit);
CREATE INDEX idx_lines_im_machine ON lines(im_machine_id);
CREATE INDEX idx_lines_robot_machine ON lines(robot_machine_id);
CREATE INDEX idx_lines_conveyor_machine ON lines(conveyor_machine_id);
CREATE INDEX idx_lines_hoist_machine ON lines(hoist_machine_id);
CREATE INDEX idx_lines_line_name ON lines(line_name);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all for authenticated users" ON lines
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

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

-- =====================================================
-- 6. ADD TABLE AND COLUMN COMMENTS
-- =====================================================

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
COMMENT ON COLUMN lines.created_at IS 'Timestamp when the line was created';
COMMENT ON COLUMN lines.updated_at IS 'Timestamp when the line was last updated';

-- =====================================================
-- 7. SAMPLE DATA (COMMENTED OUT)
-- =====================================================

-- Sample data insertion is commented out - uncomment and modify as needed
-- INSERT INTO lines (line_id, line_name, description, im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id, status, unit) VALUES
-- ('LINE-001', 'JSW-7', 'JSW Line 7 with IM machine, robot, conveyor and hoist', 'JSW-1', 'WITT-1', 'CONY-1', 'SEPL5208', 'Active', 'Unit 1'),
-- ('LINE-002', 'JSW-8', 'JSW Line 8 with IM machine, robot, conveyor and hoist', 'JSW-2', 'WITT-2', 'CONY-2', 'SEPL5209', 'Active', 'Unit 1'),
-- ('LINE-003', 'TOYO-1', 'TOYO Line 1 with IM machine, robot, conveyor and hoist', 'TOYO-1', 'WITT-3', 'CONY-3', 'SEPL5210', 'Active', 'Unit 1');

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;

-- Verify foreign key constraints
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

-- Verify indexes
SELECT 
    indexname, 
    tablename, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'lines'
ORDER BY indexname;

-- Test the relationships
SELECT 
    l.line_id,
    l.line_name,
    l.status,
    l.unit,
    im.machine_id as im_machine_id,
    im.make as im_make,
    im.model as im_model,
    rm.machine_id as robot_machine_id,
    rm.make as robot_make,
    rm.model as robot_model,
    cm.machine_id as conveyor_machine_id,
    cm.make as conveyor_make,
    cm.model as conveyor_model,
    hm.machine_id as hoist_machine_id,
    hm.make as hoist_make,
    hm.model as hoist_model
FROM lines l
LEFT JOIN machines im ON l.im_machine_id = im.machine_id
LEFT JOIN machines rm ON l.robot_machine_id = rm.machine_id
LEFT JOIN machines cm ON l.conveyor_machine_id = cm.machine_id
LEFT JOIN machines hm ON l.hoist_machine_id = hm.machine_id
ORDER BY l.line_name;

-- =====================================================
-- 9. SUMMARY
-- =====================================================

-- Show summary of what was created
SELECT 
    'Lines Table Created Successfully' as status,
    COUNT(*) as total_lines,
    'Table is ready for data insertion' as message
FROM lines;
