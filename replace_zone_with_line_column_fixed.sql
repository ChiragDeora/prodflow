-- =====================================================
-- ADD LINE COLUMN TO MACHINES TABLE (ZONE ALREADY DROPPED)
-- =====================================================
-- This script adds a line column to track which line each machine belongs to
-- Note: Zone column has already been dropped, so we skip that step

-- =====================================================
-- 1. CHECK CURRENT TABLE STRUCTURE
-- =====================================================

-- Check current columns in machines table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'machines' 
ORDER BY ordinal_position;

-- =====================================================
-- 2. ADD THE NEW LINE COLUMN
-- =====================================================

-- Add the new line column (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machines' AND column_name = 'line'
    ) THEN
        ALTER TABLE machines ADD COLUMN line VARCHAR(50);
        RAISE NOTICE 'Line column added successfully';
    ELSE
        RAISE NOTICE 'Line column already exists';
    END IF;
END $$;

-- Add comment to the new column
COMMENT ON COLUMN machines.line IS 'Reference to the line this machine belongs to (e.g., LINE-001, LINE-002)';

-- =====================================================
-- 3. CREATE INDEX FOR PERFORMANCE
-- =====================================================

-- Create index on the new line column for better performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_machines_line ON machines(line);

-- =====================================================
-- 4. ADD FOREIGN KEY CONSTRAINT
-- =====================================================

-- Add foreign key constraint to link machines to lines table
-- This ensures data integrity - only valid line IDs can be assigned
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'machines' 
        AND constraint_name = 'fk_machines_line'
    ) THEN
        ALTER TABLE machines 
        ADD CONSTRAINT fk_machines_line 
        FOREIGN KEY (line) REFERENCES lines(line_id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- =====================================================
-- 5. ASSIGN MACHINES TO LINES (EXAMPLES)
-- =====================================================

-- Example: Assign JSW-1 to LINE-003
UPDATE machines 
SET line = 'LINE-003' 
WHERE machine_id = 'JSW-1';

-- Example: Assign other machines to lines (uncomment and modify as needed)
-- UPDATE machines SET line = 'LINE-001' WHERE machine_id = 'JSW-2';
-- UPDATE machines SET line = 'LINE-002' WHERE machine_id = 'JSW-3';
-- UPDATE machines SET line = 'LINE-001' WHERE machine_id = 'TOYO-1';
-- UPDATE machines SET line = 'LINE-002' WHERE machine_id = 'HAIT-1';

-- =====================================================
-- 6. VERIFICATION QUERIES
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

-- Check foreign key constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'machines' 
AND tc.constraint_type = 'FOREIGN KEY'
AND tc.constraint_name = 'fk_machines_line';

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
-- 7. SUMMARY
-- =====================================================

-- Show summary of the setup
SELECT 
    'Line Column Setup Complete' as status,
    COUNT(*) as total_machines,
    COUNT(CASE WHEN line IS NOT NULL THEN 1 END) as assigned_machines,
    COUNT(CASE WHEN line IS NULL THEN 1 END) as unassigned_machines
FROM machines;
