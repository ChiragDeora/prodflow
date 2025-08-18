-- =====================================================
-- LINE MASTER MANAGEMENT SQL SCRIPT
-- =====================================================
-- This script provides comprehensive SQL operations for managing production lines
-- Includes sample data, queries, maintenance functions, and data validation

-- =====================================================
-- 1. SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample production lines with machine associations
INSERT INTO lines (line_id, line_name, description, im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id, status, unit) VALUES
('LINE-001', 'JSW-7', 'JSW Line 7 with IM machine, robot, conveyor and hoist', 'JSW-1', 'WITT-1', 'CONY-1', 'SEPL5208', 'Active', 'Unit 1'),
('LINE-002', 'JSW-8', 'JSW Line 8 with IM machine, robot, conveyor and hoist', 'JSW-2', 'WITT-2', 'CONY-2', 'SEPL5209', 'Active', 'Unit 1'),
('LINE-003', 'TOYO-1', 'TOYO Line 1 with IM machine, robot, conveyor and hoist', 'TOYO-1', 'WITT-3', 'CONY-3', 'SEPL5210', 'Active', 'Unit 1'),
('LINE-004', 'HAIT-1', 'HAIT Line 1 with IM machine, robot, conveyor and hoist', 'HAIT-1', 'WITT-4', 'CONY-4', 'SEPL5211', 'Maintenance', 'Unit 1'),
('LINE-005', 'JSW-9', 'JSW Line 9 with IM machine, robot, conveyor and hoist', 'JSW-3', 'WITT-5', 'CONY-5', 'SEPL5212', 'Inactive', 'Unit 1');

-- =====================================================
-- 2. USEFUL QUERIES
-- =====================================================

-- Get all lines with machine details
SELECT 
    l.line_id,
    l.line_name,
    l.description,
    l.status,
    l.unit,
    im.machine_id as im_machine_id,
    im.make as im_make,
    im.model as im_model,
    rm.machine_id as robot_machine_id,
    rm.make as robot_make,
    rm.model as robot_model,
    cm.machine_id as conveyor_machine_id,
    cm.make as conveyor_make,
    cm.model as conveyor_model,
    hm.machine_id as hoist_machine_id,
    hm.make as hoist_make,
    hm.model as hoist_model
FROM lines l
LEFT JOIN machines im ON l.im_machine_id = im.machine_id
LEFT JOIN machines rm ON l.robot_machine_id = rm.machine_id
LEFT JOIN machines cm ON l.conveyor_machine_id = cm.machine_id
LEFT JOIN machines hm ON l.hoist_machine_id = hm.machine_id
ORDER BY l.line_name;

-- Get lines by status
SELECT line_id, line_name, status, unit FROM lines WHERE status = 'Active' ORDER BY line_name;

-- Get lines by unit
SELECT line_id, line_name, status, unit FROM lines WHERE unit = 'Unit 1' ORDER BY line_name;

-- Get lines with missing machine associations
SELECT 
    line_id, 
    line_name,
    CASE 
        WHEN im_machine_id IS NULL THEN 'Missing IM Machine'
        WHEN robot_machine_id IS NULL THEN 'Missing Robot'
        WHEN conveyor_machine_id IS NULL THEN 'Missing Conveyor'
        WHEN hoist_machine_id IS NULL THEN 'Missing Hoist'
        ELSE 'Complete'
    END as missing_components
FROM lines
WHERE im_machine_id IS NULL 
   OR robot_machine_id IS NULL 
   OR conveyor_machine_id IS NULL 
   OR hoist_machine_id IS NULL;

-- Count lines by status
SELECT 
    status,
    COUNT(*) as count
FROM lines 
GROUP BY status
ORDER BY count DESC;

-- Count lines by unit
SELECT 
    unit,
    COUNT(*) as count
FROM lines 
GROUP BY unit
ORDER BY unit;

