-- =====================================================
-- ADD AUTOMATIC LINE STATUS LOGIC
-- =====================================================
-- This script adds logic to automatically set line status based on machine assignments
-- Status = 'Active' only when all 4 machines (IM, Robot, Conveyor, Hoist) are assigned
-- Status = 'Inactive' when any machine is missing

-- =====================================================
-- 1. CREATE FUNCTION TO UPDATE LINE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION update_line_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if all 4 machines are assigned
    IF NEW.im_machine_id IS NOT NULL 
       AND NEW.robot_machine_id IS NOT NULL 
       AND NEW.conveyor_machine_id IS NOT NULL 
       AND NEW.hoist_machine_id IS NOT NULL THEN
        NEW.status = 'Active';
    ELSE
        NEW.status = 'Inactive';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE TRIGGER TO AUTO-UPDATE STATUS
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_line_status ON lines;

-- Create trigger to automatically update status before insert/update
CREATE TRIGGER trigger_update_line_status
    BEFORE INSERT OR UPDATE ON lines
    FOR EACH ROW
    EXECUTE FUNCTION update_line_status();

-- =====================================================
-- 3. UPDATE EXISTING LINES BASED ON CURRENT ASSIGNMENTS
-- =====================================================

-- Update all existing lines to have correct status based on their machine assignments
UPDATE lines 
SET status = CASE 
    WHEN im_machine_id IS NOT NULL 
         AND robot_machine_id IS NOT NULL 
         AND conveyor_machine_id IS NOT NULL 
         AND hoist_machine_id IS NOT NULL 
    THEN 'Active'
    ELSE 'Inactive'
END;

-- =====================================================
-- 4. VERIFICATION QUERIES
-- =====================================================

-- Check which lines are now Active vs Inactive
SELECT 
    line_id,
    line_name,
    im_machine_id,
    robot_machine_id,
    conveyor_machine_id,
    hoist_machine_id,
    status,
    CASE 
        WHEN im_machine_id IS NOT NULL 
             AND robot_machine_id IS NOT NULL 
             AND conveyor_machine_id IS NOT NULL 
             AND hoist_machine_id IS NOT NULL 
        THEN 'All Machines Assigned'
        ELSE 'Missing Machines'
    END as assignment_status
FROM lines
ORDER BY line_id;

-- Show summary of Active vs Inactive lines
SELECT 
    status,
    COUNT(*) as line_count,
    STRING_AGG(line_id, ', ') as line_ids
FROM lines
GROUP BY status
ORDER BY status;

-- Show lines that are missing machines
SELECT 
    line_id,
    line_name,
    CASE WHEN im_machine_id IS NULL THEN 'Missing IM' ELSE 'IM: ' || im_machine_id END as im_status,
    CASE WHEN robot_machine_id IS NULL THEN 'Missing Robot' ELSE 'Robot: ' || robot_machine_id END as robot_status,
    CASE WHEN conveyor_machine_id IS NULL THEN 'Missing Conveyor' ELSE 'Conveyor: ' || conveyor_machine_id END as conveyor_status,
    CASE WHEN hoist_machine_id IS NULL THEN 'Missing Hoist' ELSE 'Hoist: ' || hoist_machine_id END as hoist_status,
    status
FROM lines
WHERE im_machine_id IS NULL 
   OR robot_machine_id IS NULL 
   OR conveyor_machine_id IS NULL 
   OR hoist_machine_id IS NULL
ORDER BY line_id;

-- =====================================================
-- 5. TEST THE LOGIC
-- =====================================================

-- Test: Try to update a line with missing machines (should become Inactive)
-- Uncomment the lines below to test the logic

-- UPDATE lines SET im_machine_id = NULL WHERE line_id = 'LINE-001';
-- SELECT line_id, status FROM lines WHERE line_id = 'LINE-001';

-- Test: Try to update a line with all machines (should become Active)
-- UPDATE lines SET im_machine_id = 'JSW-1' WHERE line_id = 'LINE-009';
-- SELECT line_id, status FROM lines WHERE line_id = 'LINE-009';

-- =====================================================
-- 6. SUMMARY
-- =====================================================

SELECT 
    'Line Status Logic Applied' as status,
    (SELECT COUNT(*) FROM lines WHERE status = 'Active') as active_lines,
    (SELECT COUNT(*) FROM lines WHERE status = 'Inactive') as inactive_lines,
    (SELECT COUNT(*) FROM lines) as total_lines;
