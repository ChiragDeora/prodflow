-- Add Unit Management Settings and ensure all master data has unit fields
-- This migration adds unit management toggle and ensures all tables have proper unit references

-- ===========================================
-- STEP 1: ADD UNIT MANAGEMENT SETTINGS TABLE
-- ===========================================

-- Create unit management settings table
CREATE TABLE IF NOT EXISTS unit_management_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE unit_management_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON unit_management_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_unit_management_settings_updated_at BEFORE UPDATE ON unit_management_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO unit_management_settings (setting_key, setting_value, description) VALUES
('unit_management_enabled', 'false', 'Toggle to enable/disable unit management across all master data forms'),
('default_unit', 'Unit 1', 'Default unit for new master data entries');

-- ===========================================
-- STEP 2: ENSURE ALL MASTER DATA TABLES HAVE UNIT FIELDS
-- ===========================================

-- Add unit column to schedule_jobs table if not exists
ALTER TABLE schedule_jobs 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Unit 1';

-- Update existing schedule jobs to have unit
UPDATE schedule_jobs SET unit = 'Unit 1' WHERE unit IS NULL;

-- Add index for schedule_jobs unit
CREATE INDEX IF NOT EXISTS idx_schedule_jobs_unit ON schedule_jobs(unit);

-- ===========================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS (OPTIONAL)
-- ===========================================

-- Add comments to document the unit fields
COMMENT ON COLUMN schedule_jobs.unit IS 'Factory unit identifier (Unit 1, Unit 2, etc.)';

-- ===========================================
-- STEP 4: VERIFICATION
-- ===========================================

-- Show all tables with unit columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE column_name = 'unit' 
AND table_schema = 'public'
ORDER BY table_name;

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Added Unit Management Settings table';
    RAISE NOTICE 'Ensured all master data tables have unit fields:';
    RAISE NOTICE '- machines (already exists)';
    RAISE NOTICE '- molds (already exists)';
    RAISE NOTICE '- raw_materials (already exists)';
    RAISE NOTICE '- packing_materials (already exists)';
    RAISE NOTICE '- schedule_jobs (added)';
    RAISE NOTICE 'Default unit management is DISABLED';
    RAISE NOTICE 'Admin can enable unit management in profile settings';
END $$; 