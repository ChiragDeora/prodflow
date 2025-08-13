-- Intelligent Mapping Functions for Line Creation
-- These functions help map Excel data to actual machine IDs dynamically

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

-- Function to get Robot machine by make and number
CREATE OR REPLACE FUNCTION get_robot_machine(p_make VARCHAR(50), p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = 'Robot' AND make = p_make
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get machine by category and number (flexible)
CREATE OR REPLACE FUNCTION get_machine_by_category(p_category VARCHAR(50), p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = p_category
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get machine by category, make, and number (flexible)
CREATE OR REPLACE FUNCTION get_machine_by_category_and_make(p_category VARCHAR(50), p_make VARCHAR(50), p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = p_category AND make = p_make
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get machine by category and model pattern (flexible)
CREATE OR REPLACE FUNCTION get_machine_by_category_and_model_pattern(p_category VARCHAR(50), p_model_pattern VARCHAR(100), p_number INTEGER DEFAULT 1) 
RETURNS VARCHAR(50) AS $$
DECLARE
    machine_id_result VARCHAR(50);
BEGIN
    SELECT machine_id INTO machine_id_result
    FROM machines 
    WHERE category = p_category 
    AND model ILIKE '%' || p_model_pattern || '%'
    ORDER BY machine_id
    LIMIT 1 OFFSET (p_number - 1);
    
    RETURN machine_id_result;
END;
$$ LANGUAGE plpgsql;

-- Usage Examples (for reference only, not to be executed):
-- SELECT get_im_machine('JSW', 1);                                    -- First JSW IM machine
-- SELECT get_robot_machine('Wittmaan', 2);                           -- Second Wittmaan robot
-- SELECT get_machine_by_category('Aux', 1);                          -- First Aux machine
-- SELECT get_machine_by_category_and_make('IM', 'JSW', 1);           -- First JSW IM machine
-- SELECT get_machine_by_category_and_model_pattern('Aux', '3000', 1); -- First Aux machine with '3000' in model
