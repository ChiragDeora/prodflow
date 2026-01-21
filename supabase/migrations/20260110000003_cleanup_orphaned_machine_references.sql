-- =====================================================
-- CLEANUP ORPHANED MACHINE REFERENCES IN LINES TABLE
-- =====================================================
-- This migration cleans up any machine references in the lines table
-- that point to machines that no longer exist
-- =====================================================

-- Clean up orphaned IM machine references
UPDATE public.lines 
SET im_machine_id = NULL 
WHERE im_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.im_machine_id
);

-- Clean up orphaned Robot machine references
UPDATE public.lines 
SET robot_machine_id = NULL 
WHERE robot_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.robot_machine_id
);

-- Clean up orphaned Conveyor machine references
UPDATE public.lines 
SET conveyor_machine_id = NULL 
WHERE conveyor_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.conveyor_machine_id
);

-- Clean up orphaned Hoist machine references
UPDATE public.lines 
SET hoist_machine_id = NULL 
WHERE hoist_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.hoist_machine_id
);

-- Clean up orphaned Loader machine references (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lines' 
        AND column_name = 'loader_machine_id'
    ) THEN
        UPDATE public.lines 
        SET loader_machine_id = NULL 
        WHERE loader_machine_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 
            FROM public.machines 
            WHERE machines.machine_id = lines.loader_machine_id
        );
    END IF;
END $$;

-- Verify cleanup results
SELECT 
    'Orphaned IM machines' as check_type,
    COUNT(*) as orphaned_count
FROM public.lines 
WHERE im_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.im_machine_id
)

UNION ALL

SELECT 
    'Orphaned Robot machines' as check_type,
    COUNT(*) as orphaned_count
FROM public.lines 
WHERE robot_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.robot_machine_id
)

UNION ALL

SELECT 
    'Orphaned Conveyor machines' as check_type,
    COUNT(*) as orphaned_count
FROM public.lines 
WHERE conveyor_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.conveyor_machine_id
)

UNION ALL

SELECT 
    'Orphaned Hoist machines' as check_type,
    COUNT(*) as orphaned_count
FROM public.lines 
WHERE hoist_machine_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = lines.hoist_machine_id
);

-- If all counts are 0, the cleanup was successful
