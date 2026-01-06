-- ============================================================================
-- FIX DPR MACHINE FOREIGN KEY CONSTRAINT - REFERENCE LINES TABLE
-- ============================================================================
-- The machine_no in dpr_machine_entries should reference lines(line_id), not machines(machine_id)
-- This migration drops the old FK to machines and adds a new FK to lines
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lines') THEN
        -- Drop the old foreign key constraint to machines table
        ALTER TABLE dpr_machine_entries
            DROP CONSTRAINT IF EXISTS fk_dpr_machine_entries_machine;
        
        -- Add new foreign key constraint to lines table
        ALTER TABLE dpr_machine_entries
            ADD CONSTRAINT fk_dpr_machine_entries_line 
            FOREIGN KEY (machine_no) REFERENCES lines(line_id) ON DELETE SET NULL;
        
        -- Update comment to reflect the correct reference
        COMMENT ON COLUMN dpr_machine_entries.machine_no IS 'Line identifier - references lines(line_id). DPR entries are organized by production line.';
    END IF;
END $$;

