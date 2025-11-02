-- Purge lines table data
-- This script will clear all data from the lines table

-- Clear all data from lines table
DELETE FROM lines;

-- Reset the sequence if it exists (for auto-incrementing IDs)
-- Note: This is only needed if you have a sequence for line_id
-- ALTER SEQUENCE IF EXISTS lines_line_id_seq RESTART WITH 1;

-- Verify the table is empty
SELECT 
    'Lines table purged successfully' as status,
    COUNT(*) as remaining_records
FROM lines;

-- Show table structure to confirm it's still intact
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;
