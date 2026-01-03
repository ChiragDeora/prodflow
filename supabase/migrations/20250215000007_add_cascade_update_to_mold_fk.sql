-- =====================================================
-- ADD ON UPDATE CASCADE TO MOLD FOREIGN KEY CONSTRAINTS
-- =====================================================
-- This migration modifies foreign key constraints to automatically cascade
-- mold_name updates to all referencing tables. This eliminates the need for
-- manual cascade updates in application code.
-- 
-- NOTE: Run this during low-traffic periods to avoid deadlocks.
-- If you encounter a deadlock, wait a few seconds and retry.
-- =====================================================

-- Use a DO block to make operations atomic and check before modifying
DO $$
DECLARE
    constraint_exists boolean;
    has_cascade boolean;
BEGIN
    -- =====================================================
    -- Update daily_weight_report constraint
    -- =====================================================
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_daily_weight_report_mold' 
        AND table_name = 'daily_weight_report'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        -- Check if it already has CASCADE
        SELECT EXISTS (
            SELECT 1 FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_name = 'fk_daily_weight_report_mold'
            AND tc.table_name = 'daily_weight_report'
            AND rc.update_rule = 'CASCADE'
        ) INTO has_cascade;
        
        IF NOT has_cascade THEN
            -- Drop and recreate with CASCADE
            ALTER TABLE daily_weight_report 
            DROP CONSTRAINT fk_daily_weight_report_mold;
            
            ALTER TABLE daily_weight_report 
            ADD CONSTRAINT fk_daily_weight_report_mold 
            FOREIGN KEY (mold_name) REFERENCES molds (mold_name) 
            ON UPDATE CASCADE;
            
            RAISE NOTICE 'Updated fk_daily_weight_report_mold with CASCADE';
        ELSE
            RAISE NOTICE 'fk_daily_weight_report_mold already has CASCADE - skipping';
        END IF;
    ELSE
        -- Create new constraint with CASCADE
        ALTER TABLE daily_weight_report 
        ADD CONSTRAINT fk_daily_weight_report_mold 
        FOREIGN KEY (mold_name) REFERENCES molds (mold_name) 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created fk_daily_weight_report_mold with CASCADE';
    END IF;
    
    -- =====================================================
    -- Update first_pieces_approval_report constraint
    -- =====================================================
    -- First, drop duplicate constraints (these don't have CASCADE)
    ALTER TABLE first_pieces_approval_report 
    DROP CONSTRAINT IF EXISTS fk_first_pieces_mold;
    
    ALTER TABLE first_pieces_approval_report 
    DROP CONSTRAINT IF EXISTS fk_first_pieces_approval_mold;
    
    -- Check if the main constraint exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_first_pieces_approval_report_mold' 
        AND table_name = 'first_pieces_approval_report'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        -- Check if it already has CASCADE
        SELECT EXISTS (
            SELECT 1 FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_name = 'fk_first_pieces_approval_report_mold'
            AND tc.table_name = 'first_pieces_approval_report'
            AND rc.update_rule = 'CASCADE'
        ) INTO has_cascade;
        
        IF NOT has_cascade THEN
            -- Drop and recreate with CASCADE
            ALTER TABLE first_pieces_approval_report 
            DROP CONSTRAINT fk_first_pieces_approval_report_mold;
            
            ALTER TABLE first_pieces_approval_report 
            ADD CONSTRAINT fk_first_pieces_approval_report_mold 
            FOREIGN KEY (mold_name) REFERENCES molds (mold_name) 
            ON UPDATE CASCADE;
            
            RAISE NOTICE 'Updated fk_first_pieces_approval_report_mold with CASCADE';
        ELSE
            RAISE NOTICE 'fk_first_pieces_approval_report_mold already has CASCADE - skipping';
        END IF;
    ELSE
        -- Create new constraint with CASCADE
        ALTER TABLE first_pieces_approval_report 
        ADD CONSTRAINT fk_first_pieces_approval_report_mold 
        FOREIGN KEY (mold_name) REFERENCES molds (mold_name) 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created fk_first_pieces_approval_report_mold with CASCADE';
    END IF;
END $$;

-- Verify constraints are created with CASCADE
SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.update_rule,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('daily_weight_report', 'first_pieces_approval_report', 'first_pieces_approval')
AND tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'molds'
ORDER BY tc.table_name, tc.constraint_name;
