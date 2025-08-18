-- Clear all data from lines table for fresh import
-- This allows you to import lines data again without conflicts

-- Clear all existing lines data
DELETE FROM lines;

-- Verify the table is empty
SELECT 
    'Lines table cleared successfully' as status,
    COUNT(*) as remaining_lines,
    'Table is ready for fresh import' as message
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
