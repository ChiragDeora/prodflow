-- =====================================================
-- ADD LOADER_MACHINE_ID COLUMN TO LINES TABLE
-- =====================================================
-- This migration adds the loader_machine_id column to the lines table
-- The loader is optional - not all lines require a loader machine
-- =====================================================

-- Add loader_machine_id column to lines table
DO $$ 
BEGIN
    -- Check if loader_machine_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lines' 
        AND column_name = 'loader_machine_id'
    ) THEN
        -- Add the loader_machine_id column
        ALTER TABLE public.lines 
        ADD COLUMN loader_machine_id VARCHAR(50);
        
        -- Add comment to the column
        COMMENT ON COLUMN public.lines.loader_machine_id IS 'Optional loader machine assigned to this line. Not all lines require a loader.';
        
        -- Add foreign key constraint to machines table
        ALTER TABLE public.lines
        ADD CONSTRAINT fk_lines_loader_machine 
        FOREIGN KEY (loader_machine_id) 
        REFERENCES machines(machine_id) 
        ON DELETE SET NULL;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_lines_loader_machine 
        ON public.lines(loader_machine_id);
        
        RAISE NOTICE 'loader_machine_id column successfully added to lines table';
    ELSE
        RAISE NOTICE 'loader_machine_id column already exists in lines table - no action needed';
    END IF;
END $$;

-- Verify the column has been added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'lines' 
AND column_name = 'loader_machine_id';

-- If the query above returns a row, the loader_machine_id column has been successfully added
