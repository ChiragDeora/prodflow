-- =====================================================
-- CORRECT MACHINE HEADERS FOR EXCEL TEMPLATE
-- =====================================================

-- Show the actual column structure of the machines table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'machines' 
ORDER BY ordinal_position;

-- Show sample data to understand the format
SELECT 
    machine_id,
    make,
    model,
    category,
    type,
    serial_no
FROM machines 
LIMIT 5;

-- Show unique categories and types
SELECT DISTINCT category, type
FROM machines 
ORDER BY category, type;
