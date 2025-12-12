-- Auto-calculate line status based on machine assignments and status
-- A line is 'Active' only if all 4 machines (IM, Robot, Conveyor, Hoist) are assigned and all are 'Active'
-- If ANY machine (including if the same machine is assigned to multiple positions) is in 'Maintenance', 
--   the line status is 'Maintenance'
-- Otherwise, the line status should be 'Inactive'

-- =====================================================
-- 1. CREATE FUNCTION TO CALCULATE LINE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_line_status(
    p_im_machine_id VARCHAR(50),
    p_robot_machine_id VARCHAR(50),
    p_conveyor_machine_id VARCHAR(50),
    p_hoist_machine_id VARCHAR(50)
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_im_status VARCHAR(20);
    v_robot_status VARCHAR(20);
    v_conveyor_status VARCHAR(20);
    v_hoist_status VARCHAR(20);
    v_has_maintenance BOOLEAN := false;
BEGIN
    -- Check if all 4 machines are assigned
    IF p_im_machine_id IS NULL OR 
       p_robot_machine_id IS NULL OR 
       p_conveyor_machine_id IS NULL OR 
       p_hoist_machine_id IS NULL THEN
        RETURN 'Inactive';
    END IF;

    -- Get status of each machine
    SELECT status INTO v_im_status FROM machines WHERE machine_id = p_im_machine_id;
    SELECT status INTO v_robot_status FROM machines WHERE machine_id = p_robot_machine_id;
    SELECT status INTO v_conveyor_status FROM machines WHERE machine_id = p_conveyor_machine_id;
    SELECT status INTO v_hoist_status FROM machines WHERE machine_id = p_hoist_machine_id;

    -- Check if any machine is missing (shouldn't happen due to FK, but safety check)
    IF v_im_status IS NULL OR 
       v_robot_status IS NULL OR 
       v_conveyor_status IS NULL OR 
       v_hoist_status IS NULL THEN
        RETURN 'Inactive';
    END IF;

    -- Check if ANY machine is in Maintenance - if so, line status is Maintenance
    -- This includes cases where the same machine might be assigned to multiple positions
    IF v_im_status = 'Maintenance' OR 
       v_robot_status = 'Maintenance' OR 
       v_conveyor_status = 'Maintenance' OR 
       v_hoist_status = 'Maintenance' THEN
        RETURN 'Maintenance';
    END IF;

    -- Check if all machines are Active
    IF v_im_status = 'Active' AND 
       v_robot_status = 'Active' AND 
       v_conveyor_status = 'Active' AND 
       v_hoist_status = 'Active' THEN
        RETURN 'Active';
    END IF;

    -- If any machine is not Active (e.g., 'Idle'), line is Inactive
    RETURN 'Inactive';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE FUNCTION TO UPDATE LINE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION update_line_status()
RETURNS TRIGGER AS $$
DECLARE
    v_new_status VARCHAR(20);
BEGIN
    -- Calculate new status based on machine assignments
    v_new_status := calculate_line_status(
        NEW.im_machine_id,
        NEW.robot_machine_id,
        NEW.conveyor_machine_id,
        NEW.hoist_machine_id
    );
    
    -- Update the status
    NEW.status := v_new_status;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE TRIGGER ON LINES TABLE
-- =====================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_line_status ON lines;

-- Create trigger to update line status when line is inserted or machine assignments are updated
CREATE TRIGGER trigger_update_line_status
    BEFORE INSERT OR UPDATE OF im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id
    ON lines
    FOR EACH ROW
    EXECUTE FUNCTION update_line_status();

-- Create trigger to recalculate status if someone tries to manually update it
CREATE TRIGGER trigger_recalculate_line_status
    BEFORE UPDATE OF status
    ON lines
    FOR EACH ROW
    EXECUTE FUNCTION update_line_status();

-- =====================================================
-- 4. CREATE FUNCTION TO UPDATE LINES WHEN MACHINE STATUS CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION update_lines_on_machine_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all lines that use this machine
    UPDATE lines
    SET status = calculate_line_status(
        im_machine_id,
        robot_machine_id,
        conveyor_machine_id,
        hoist_machine_id
    ),
    updated_at = NOW()
    WHERE im_machine_id = NEW.machine_id
       OR robot_machine_id = NEW.machine_id
       OR conveyor_machine_id = NEW.machine_id
       OR hoist_machine_id = NEW.machine_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGER ON MACHINES TABLE
-- =====================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_lines_on_machine_status_change ON machines;

-- Create trigger to update lines when machine status changes
CREATE TRIGGER trigger_update_lines_on_machine_status_change
    AFTER UPDATE OF status
    ON machines
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_lines_on_machine_status_change();

-- =====================================================
-- 6. UPDATE ALL EXISTING LINES WITH CORRECT STATUS
-- =====================================================

UPDATE lines
SET status = calculate_line_status(
    im_machine_id,
    robot_machine_id,
    conveyor_machine_id,
    hoist_machine_id
),
updated_at = NOW()
WHERE status != calculate_line_status(
    im_machine_id,
    robot_machine_id,
    conveyor_machine_id,
    hoist_machine_id
);

-- =====================================================
-- 7. ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION calculate_line_status IS 'Calculates line status based on machine assignments and their status. Returns Active only if all 4 machines are assigned and all are Active. Returns Maintenance if any machine is in Maintenance. Otherwise returns Inactive.';

COMMENT ON FUNCTION update_line_status IS 'Trigger function that automatically updates line status when machine assignments change.';

COMMENT ON FUNCTION update_lines_on_machine_status_change IS 'Trigger function that updates all lines when a machine status changes.';

