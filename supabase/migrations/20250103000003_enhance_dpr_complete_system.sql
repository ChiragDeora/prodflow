-- ============================================================================
-- ENHANCE DPR SYSTEM - COMPLETE WITH ALL HEADERS, CHANGEOVER, EXCEL UPLOAD
-- ============================================================================
-- This migration enhances the DPR system with:
-- 1. Complete DPR table with all headers and stock ledger integration
-- 2. Full changeover data functionality
-- 3. Excel upload mode support (reference data vs active DPR)
-- 4. No RLS policies for API access
-- 5. All mappings and calculated fields
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: ENHANCE DPR_DATA TABLE
-- ============================================================================

-- Add entry_type to distinguish between CREATE (active) and EXCEL_UPLOAD (reference)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        -- Add entry_type field
        ALTER TABLE dpr_data 
            ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) DEFAULT 'CREATE' 
                CHECK (entry_type IN ('CREATE', 'EXCEL_UPLOAD'));
        
        -- Add Excel upload reference fields
        ALTER TABLE dpr_data
            ADD COLUMN IF NOT EXISTS excel_file_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS excel_uploaded_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS excel_uploaded_by VARCHAR(255),
            ADD COLUMN IF NOT EXISTS is_reference_data BOOLEAN DEFAULT FALSE;
        
        -- Add stock ledger fields (if not already added by stock ledger migration)
        ALTER TABLE dpr_data 
            ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' 
                CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
            ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);
        
        -- Add additional DPR header fields
        ALTER TABLE dpr_data
            ADD COLUMN IF NOT EXISTS production_manager VARCHAR(255),
            ADD COLUMN IF NOT EXISTS quality_incharge VARCHAR(255),
            ADD COLUMN IF NOT EXISTS remarks TEXT,
            ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'PENDING' 
                CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
            ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_dpr_data_entry_type ON dpr_data(entry_type);
        CREATE INDEX IF NOT EXISTS idx_dpr_data_stock_status ON dpr_data(stock_status);
        CREATE INDEX IF NOT EXISTS idx_dpr_data_approval_status ON dpr_data(approval_status);
        CREATE INDEX IF NOT EXISTS idx_dpr_data_is_reference ON dpr_data(is_reference_data);
        
        -- Set is_reference_data based on entry_type
        UPDATE dpr_data 
        SET is_reference_data = (entry_type = 'EXCEL_UPLOAD')
        WHERE is_reference_data IS NULL;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: ENHANCE DPR_MACHINE_ENTRIES TABLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        -- Add changeover-specific fields
        ALTER TABLE dpr_machine_entries
            ADD COLUMN IF NOT EXISTS is_changeover BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS changeover_start_time TIME,
            ADD COLUMN IF NOT EXISTS changeover_end_time TIME,
            ADD COLUMN IF NOT EXISTS changeover_duration_min DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS previous_product VARCHAR(255),
            ADD COLUMN IF NOT EXISTS changeover_reason TEXT;
        
        -- Add stoppage summary fields (if not already added)
        ALTER TABLE dpr_machine_entries
            ADD COLUMN IF NOT EXISTS stoppage_reason TEXT,
            ADD COLUMN IF NOT EXISTS stoppage_start TIME,
            ADD COLUMN IF NOT EXISTS stoppage_end TIME,
            ADD COLUMN IF NOT EXISTS stoppage_total_min DECIMAL(10, 2);
        
        -- Add additional production tracking fields
        ALTER TABLE dpr_machine_entries
            ADD COLUMN IF NOT EXISTS setup_time_min DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS cleaning_time_min DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS material_consumption_kgs DECIMAL(10, 3),
            ADD COLUMN IF NOT EXISTS material_waste_kgs DECIMAL(10, 3),
            ADD COLUMN IF NOT EXISTS efficiency_percent DECIMAL(5, 2),
            ADD COLUMN IF NOT EXISTS oee_percent DECIMAL(5, 2); -- Overall Equipment Effectiveness
        
        -- Add quality check fields
        ALTER TABLE dpr_machine_entries
            ADD COLUMN IF NOT EXISTS first_piece_approved BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS first_piece_approved_by VARCHAR(255),
            ADD COLUMN IF NOT EXISTS first_piece_approved_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS quality_issues TEXT,
            ADD COLUMN IF NOT EXISTS rework_qty_nos INTEGER DEFAULT 0;
        
        -- Sync is_changeover with section_type
        UPDATE dpr_machine_entries 
        SET is_changeover = (section_type = 'changeover')
        WHERE is_changeover IS NULL OR is_changeover != (section_type = 'changeover');
        
        -- Create indexes for changeover queries
        CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_is_changeover ON dpr_machine_entries(is_changeover);
        CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_product ON dpr_machine_entries(product);
        CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_section_type ON dpr_machine_entries(section_type);
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: FUNCTIONS FOR CHANGEOVER CALCULATIONS
-- ============================================================================

