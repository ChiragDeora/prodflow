-- =====================================================
-- REMOVE ZONE COLUMN FROM MACHINES TABLE
-- =====================================================
-- This migration removes the legacy 'zone' column from the machines table
-- The 'line' column should be used instead for line assignments
-- =====================================================

-- Check if zone column exists and drop it
DO $$ 
BEGIN
    -- Check if zone column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'machines' 
        AND column_name = 'zone'
    ) THEN
        -- Drop the zone column
        ALTER TABLE public.machines DROP COLUMN zone;
        RAISE NOTICE 'Zone column successfully removed from machines table';
    ELSE
        RAISE NOTICE 'Zone column does not exist in machines table - no action needed';
    END IF;
END $$;

-- Verify the column has been removed
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'machines' 
AND column_name = 'zone';

-- If the query above returns no rows, the zone column has been successfully removed
