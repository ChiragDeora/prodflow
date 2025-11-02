-- Fix Units Table
-- This script ensures the units table exists and has the required data

-- ===========================================
-- STEP 1: CREATE TABLE IF NOT EXISTS
-- ===========================================

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    location VARCHAR(200),
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Maintenance')) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- STEP 2: ENABLE RLS AND CREATE POLICIES
-- ===========================================

-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all for authenticated users" ON units;
DROP POLICY IF EXISTS "Allow anonymous access for units" ON units;

-- Create new policies that allow access
CREATE POLICY "Allow all for authenticated users" ON units
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow anonymous access for units (needed for initial load)
CREATE POLICY "Allow anonymous access for units" ON units
    FOR SELECT USING (true);

-- ===========================================
-- STEP 3: INSERT DEFAULT UNITS
-- ===========================================

-- Insert default units (use ON CONFLICT to avoid duplicates)
INSERT INTO units (name, description, status) VALUES
('Unit 1', 'Bhimpore', 'Active'),
('Unit 2', 'Saregaon', 'Active'),
('Unit 3', 'Bilad', 'Active')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ===========================================
-- STEP 4: VERIFICATION
-- ===========================================

-- Show the units
SELECT name, description, status FROM units ORDER BY name;

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed units table';
    RAISE NOTICE 'Added default units: Unit 1 (Bhimpore), Unit 2 (Saregaon), Unit 3 (Bilad)';
    RAISE NOTICE 'Created RLS policies for authenticated and anonymous access';
END $$;