-- =====================================================
-- 3. MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to get available IM machines for a line
CREATE OR REPLACE FUNCTION get_available_im_machines(p_unit VARCHAR(50) DEFAULT NULL)
RETURNS TABLE(machine_id VARCHAR(50), make VARCHAR(50), model VARCHAR(100), category VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT m.machine_id, m.make, m.model, m.category
    FROM machines m
    WHERE m.category = 'IM'
    AND (p_unit IS NULL OR m.unit = p_unit)
    AND m.machine_id NOT IN (
        SELECT COALESCE(im_machine_id, '') 
        FROM lines 
        WHERE im_machine_id IS NOT NULL
    )
    ORDER BY m.make, m.model;
END;
$$ LANGUAGE plpgsql;

-- Function to get available robot machines for a line
CREATE OR REPLACE FUNCTION get_available_robot_machines(p_unit VARCHAR(50) DEFAULT NULL)
RETURNS TABLE(machine_id VARCHAR(50), make VARCHAR(50), model VARCHAR(100), category VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT m.machine_id, m.make, m.model, m.category
    FROM machines m
    WHERE m.category = 'Robot'
    AND (p_unit IS NULL OR m.unit = p_unit)
    AND m.machine_id NOT IN (
        SELECT COALESCE(robot_machine_id, '') 
        FROM lines 
        WHERE robot_machine_id IS NOT NULL
    )
    ORDER BY m.make, m.model;
END;
$$ LANGUAGE plpgsql;

-- Function to get available conveyor machines for a line
CREATE OR REPLACE FUNCTION get_available_conveyor_machines(p_unit VARCHAR(50) DEFAULT NULL)
RETURNS TABLE(machine_id VARCHAR(50), make VARCHAR(50), model VARCHAR(100), category VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT m.machine_id, m.make, m.model, m.category
    FROM machines m
    WHERE m.category = 'Aux' AND m.machine_id LIKE 'CONY%'
    AND (p_unit IS NULL OR m.unit = p_unit)
    AND m.machine_id NOT IN (
        SELECT COALESCE(conveyor_machine_id, '') 
        FROM lines 
        WHERE conveyor_machine_id IS NOT NULL
    )
    ORDER BY m.machine_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get available hoist machines for a line
CREATE OR REPLACE FUNCTION get_available_hoist_machines(p_unit VARCHAR(50) DEFAULT NULL)
RETURNS TABLE(machine_id VARCHAR(50), make VARCHAR(50), model VARCHAR(100), category VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT m.machine_id, m.make, m.model, m.category
    FROM machines m
    WHERE m.category = 'Aux' AND m.machine_id LIKE 'SEPL%'
    AND (p_unit IS NULL OR m.unit = p_unit)
    AND m.machine_id NOT IN (
        SELECT COALESCE(hoist_machine_id, '') 
        FROM lines 
        WHERE hoist_machine_id IS NOT NULL
    )
    ORDER BY m.machine_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate line configuration
CREATE OR REPLACE FUNCTION validate_line_configuration(p_line_id VARCHAR(50))
RETURNS TABLE(validation_result TEXT, details TEXT) AS $$
DECLARE
    line_record RECORD;
    validation_message TEXT;
    details_message TEXT;
BEGIN
    -- Get line details
    SELECT * INTO line_record FROM lines WHERE line_id = p_line_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Line not found'::TEXT;
        RETURN;
    END IF;
    
    -- Initialize validation
    validation_message := 'VALID';
    details_message := '';
    
    -- Check if IM machine exists
    IF line_record.im_machine_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = line_record.im_machine_id) THEN
            validation_message := 'INVALID';
            details_message := details_message || 'IM machine not found; ';
        END IF;
    ELSE
        details_message := details_message || 'No IM machine assigned; ';
    END IF;
    
    -- Check if robot exists
    IF line_record.robot_machine_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = line_record.robot_machine_id) THEN
            validation_message := 'INVALID';
            details_message := details_message || 'Robot machine not found; ';
        END IF;
    ELSE
        details_message := details_message || 'No robot assigned; ';
    END IF;
    
    -- Check if conveyor exists
    IF line_record.conveyor_machine_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = line_record.conveyor_machine_id) THEN
            validation_message := 'INVALID';
            details_message := details_message || 'Conveyor machine not found; ';
        END IF;
    ELSE
        details_message := details_message || 'No conveyor assigned; ';
    END IF;
    
    -- Check if hoist exists
    IF line_record.hoist_machine_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = line_record.hoist_machine_id) THEN
            validation_message := 'INVALID';
            details_message := details_message || 'Hoist machine not found; ';
        END IF;
    ELSE
        details_message := details_message || 'No hoist assigned; ';
    END IF;
    
    RETURN QUERY SELECT validation_message::TEXT, details_message::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. DATA VALIDATION QUERIES