-- Function to calculate changeover duration
CREATE OR REPLACE FUNCTION calculate_changeover_duration(
    p_start_time TIME,
    p_end_time TIME
) RETURNS DECIMAL(10, 2) AS $$
BEGIN
    IF p_start_time IS NULL OR p_end_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Handle time wrap-around (end time next day)
    IF p_end_time < p_start_time THEN
        -- End time is next day
        RETURN ((24 * 60) - EXTRACT(EPOCH FROM (p_start_time - p_end_time)) / 60);
    ELSE
        RETURN EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate efficiency
CREATE OR REPLACE FUNCTION calculate_efficiency(
    p_actual_qty INTEGER,
    p_target_qty INTEGER,
    p_run_time_min DECIMAL
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_efficiency DECIMAL(5, 2);
BEGIN
    IF p_target_qty IS NULL OR p_target_qty = 0 OR p_run_time_min IS NULL OR p_run_time_min = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Efficiency = (Actual / Target) * 100
    v_efficiency := (p_actual_qty::DECIMAL / p_target_qty::DECIMAL) * 100.0;
    
    -- Cap at 100%
    IF v_efficiency > 100 THEN
        v_efficiency := 100;
    END IF;
    
    RETURN v_efficiency;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate OEE (Overall Equipment Effectiveness)
CREATE OR REPLACE FUNCTION calculate_oee(
    p_availability_percent DECIMAL,
    p_performance_percent DECIMAL,
    p_quality_percent DECIMAL
) RETURNS DECIMAL(5, 2) AS $$
BEGIN
    IF p_availability_percent IS NULL OR p_performance_percent IS NULL OR p_quality_percent IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- OEE = Availability * Performance * Quality
    RETURN (p_availability_percent / 100.0) * (p_performance_percent / 100.0) * (p_quality_percent / 100.0) * 100.0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 4: TRIGGERS FOR AUTO-CALCULATIONS
-- ============================================================================

-- Function to auto-calculate changeover duration
CREATE OR REPLACE FUNCTION update_changeover_duration()
RETURNS TRIGGER AS $func$
BEGIN
    IF NEW.is_changeover = TRUE AND NEW.changeover_start_time IS NOT NULL AND NEW.changeover_end_time IS NOT NULL THEN
        NEW.changeover_duration_min := calculate_changeover_duration(NEW.changeover_start_time, NEW.changeover_end_time);
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Function to auto-calculate efficiency
CREATE OR REPLACE FUNCTION update_efficiency()
RETURNS TRIGGER AS $func$
BEGIN
    IF NEW.actual_qty_nos IS NOT NULL AND NEW.target_qty_nos IS NOT NULL AND NEW.run_time_mins IS NOT NULL THEN
        NEW.efficiency_percent := calculate_efficiency(NEW.actual_qty_nos, NEW.target_qty_nos, NEW.run_time_mins);
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Function to sync is_changeover with section_type
CREATE OR REPLACE FUNCTION sync_changeover_flag()
RETURNS TRIGGER AS $func$
BEGIN
    IF NEW.section_type IS NOT NULL THEN
        NEW.is_changeover := (NEW.section_type = 'changeover');
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create triggers only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        -- Trigger to auto-calculate changeover duration
        DROP TRIGGER IF EXISTS trigger_update_changeover_duration ON dpr_machine_entries;
        CREATE TRIGGER trigger_update_changeover_duration
            BEFORE INSERT OR UPDATE ON dpr_machine_entries
            FOR EACH ROW
            WHEN (NEW.is_changeover = TRUE AND NEW.changeover_start_time IS NOT NULL AND NEW.changeover_end_time IS NOT NULL)
            EXECUTE FUNCTION update_changeover_duration();
        
        -- Trigger to auto-calculate efficiency
        DROP TRIGGER IF EXISTS trigger_update_efficiency ON dpr_machine_entries;
        CREATE TRIGGER trigger_update_efficiency
            BEFORE INSERT OR UPDATE ON dpr_machine_entries
            FOR EACH ROW
            WHEN (NEW.actual_qty_nos IS NOT NULL AND NEW.target_qty_nos IS NOT NULL AND NEW.run_time_mins IS NOT NULL)
            EXECUTE FUNCTION update_efficiency();
        
        -- Trigger to sync is_changeover with section_type
        DROP TRIGGER IF EXISTS trigger_sync_changeover_flag ON dpr_machine_entries;
        CREATE TRIGGER trigger_sync_changeover_flag
            BEFORE INSERT OR UPDATE ON dpr_machine_entries
            FOR EACH ROW
            WHEN (NEW.section_type IS NOT NULL)
            EXECUTE FUNCTION sync_changeover_flag();
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: DISABLE RLS ON ALL DPR TABLES
-- ============================================================================

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON dpr_data;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON dpr_machine_entries;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON dpr_stoppage_entries;

-- Disable RLS on DPR tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        ALTER TABLE dpr_data DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        ALTER TABLE dpr_machine_entries DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_stoppage_entries') THEN
        ALTER TABLE dpr_stoppage_entries DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================================
-- SECTION 6: CREATE VIEWS FOR DPR REPORTING
-- ============================================================================

-- View for DPR entries that can be posted to stock (CREATE mode only)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        
        CREATE OR REPLACE VIEW dpr_postable_entries AS
        SELECT 
            d.id AS dpr_id,
            d.report_date,
            d.shift,
            d.entry_type,
            d.stock_status,
            d.is_reference_data,
            me.id AS machine_entry_id,
            me.machine_no,
            me.product,
            me.section_type,
            me.is_changeover,
            me.ok_prod_qty_nos,
            me.ok_prod_kgs,
            me.rej_kgs
        FROM dpr_data d
        JOIN dpr_machine_entries me ON d.id = me.dpr_id
        WHERE d.entry_type = 'CREATE'
          AND d.is_reference_data = FALSE
          AND d.stock_status != 'POSTED';
        
        COMMENT ON VIEW dpr_postable_entries IS 'DPR entries that can be posted to stock ledger (CREATE mode, not reference data)';
        
        -- View for changeover summary
        CREATE OR REPLACE VIEW dpr_changeover_summary AS
        SELECT 
            d.id AS dpr_id,
            d.report_date,
            d.shift,
            me.machine_no,
            me.previous_product,
            me.product AS new_product,
            me.changeover_start_time,
            me.changeover_end_time,
            me.changeover_duration_min,
            me.changeover_reason
        FROM dpr_data d
        JOIN dpr_machine_entries me ON d.id = me.dpr_id
        WHERE me.is_changeover = TRUE
          AND me.section_type = 'changeover'
        ORDER BY d.report_date DESC, d.shift, me.machine_no;
        
        COMMENT ON VIEW dpr_changeover_summary IS 'Summary of all changeover activities';
    END IF;
END $$;

-- ============================================================================
-- SECTION 7: HELPER FUNCTIONS FOR DPR OPERATIONS
-- ============================================================================

-- Function to check if DPR can be posted to stock
CREATE OR REPLACE FUNCTION can_post_dpr_to_stock(
    p_dpr_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_entry_type VARCHAR(20);
    v_is_reference BOOLEAN;
    v_stock_status VARCHAR(20);
BEGIN
    SELECT entry_type, is_reference_data, stock_status
    INTO v_entry_type, v_is_reference, v_stock_status
    FROM dpr_data
    WHERE id = p_dpr_id;
    
    -- Can only post if:
    -- 1. Entry type is CREATE (not EXCEL_UPLOAD)
    -- 2. Not reference data
    -- 3. Not already posted
    IF v_entry_type = 'CREATE' 
       AND v_is_reference = FALSE 
       AND v_stock_status != 'POSTED' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark DPR as Excel upload
CREATE OR REPLACE FUNCTION mark_dpr_as_excel_upload(
    p_dpr_id UUID,
    p_file_name VARCHAR(255),
    p_uploaded_by VARCHAR(255)
) RETURNS VOID AS $$
BEGIN
    UPDATE dpr_data
    SET entry_type = 'EXCEL_UPLOAD',
        is_reference_data = TRUE,
        excel_file_name = p_file_name,
        excel_uploaded_at = NOW(),
        excel_uploaded_by = p_uploaded_by,
        stock_status = 'DRAFT' -- Excel uploads cannot be posted
    WHERE id = p_dpr_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 8: CONSTRAINTS AND VALIDATIONS
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        -- Ensure Excel upload entries cannot be posted to stock
        -- This is enforced by the can_post_dpr_to_stock function, but add constraint for clarity
        -- Note: We can't add a CHECK constraint that references stock_status and entry_type
        -- because stock_status might be updated separately, so we rely on application logic
    END IF;
END $$;

-- ============================================================================
-- SECTION 9: COMMENTS FOR DOCUMENTATION
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        COMMENT ON COLUMN dpr_data.entry_type IS 'CREATE: Active DPR that can be posted to stock. EXCEL_UPLOAD: Historical reference data from Excel';
        COMMENT ON COLUMN dpr_data.is_reference_data IS 'TRUE for Excel uploads (historical data), FALSE for active DPR entries';
        COMMENT ON COLUMN dpr_data.stock_status IS 'Stock posting status: DRAFT, POSTED, or CANCELLED. Excel uploads remain DRAFT';
        COMMENT ON COLUMN dpr_data.excel_file_name IS 'Original Excel file name if uploaded from Excel';
        COMMENT ON COLUMN dpr_data.excel_uploaded_at IS 'Timestamp when Excel was uploaded';
        COMMENT ON COLUMN dpr_data.excel_uploaded_by IS 'User who uploaded the Excel file';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        COMMENT ON COLUMN dpr_machine_entries.is_changeover IS 'TRUE if this is a changeover entry, synced with section_type';
        COMMENT ON COLUMN dpr_machine_entries.previous_product IS 'Previous mold/product before changeover';
        COMMENT ON COLUMN dpr_machine_entries.changeover_duration_min IS 'Auto-calculated changeover duration in minutes';
        COMMENT ON COLUMN dpr_machine_entries.efficiency_percent IS 'Auto-calculated: (actual_qty / target_qty) * 100';
        COMMENT ON COLUMN dpr_machine_entries.oee_percent IS 'Overall Equipment Effectiveness: Availability * Performance * Quality';
    END IF;
END $$;

-- ============================================================================
-- SECTION 10: UPDATE EXISTING DATA (if any)
-- ============================================================================

-- Set entry_type for existing DPR entries (default to CREATE)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        UPDATE dpr_data
        SET entry_type = 'CREATE',
            is_reference_data = FALSE
        WHERE entry_type IS NULL;
    END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

