-- =====================================================
-- FIX ORPHANED TOYO-3 REFERENCE AND ENSURE FK CONSTRAINTS
-- =====================================================
-- This migration fixes the immediate issue where TOYO-3 was deleted
-- but still shows as assigned to LINE-009 in the lines table.
-- It also ensures foreign key constraints are properly in place.
-- =====================================================

-- =====================================================
-- 1. CLEAN UP ORPHANED TOYO-3 REFERENCE IMMEDIATELY
-- =====================================================

-- Remove TOYO-3 from LINE-009 if it exists and the machine doesn't exist
UPDATE public.lines 
SET im_machine_id = NULL 
WHERE im_machine_id = 'TOYO-3'
AND NOT EXISTS (
    SELECT 1 
    FROM public.machines 
    WHERE machines.machine_id = 'TOYO-3'
);

-- =====================================================
-- 2. CLEAN UP ALL OTHER ORPHANED MACHINE REFERENCES
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

-- NOTE: Hoist machines are intentionally orphaned by choice - no cleanup performed

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

-- =====================================================
-- 3. ENSURE FOREIGN KEY CONSTRAINTS ARE IN PLACE
-- =====================================================

-- Ensure IM machine foreign key constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'lines' 
        AND constraint_name = 'fk_lines_im_machine'
    ) THEN
        ALTER TABLE public.lines 
        ADD CONSTRAINT fk_lines_im_machine 
        FOREIGN KEY (im_machine_id) 
        REFERENCES machines(machine_id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added fk_lines_im_machine constraint';
    ELSE
        RAISE NOTICE 'fk_lines_im_machine constraint already exists';
    END IF;
END $$;

-- Ensure Robot machine foreign key constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'lines' 
        AND constraint_name = 'fk_lines_robot_machine'
    ) THEN
        ALTER TABLE public.lines 
        ADD CONSTRAINT fk_lines_robot_machine 
        FOREIGN KEY (robot_machine_id) 
        REFERENCES machines(machine_id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added fk_lines_robot_machine constraint';
    ELSE
        RAISE NOTICE 'fk_lines_robot_machine constraint already exists';
    END IF;
END $$;

-- Ensure Conveyor machine foreign key constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'lines' 
        AND constraint_name = 'fk_lines_conveyor_machine'
    ) THEN
        ALTER TABLE public.lines 
        ADD CONSTRAINT fk_lines_conveyor_machine 
        FOREIGN KEY (conveyor_machine_id) 
        REFERENCES machines(machine_id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added fk_lines_conveyor_machine constraint';
    ELSE
        RAISE NOTICE 'fk_lines_conveyor_machine constraint already exists';
    END IF;
END $$;

-- Ensure Hoist machine foreign key constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'lines' 
        AND constraint_name = 'fk_lines_hoist_machine'
    ) THEN
        ALTER TABLE public.lines 
        ADD CONSTRAINT fk_lines_hoist_machine 
        FOREIGN KEY (hoist_machine_id) 
        REFERENCES machines(machine_id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added fk_lines_hoist_machine constraint';
    ELSE
        RAISE NOTICE 'fk_lines_hoist_machine constraint already exists';
    END IF;
END $$;

-- Ensure Loader machine foreign key constraint exists (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lines' 
        AND column_name = 'loader_machine_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'lines' 
            AND constraint_name = 'fk_lines_loader_machine'
        ) THEN
            ALTER TABLE public.lines 
            ADD CONSTRAINT fk_lines_loader_machine 
            FOREIGN KEY (loader_machine_id) 
            REFERENCES machines(machine_id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Added fk_lines_loader_machine constraint';
        ELSE
            RAISE NOTICE 'fk_lines_loader_machine constraint already exists';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 4. VERIFY CLEANUP RESULTS
-- =====================================================

-- Check for any remaining orphaned references
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
);

-- NOTE: Hoist machines are intentionally orphaned by choice - not included in verification

-- Verify LINE-009 specifically
SELECT 
    line_id,
    im_machine_id,
    robot_machine_id,
    conveyor_machine_id,
    hoist_machine_id
FROM public.lines 
WHERE line_id = 'LINE-009';

-- Verify all foreign key constraints are in place
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'lines' 
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;