-- =====================================================

-- Check for duplicate machine assignments
SELECT 
    machine_id,
    machine_type,
    COUNT(*) as assignment_count,
    array_agg(line_id) as assigned_to_lines
FROM (
    SELECT im_machine_id as machine_id, 'IM' as machine_type, line_id FROM lines WHERE im_machine_id IS NOT NULL
    UNION ALL
    SELECT robot_machine_id as machine_id, 'Robot' as machine_type, line_id FROM lines WHERE robot_machine_id IS NOT NULL
    UNION ALL
    SELECT conveyor_machine_id as machine_id, 'Conveyor' as machine_type, line_id FROM lines WHERE conveyor_machine_id IS NOT NULL
    UNION ALL
    SELECT hoist_machine_id as machine_id, 'Hoist' as machine_type, line_id FROM lines WHERE hoist_machine_id IS NOT NULL
) machine_assignments
GROUP BY machine_id, machine_type
HAVING COUNT(*) > 1
ORDER BY assignment_count DESC;

-- Check for orphaned machine references
SELECT 
    'IM Machine' as machine_type,
    l.im_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.im_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.im_machine_id)

UNION ALL

SELECT 
    'Robot' as machine_type,
    l.robot_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.robot_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.robot_machine_id)

UNION ALL

SELECT 
    'Conveyor' as machine_type,
    l.conveyor_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.conveyor_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.conveyor_machine_id)

UNION ALL

SELECT 
    'Hoist' as machine_type,
    l.hoist_machine_id as machine_id,
    l.line_id
FROM lines l
WHERE l.hoist_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines m WHERE m.machine_id = l.hoist_machine_id);

-- =====================================================
-- 5. CLEANUP AND MAINTENANCE
-- =====================================================

-- Clean up orphaned machine references
UPDATE lines 
SET im_machine_id = NULL 
WHERE im_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.im_machine_id);

UPDATE lines 
SET robot_machine_id = NULL 
WHERE robot_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.robot_machine_id);

UPDATE lines 
SET conveyor_machine_id = NULL 
WHERE conveyor_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.conveyor_machine_id);

UPDATE lines 
SET hoist_machine_id = NULL 
WHERE hoist_machine_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_id = lines.hoist_machine_id);

-- =====================================================
-- 6. USAGE EXAMPLES
-- =====================================================

-- Example: Get available machines for a new line
-- SELECT * FROM get_available_im_machines('Unit 1');
-- SELECT * FROM get_available_robot_machines('Unit 1');
-- SELECT * FROM get_available_conveyor_machines('Unit 1');
-- SELECT * FROM get_available_hoist_machines('Unit 1');

-- Example: Validate a line configuration
-- SELECT * FROM validate_line_configuration('LINE-001');

-- Example: Get line summary statistics
SELECT 
    'Total Lines' as metric,
    COUNT(*) as value
FROM lines

UNION ALL

SELECT 
    'Active Lines',
    COUNT(*)
FROM lines 
WHERE status = 'Active'

UNION ALL

SELECT 
    'Lines Under Maintenance',
    COUNT(*)
FROM lines 
WHERE status = 'Maintenance'

UNION ALL

SELECT 
    'Complete Lines',
    COUNT(*)
FROM lines 
WHERE im_machine_id IS NOT NULL 
  AND robot_machine_id IS NOT NULL 
  AND conveyor_machine_id IS NOT NULL 
  AND hoist_machine_id IS NOT NULL;
