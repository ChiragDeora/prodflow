-- Create units table for centralized unit management
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    location VARCHAR(200),
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Maintenance')) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_units_name ON units(name);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON units
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default units
INSERT INTO units (name, description, status) VALUES
('Unit 1', 'Bhimpore', 'Active'),
('Unit 2', 'Saregaon', 'Active'),
('Unit 3', 'Bilad', 'Active');

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Created units table for centralized unit management';
    RAISE NOTICE 'Added default units: Unit 1, Unit 2, Unit 3';
    RAISE NOTICE 'Ready for admin unit management!';
END $$; 