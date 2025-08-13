-- Create lines table for production line management
-- This table connects different machines (IM, Robot, Conveyor, Hoist) into production lines

CREATE TABLE IF NOT EXISTS lines (
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
CREATE INDEX IF NOT EXISTS idx_lines_status ON lines(status);
CREATE INDEX IF NOT EXISTS idx_lines_unit ON lines(unit);
CREATE INDEX IF NOT EXISTS idx_lines_im_machine ON lines(im_machine_id);
CREATE INDEX IF NOT EXISTS idx_lines_robot_machine ON lines(robot_machine_id);
CREATE INDEX IF NOT EXISTS idx_lines_conveyor_machine ON lines(conveyor_machine_id);
CREATE INDEX IF NOT EXISTS idx_lines_hoist_machine ON lines(hoist_machine_id);

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

-- Insert some sample lines (you can modify these based on your actual line configurations)
-- Example: JSW-7 line with IM machine, robot, conveyor, and hoist
-- INSERT INTO lines (line_id, line_name, description, im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id, status, unit) VALUES
-- ('LINE-001', 'JSW-7', 'JSW Line 7 with IM machine, robot, conveyor and hoist', 'IM-001', 'ROBOT-002', 'CONV-004', 'HOIST-001', 'Active', 'Unit 1');

-- Add comment to table
COMMENT ON TABLE lines IS 'Production lines connecting IM machines, robots, conveyors, and hoists';
COMMENT ON COLUMN lines.line_id IS 'Unique identifier for the line (e.g., LINE-001)';
COMMENT ON COLUMN lines.line_name IS 'Name of the production line (e.g., JSW-7)';
COMMENT ON COLUMN lines.im_machine_id IS 'Reference to IM machine in this line';
COMMENT ON COLUMN lines.robot_machine_id IS 'Reference to robot machine in this line';
COMMENT ON COLUMN lines.conveyor_machine_id IS 'Reference to conveyor machine in this line';
COMMENT ON COLUMN lines.hoist_machine_id IS 'Reference to hoist machine in this line';
