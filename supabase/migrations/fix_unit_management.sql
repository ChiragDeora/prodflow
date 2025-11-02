-- Fix Unit Management Settings
-- This script ensures the unit_management_settings table exists and has the required data

-- ===========================================
-- STEP 1: CREATE TABLE IF NOT EXISTS
-- ===========================================

CREATE TABLE IF NOT EXISTS unit_management_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- STEP 2: ENABLE RLS AND CREATE POLICIES
-- ===========================================

-- Enable RLS
ALTER TABLE unit_management_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all for authenticated users" ON unit_management_settings;
DROP POLICY IF EXISTS "Allow anonymous access for unit settings" ON unit_management_settings;

-- Create new policies that allow access
CREATE POLICY "Allow all for authenticated users" ON unit_management_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow anonymous access for unit settings (needed for initial load)
CREATE POLICY "Allow anonymous access for unit settings" ON unit_management_settings
    FOR SELECT USING (true);

-- ===========================================
-- STEP 3: INSERT DEFAULT SETTINGS
-- ===========================================

-- Insert default settings (use ON CONFLICT to avoid duplicates)
INSERT INTO unit_management_settings (setting_key, setting_value, description) VALUES
('unit_management_enabled', 'false', 'Toggle to enable/disable unit management across all master data forms'),
('default_unit', 'Unit 1', 'Default unit for new master data entries')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ===========================================
-- STEP 4: VERIFICATION
-- ===========================================

-- Show the settings
SELECT setting_key, setting_value, description FROM unit_management_settings ORDER BY setting_key;

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed unit_management_settings table';
    RAISE NOTICE 'Added default settings: unit_management_enabled=false, default_unit=Unit 1';
    RAISE NOTICE 'Created RLS policies for authenticated and anonymous access';
END $$;
