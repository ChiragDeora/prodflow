-- =====================================================
-- CREATE LINES TABLE SCHEMA
-- =====================================================

-- Create lines table for production line management
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

-- Verify the table was created
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;
