-- =====================================================
-- REPLACE ZONE COLUMN WITH LINE COLUMN IN MACHINES TABLE
-- =====================================================
-- This script replaces the zone column with a line column to track which line each machine belongs to

-- =====================================================
-- 1. BACKUP CURRENT DATA (OPTIONAL)
-- =====================================================

-- Create a backup of current zone data (optional)
-- CREATE TABLE IF NOT EXISTS machines_zone_backup AS 
-- SELECT machine_id, zone FROM machines WHERE zone IS NOT NULL;

-- =====================================================
-- 2. ADD THE NEW LINE COLUMN
-- =====================================================

-- Add the new line column
ALTER TABLE machines ADD COLUMN line VARCHAR(50);

-- Add comment to the new column
COMMENT ON COLUMN machines.line IS 'Reference to the line this machine belongs to (e.g., LINE-001, LINE-002)';

-- =====================================================
-- 3. MIGRATE EXISTING ZONE DATA TO LINE (OPTIONAL)
-- =====================================================

-- If you want to convert existing zone data to line format, uncomment and modify this:
-- UPDATE machines 
-- SET line = CASE 
--     WHEN zone = 'Zone A' THEN 'LINE-001'
--     WHEN zone = 'Zone B' THEN 'LINE-002'
--     WHEN zone = 'Zone C' THEN 'LINE-003'
--     ELSE NULL
-- END
-- WHERE zone IS NOT NULL;

-- =====================================================
-- 4. DROP THE OLD ZONE COLUMN
-- =====================================================

-- Drop the old zone column
ALTER TABLE machines DROP COLUMN zone;

-- =====================================================
-- 5. CREATE INDEX FOR PERFORMANCE
-- =====================================================

-- Create index on the new line column for better performance
CREATE INDEX idx_machines_line ON machines(line);

-- =====================================================
-- 6. ADD FOREIGN KEY CONSTRAINT (OPTIONAL)
-- =====================================================

-- Add foreign key constraint to link machines to lines table
-- This ensures data integrity - only valid line IDs can be assigned
ALTER TABLE machines 
ADD CONSTRAINT fk_machines_line 
FOREIGN KEY (line) REFERENCES lines(line_id) ON DELETE SET NULL;

-- =====================================================
-- 7. UPDATE MACHINE MASTER INTERFACE
-- =====================================================

-- Example: Assign JSW-1 to LINE-003
-- UPDATE machines 
-- SET line = 'LINE-003' 
-- WHERE machine_id = 'JSW-1';

-- Example: Assign other machines to lines
-- UPDATE machines SET line = 'LINE-001' WHERE machine_id = 'JSW-2';
-- UPDATE machines SET line = 'LINE-002' WHERE machine_id = 'JSW-3';

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Verify the new column structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'machines' 
AND column_name IN ('line')
ORDER BY ordinal_position;

-- Check machines assigned to lines
SELECT 
    m.machine_id,
    m.make,
    m.model,
    m.category,
    m.line,
    l.line_name,
    l.description
FROM machines m
LEFT JOIN lines l ON m.line = l.line_id
WHERE m.line IS NOT NULL
ORDER BY m.line, m.machine_id;

-- Check machines not assigned to any line
SELECT 
    machine_id,
    make,
    model,
    category
FROM machines 
WHERE line IS NULL
ORDER BY category, machine_id;

-- Count machines by line
SELECT 
    COALESCE(line, 'Unassigned') as line,
    COUNT(*) as machine_count
FROM machines 
GROUP BY line
ORDER BY line;

-- =====================================================
-- 9. SUMMARY
-- =====================================================

-- Show summary of the migration
SELECT 
    'Zone to Line Migration Complete' as status,
    COUNT(*) as total_machines,
    COUNT(CASE WHEN line IS NOT NULL THEN 1 END) as assigned_machines,
    COUNT(CASE WHEN line IS NULL THEN 1 END) as unassigned_machines
FROM machines;
