-- =====================================================
-- DROP AND RECREATE LINES TABLE COMPLETELY
-- =====================================================

-- Drop the lines table completely (this will also drop all foreign key constraints)
DROP TABLE IF EXISTS lines CASCADE;

-- Create lines table for production line management
-- This table connects different machines (IM, Robot, Conveyor, Hoist) into production lines

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints to machines table
    CONSTRAINT fk_lines_im_machine FOREIGN KEY (im_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_lines_robot_machine FOREIGN KEY (robot_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_lines_conveyor_machine FOREIGN KEY (conveyor_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_lines_hoist_machine FOREIGN KEY (hoist_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_lines_status ON lines(status);
CREATE INDEX idx_lines_unit ON lines(unit);
CREATE INDEX idx_lines_im_machine ON lines(im_machine_id);
CREATE INDEX idx_lines_robot_machine ON lines(robot_machine_id);
CREATE INDEX idx_lines_conveyor_machine ON lines(conveyor_machine_id);
CREATE INDEX idx_lines_hoist_machine ON lines(hoist_machine_id);

-- Enable RLS
ALTER TABLE lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all for authenticated users" ON lines
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lines_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lines_updated_at_column
    BEFORE UPDATE ON lines
    FOR EACH ROW
    EXECUTE FUNCTION update_lines_updated_at_column();

-- Add comment to table
COMMENT ON TABLE lines IS 'Production lines connecting IM machines, robots, conveyors, and hoists';
COMMENT ON COLUMN lines.line_id IS 'Unique identifier for the line (e.g., LINE-001)';
COMMENT ON COLUMN lines.line_name IS 'Name of the production line (e.g., JSW-7)';
COMMENT ON COLUMN lines.im_machine_id IS 'Reference to IM machine in this line';
COMMENT ON COLUMN lines.robot_machine_id IS 'Reference to robot machine in this line';
COMMENT ON COLUMN lines.conveyor_machine_id IS 'Reference to conveyor machine in this line';
COMMENT ON COLUMN lines.hoist_machine_id IS 'Reference to hoist machine in this line';

-- =====================================================
-- VERIFY THE SETUP
-- =====================================================

-- Check if foreign key constraints exist
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

-- Check if lines table exists and has correct structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;

-- Show that the table is empty and ready for import
SELECT COUNT(*) as total_lines FROM lines;
