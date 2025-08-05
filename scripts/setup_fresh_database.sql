-- Fresh Database Setup Script
-- This script purges all data and sets up the comprehensive machine master structure

-- ===========================================
-- STEP 1: PURGE ALL EXISTING DATA
-- ===========================================

-- Clear all machine data
DELETE FROM machines;

-- Clear all mold data  
DELETE FROM molds;

-- Clear all schedule data (since it references machines and molds)
DELETE FROM schedule_jobs;

-- Clear all raw materials data
DELETE FROM raw_materials;

-- ===========================================
-- STEP 2: ADD COMPREHENSIVE MACHINE FIELDS
-- ===========================================

-- Add new fields to machines table
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS serial_no VARCHAR(200),
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);

-- ===========================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ===========================================

-- Add index for category field for better performance
CREATE INDEX IF NOT EXISTS idx_machines_category ON machines(category);

-- Add index for serial number searches
CREATE INDEX IF NOT EXISTS idx_machines_serial_no ON machines(serial_no);

-- ===========================================
-- STEP 4: VERIFICATION
-- ===========================================

-- Verify tables are empty
SELECT 'machines' as table_name, COUNT(*) as row_count FROM machines
UNION ALL
SELECT 'molds' as table_name, COUNT(*) as row_count FROM molds
UNION ALL
SELECT 'schedule_jobs' as table_name, COUNT(*) as row_count FROM schedule_jobs
UNION ALL
SELECT 'raw_materials' as table_name, COUNT(*) as row_count FROM raw_materials;

-- Show updated machines table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'machines'
ORDER BY ordinal_position;

-- Show sample of what the new structure supports
SELECT 
    'Sample Machine Structure' as info,
    'machine_id: VARCHAR(50)' as field1,
    'category: VARCHAR(50) - IM/Robot/Aux/Utility' as field2,
    'make: VARCHAR(100)' as field3,
    'model: VARCHAR(100)' as field4,
    'size: VARCHAR(50)' as field5,
    'serial_no: VARCHAR(200) - CLM/Inj format' as field6,
    'dimensions: VARCHAR(100) - LxBxH format' as field7,
    'mfg_date: VARCHAR(50)' as field8,
    'install_date: DATE' as field9; 