-- =====================================================
-- LINE MASTER SQL (UPDATED FOR ACTUAL DATABASE STRUCTURE)
-- =====================================================

-- Function to get IM machine by make and number
CREATE OR REPLACE FUNCTION get_im_machine(p_make VARCHAR(50), p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = 'IM' AND make = p_make
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get Robot machine by pattern and number
CREATE OR REPLACE FUNCTION get_robot_machine(p_pattern VARCHAR(50), p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = 'Robot' AND machine_id LIKE p_pattern || '%'
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get Conveyor machine by number (CONY pattern)
CREATE OR REPLACE FUNCTION get_conveyor_machine(p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = 'Aux' AND machine_id LIKE 'CONY%'
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get Hoist machine by capacity, break type, and number
CREATE OR REPLACE FUNCTION get_hoist_machine(p_capacity VARCHAR(20), p_break_type VARCHAR(20), p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = 'Aux' 
    AND machine_id LIKE 'SEPL%'
    AND model ILIKE '%' || p_capacity || '%'
    AND model ILIKE '%' || p_break_type || '%'
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE LINE INSERTIONS (FOR REFERENCE)
-- =====================================================

-- Example: Insert Line 1 with TOYO-1, WITT-1, CONY-1, Hoist-1
INSERT INTO lines (line_id, line_name, description, im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id, status, unit) VALUES
('LINE-001', 'Line 1', 'Production Line 1', 
 get_im_machine('TOYO', 1),
 get_robot_machine('WITT', 1),
 get_conveyor_machine(1),
 get_hoist_machine('2000', 'Without', 1),
 'Active', 'Unit 1');

-- Example: Insert Line 2 with JSW-1, WITT-2, CONY-2, Hoist-2
INSERT INTO lines (line_id, line_name, description, im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id, status, unit) VALUES
('LINE-002', 'Line 2', 'Production Line 2',
 get_im_machine('JSW', 1),
 get_robot_machine('WITT', 2),
 get_conveyor_machine(2),
 get_hoist_machine('3000', 'Without', 1),
 'Active', 'Unit 1');

-- =====================================================
-- QUICK REFERENCE QUERIES
-- =====================================================

-- Get all IM machines
SELECT machine_id, make, model, category FROM machines WHERE category = 'IM' ORDER BY machine_id;

-- Get all Robot machines (WITT pattern)
SELECT machine_id, make, model, category FROM machines WHERE category = 'Robot' AND machine_id LIKE 'WITT%' ORDER BY machine_id;

-- Get all Conveyor machines (CONY pattern)
SELECT machine_id, make, model, category FROM machines WHERE category = 'Aux' AND machine_id LIKE 'CONY%' ORDER BY machine_id;

-- Get all Hoist machines (SEPL pattern)
SELECT machine_id, make, model, category FROM machines WHERE category = 'Aux' AND machine_id LIKE 'SEPL%' ORDER BY machine_id;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Test the functions:
-- SELECT get_im_machine('JSW', 1);        -- First JSW IM machine
-- SELECT get_robot_machine('WITT', 1);    -- First WITT robot
-- SELECT get_conveyor_machine(1);         -- First CONY conveyor
-- SELECT get_hoist_machine('3000', 'With', 1); -- First 3000kg hoist with break
