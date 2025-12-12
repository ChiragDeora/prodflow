-- Enforce machine uniqueness constraints
-- One production line = 1 Hoist + 1 IM + 1 Robot + 1 Conveyor
-- The same IM machine cannot be assigned to 2 different production lines
-- The same Robot machine cannot be assigned to 2 different production lines
-- The same Conveyor machine cannot be assigned to 2 different production lines
-- The same Hoist machine cannot be assigned to 2 different production lines
-- Within a line, a machine cannot be assigned to multiple positions (IM, Robot, Conveyor, Hoist)

-- =====================================================
-- 1. CREATE FUNCTION TO CHECK MACHINE UNIQUENESS WITHIN LINE
-- =====================================================

CREATE OR REPLACE FUNCTION check_machine_uniqueness_within_line()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the same machine is assigned to multiple positions within the same line
    IF (NEW.im_machine_id IS NOT NULL AND NEW.im_machine_id = NEW.robot_machine_id) OR
       (NEW.im_machine_id IS NOT NULL AND NEW.im_machine_id = NEW.conveyor_machine_id) OR
       (NEW.im_machine_id IS NOT NULL AND NEW.im_machine_id = NEW.hoist_machine_id) OR
       (NEW.robot_machine_id IS NOT NULL AND NEW.robot_machine_id = NEW.conveyor_machine_id) OR
       (NEW.robot_machine_id IS NOT NULL AND NEW.robot_machine_id = NEW.hoist_machine_id) OR
       (NEW.conveyor_machine_id IS NOT NULL AND NEW.conveyor_machine_id = NEW.hoist_machine_id) THEN
        RAISE EXCEPTION 'A machine cannot be assigned to multiple positions within the same line. Machine: %', 
            COALESCE(NEW.im_machine_id, NEW.robot_machine_id, NEW.conveyor_machine_id, NEW.hoist_machine_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE FUNCTION TO CHECK MACHINE UNIQUENESS ACROSS LINES
-- =====================================================

CREATE OR REPLACE FUNCTION check_machine_uniqueness_across_lines()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_line_id VARCHAR(50);
BEGIN
    -- Check IM machine: Same IM machine cannot be in 2 different production lines
    IF NEW.im_machine_id IS NOT NULL THEN
        SELECT line_id INTO v_existing_line_id
        FROM lines
        WHERE line_id != COALESCE(NEW.line_id, '')
          AND im_machine_id = NEW.im_machine_id
        LIMIT 1;
        
        IF v_existing_line_id IS NOT NULL THEN
            RAISE EXCEPTION 'IM Machine % is already assigned to line %. The same IM machine cannot be assigned to 2 different production lines.', 
                NEW.im_machine_id, v_existing_line_id;
        END IF;
    END IF;
    
    -- Check Robot machine: Same Robot machine cannot be in 2 different production lines
    IF NEW.robot_machine_id IS NOT NULL THEN
        SELECT line_id INTO v_existing_line_id
        FROM lines
        WHERE line_id != COALESCE(NEW.line_id, '')
          AND robot_machine_id = NEW.robot_machine_id
        LIMIT 1;
        
        IF v_existing_line_id IS NOT NULL THEN
            RAISE EXCEPTION 'Robot Machine % is already assigned to line %. The same Robot machine cannot be assigned to 2 different production lines.', 
                NEW.robot_machine_id, v_existing_line_id;
        END IF;
    END IF;
    
    -- Check Conveyor machine: Same Conveyor machine cannot be in 2 different production lines
    IF NEW.conveyor_machine_id IS NOT NULL THEN
        SELECT line_id INTO v_existing_line_id
        FROM lines
        WHERE line_id != COALESCE(NEW.line_id, '')
          AND conveyor_machine_id = NEW.conveyor_machine_id
        LIMIT 1;
        
        IF v_existing_line_id IS NOT NULL THEN
            RAISE EXCEPTION 'Conveyor Machine % is already assigned to line %. The same Conveyor machine cannot be assigned to 2 different production lines.', 
                NEW.conveyor_machine_id, v_existing_line_id;
        END IF;
    END IF;
    
    -- Check Hoist machine: Same Hoist machine cannot be in 2 different production lines
    IF NEW.hoist_machine_id IS NOT NULL THEN
        SELECT line_id INTO v_existing_line_id
        FROM lines
        WHERE line_id != COALESCE(NEW.line_id, '')
          AND hoist_machine_id = NEW.hoist_machine_id
        LIMIT 1;
        
        IF v_existing_line_id IS NOT NULL THEN
            RAISE EXCEPTION 'Hoist Machine % is already assigned to line %. The same Hoist machine cannot be assigned to 2 different production lines.', 
                NEW.hoist_machine_id, v_existing_line_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_check_machine_uniqueness_within_line ON lines;
DROP TRIGGER IF EXISTS trigger_check_machine_uniqueness_across_lines ON lines;

-- Trigger to check machine uniqueness within a line
CREATE TRIGGER trigger_check_machine_uniqueness_within_line
    BEFORE INSERT OR UPDATE OF im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id
    ON lines
    FOR EACH ROW
    EXECUTE FUNCTION check_machine_uniqueness_within_line();

-- Trigger to check machine uniqueness across lines
CREATE TRIGGER trigger_check_machine_uniqueness_across_lines
    BEFORE INSERT OR UPDATE OF im_machine_id, robot_machine_id, conveyor_machine_id, hoist_machine_id
    ON lines
    FOR EACH ROW
    EXECUTE FUNCTION check_machine_uniqueness_across_lines();

-- =====================================================
-- 4. FIX ANY EXISTING DATA VIOLATIONS
-- =====================================================

-- Find and report any machines assigned to multiple lines
DO $$
DECLARE
    v_machine_id VARCHAR(50);
    v_line_count INTEGER;
BEGIN
    -- Check for machines in multiple lines
    FOR v_machine_id IN 
        SELECT DISTINCT machine_id
        FROM (
            SELECT im_machine_id AS machine_id FROM lines WHERE im_machine_id IS NOT NULL
            UNION ALL
            SELECT robot_machine_id AS machine_id FROM lines WHERE robot_machine_id IS NOT NULL
            UNION ALL
            SELECT conveyor_machine_id AS machine_id FROM lines WHERE conveyor_machine_id IS NOT NULL
            UNION ALL
            SELECT hoist_machine_id AS machine_id FROM lines WHERE hoist_machine_id IS NOT NULL
        ) all_machines
        GROUP BY machine_id
        HAVING COUNT(DISTINCT (
            SELECT line_id FROM lines 
            WHERE im_machine_id = all_machines.machine_id
               OR robot_machine_id = all_machines.machine_id
               OR conveyor_machine_id = all_machines.machine_id
               OR hoist_machine_id = all_machines.machine_id
        )) > 1
    LOOP
        RAISE NOTICE 'WARNING: Machine % is assigned to multiple lines. Please fix this manually.', v_machine_id;
    END LOOP;
    
    -- Check for machines in multiple positions within the same line
    FOR v_line_count IN
        SELECT COUNT(*)
        FROM lines
        WHERE (im_machine_id IS NOT NULL AND im_machine_id = robot_machine_id)
           OR (im_machine_id IS NOT NULL AND im_machine_id = conveyor_machine_id)
           OR (im_machine_id IS NOT NULL AND im_machine_id = hoist_machine_id)
           OR (robot_machine_id IS NOT NULL AND robot_machine_id = conveyor_machine_id)
           OR (robot_machine_id IS NOT NULL AND robot_machine_id = hoist_machine_id)
           OR (conveyor_machine_id IS NOT NULL AND conveyor_machine_id = hoist_machine_id)
    LOOP
        IF v_line_count > 0 THEN
            RAISE NOTICE 'WARNING: Found % line(s) with the same machine in multiple positions. Please fix this manually.', v_line_count;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- 5. ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION check_machine_uniqueness_within_line IS 'Ensures a machine cannot be assigned to multiple positions (IM, Robot, Conveyor, Hoist) within the same line.';

COMMENT ON FUNCTION check_machine_uniqueness_across_lines IS 'Ensures each machine type can only be assigned to one production line. Prevents the same IM/Robot/Conveyor/Hoist machine from being used in 2 different production lines. One production line = 1 Hoist + 1 IM + 1 Robot + 1 Conveyor.';

