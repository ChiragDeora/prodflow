-- =====================================================
-- SYNC MACHINE LINE ASSIGNMENTS WITH LINES TABLE
-- =====================================================
-- This migration ensures that machines' line field matches
-- their actual assignment in the lines table
-- =====================================================

-- Clear machine line assignments that don't match lines table
UPDATE public.machines 
SET line = NULL 
WHERE line IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.lines 
    WHERE (
        lines.im_machine_id = machines.machine_id 
        OR lines.robot_machine_id = machines.machine_id 
        OR lines.conveyor_machine_id = machines.machine_id 
        OR lines.hoist_machine_id = machines.machine_id 
        OR lines.loader_machine_id = machines.machine_id
    )
    AND lines.line_id = machines.line
);

-- Set machine line assignments based on lines table
UPDATE public.machines 
SET line = (
    SELECT line_id 
    FROM public.lines 
    WHERE (
        lines.im_machine_id = machines.machine_id 
        OR lines.robot_machine_id = machines.machine_id 
        OR lines.conveyor_machine_id = machines.machine_id 
        OR lines.hoist_machine_id = machines.machine_id 
        OR lines.loader_machine_id = machines.machine_id
    )
    LIMIT 1
)
WHERE machines.line IS NULL 
AND EXISTS (
    SELECT 1 
    FROM public.lines 
    WHERE (
        lines.im_machine_id = machines.machine_id 
        OR lines.robot_machine_id = machines.machine_id 
        OR lines.conveyor_machine_id = machines.machine_id 
        OR lines.hoist_machine_id = machines.machine_id 
        OR lines.loader_machine_id = machines.machine_id
    )
);

-- Verify sync results
SELECT 
    'Machines with mismatched line assignments' as check_type,
    COUNT(*) as count
FROM public.machines 
WHERE line IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.lines 
    WHERE (
        lines.im_machine_id = machines.machine_id 
        OR lines.robot_machine_id = machines.machine_id 
        OR lines.conveyor_machine_id = machines.machine_id 
        OR lines.hoist_machine_id = machines.machine_id 
        OR lines.loader_machine_id = machines.machine_id
    )
    AND lines.line_id = machines.line
);

-- Show machines that should have line assignments but don't
SELECT 
    'Machines assigned to lines but missing line field' as check_type,
    COUNT(*) as count
FROM public.machines 
WHERE machines.line IS NULL 
AND EXISTS (
    SELECT 1 
    FROM public.lines 
    WHERE (
        lines.im_machine_id = machines.machine_id 
        OR lines.robot_machine_id = machines.machine_id 
        OR lines.conveyor_machine_id = machines.machine_id 
        OR lines.hoist_machine_id = machines.machine_id 
        OR lines.loader_machine_id = machines.machine_id
    )
);
