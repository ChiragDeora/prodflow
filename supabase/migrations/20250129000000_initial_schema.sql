-- Production Scheduler Database Schema for Supabase
-- Execute these commands in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
    machine_id VARCHAR(50) PRIMARY KEY,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    capacity_tons INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    grinding_available BOOLEAN DEFAULT false,
    install_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Maintenance', 'Idle')) DEFAULT 'Active',
    zone VARCHAR(50) NOT NULL,
    purchase_date DATE NOT NULL,
    remarks TEXT,
    nameplate_image TEXT, -- Base64 encoded image or URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Molds table
CREATE TABLE IF NOT EXISTS molds (
    mold_id VARCHAR(50) PRIMARY KEY,
    mold_name VARCHAR(200) NOT NULL,
    maker VARCHAR(100) NOT NULL,
    cavities INTEGER NOT NULL,
    purchase_date DATE NOT NULL,
    compatible_machines TEXT[] NOT NULL, -- Array of machine IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule Jobs table
CREATE TABLE IF NOT EXISTS schedule_jobs (
    schedule_id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    shift VARCHAR(20) CHECK (shift IN ('Day', 'Evening', 'Night')) NOT NULL,
    machine_id VARCHAR(50) NOT NULL,
    mold_id VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color VARCHAR(50) NOT NULL,
    expected_pieces INTEGER NOT NULL,
    stacks_per_box INTEGER NOT NULL,
    pieces_per_stack INTEGER NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    is_done BOOLEAN DEFAULT false,
    done_timestamp TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(100),
    approval_status VARCHAR(20) CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_schedule_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_mold FOREIGN KEY (mold_id) REFERENCES molds(mold_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_zone ON machines(zone);
CREATE INDEX IF NOT EXISTS idx_molds_compatible_machines ON molds USING GIN(compatible_machines);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule_jobs(date);
CREATE INDEX IF NOT EXISTS idx_schedule_machine_date ON schedule_jobs(machine_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON schedule_jobs(approval_status);
CREATE INDEX IF NOT EXISTS idx_schedule_done ON schedule_jobs(is_done);

-- RLS (Row Level Security) policies
-- Enable RLS on all tables
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE molds ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_jobs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated users" ON machines
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON molds
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON schedule_jobs
    FOR ALL USING (auth.role() = 'authenticated');

-- For development, you might want to allow anonymous access
-- Uncomment these if you need anonymous access during development
-- CREATE POLICY "Allow all for anonymous users" ON machines
--     FOR ALL USING (true);

-- CREATE POLICY "Allow all for anonymous users" ON molds
--     FOR ALL USING (true);

-- CREATE POLICY "Allow all for anonymous users" ON schedule_jobs
--     FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_molds_updated_at BEFORE UPDATE ON molds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_jobs_updated_at BEFORE UPDATE ON schedule_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO machines (machine_id, make, model, capacity_tons, type, grinding_available, install_date, status, zone, purchase_date, remarks) VALUES
('IMM-01', 'JSW', 'J180AD', 180, 'Hydraulic', true, '2022-03-15', 'Active', 'Zone A', '2022-03-15', 'Primary production machine'),
('IMM-02', 'Toyo', 'Si-220V', 220, 'Electric', false, '2021-11-08', 'Active', 'Zone A', '2021-11-08', 'High precision machine'),
('IMM-03', 'JSW', 'J300EL', 300, 'Electric', true, '2020-07-22', 'Maintenance', 'Zone B', '2020-07-22', 'Under maintenance - hydraulic system'),
('IMM-04', 'Sumitomo', 'SH150', 150, 'Hydraulic', true, '2023-01-10', 'Active', 'Zone C', '2023-01-10', 'New installation'),
('IMM-05', 'Toyo', 'Si-400H', 400, 'Hybrid', false, '2019-09-30', 'Idle', 'Zone C', '2019-09-30', 'Backup machine for large parts')
ON CONFLICT (machine_id) DO NOTHING;

INSERT INTO molds (mold_id, mold_name, maker, cavities, purchase_date, compatible_machines) VALUES
('M001', 'Container Base 500ml', 'Toolcraft Inc', 8, '2022-01-15', ARRAY['IMM-01', 'IMM-02', 'IMM-04']),
('M002', 'Bottle Cap Standard', 'Precision Molds', 16, '2021-08-20', ARRAY['IMM-01', 'IMM-02', 'IMM-03']),
('M003', 'Handle Assembly', 'MoldTech Solutions', 4, '2023-02-10', ARRAY['IMM-03', 'IMM-05']),
('M004', 'Lid Complex 1L', 'Toolcraft Inc', 6, '2022-06-30', ARRAY['IMM-02', 'IMM-04', 'IMM-05']),
('M005', 'Spout Insert', 'Elite Tooling', 12, '2021-12-05', ARRAY['IMM-01', 'IMM-03', 'IMM-04'])
ON CONFLICT (mold_id) DO NOTHING;

INSERT INTO schedule_jobs (schedule_id, date, shift, machine_id, mold_id, start_time, end_time, color, expected_pieces, stacks_per_box, pieces_per_stack, created_by, is_done, done_timestamp, approved_by, approval_status) VALUES
('S001', '2025-06-22', 'Day', 'IMM-01', 'M001', '08:00', '12:00', 'Blue', 2400, 10, 50, 'John Doe', false, null, null, 'pending'),
('S002', '2025-06-22', 'Day', 'IMM-01', 'M003', '13:00', '18:00', 'Red', 3000, 12, 60, 'John Doe', false, null, null, 'pending'),
('S003', '2025-06-22', 'Day', 'IMM-02', 'M005', '06:00', '14:00', 'Green', 4800, 15, 40, 'Jane Smith', true, '2025-06-22 14:05:00+00', 'Admin', 'approved'),
('S004', '2025-06-22', 'Evening', 'IMM-02', 'M002', '14:30', '22:00', 'Yellow', 4500, 20, 45, 'Jane Smith', false, null, null, 'pending'),
('S005', '2025-06-22', 'Day', 'IMM-04', 'M005', '09:00', '17:00', 'Purple', 4000, 8, 80, 'Mike Johnson', false, null, null, 'pending')
ON CONFLICT (schedule_id) DO NOTHING; 