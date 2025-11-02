-- Purge all data from machine and mold master tables
-- This will clear all existing data to start fresh with the new comprehensive structure

-- Clear all machine data
DELETE FROM machines;

-- Clear all mold data  
DELETE FROM molds;

-- Clear all schedule data (since it references machines and molds)
DELETE FROM schedule_jobs;

-- Clear all raw materials data
DELETE FROM raw_materials;

-- Reset sequences if any (PostgreSQL doesn't use sequences for these tables, but good practice)
-- ALTER SEQUENCE IF EXISTS machines_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS molds_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'machines' as table_name, COUNT(*) as row_count FROM machines
UNION ALL
SELECT 'molds' as table_name, COUNT(*) as row_count FROM molds
UNION ALL
SELECT 'schedule_jobs' as table_name, COUNT(*) as row_count FROM schedule_jobs
UNION ALL
SELECT 'raw_materials' as table_name, COUNT(*) as row_count FROM raw_materials;

-- Show table structure for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('machines', 'molds', 'schedule_jobs', 'raw_materials')
ORDER BY table_name, ordinal_position; 