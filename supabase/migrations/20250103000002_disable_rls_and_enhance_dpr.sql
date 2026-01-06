-- ============================================================================
-- DISABLE RLS ON STOCK LEDGER TABLES AND ENHANCE DPR
-- ============================================================================
-- This migration:
-- 1. Disables RLS on all new stock tables for API access
-- 2. Disables RLS on DPR tables for API access
-- 3. Adds any missing fields to DPR tables per specification
-- ============================================================================

-- ============================================================================
-- SECTION 1: DISABLE RLS ON ALL STOCK TABLES
-- ============================================================================

-- Drop existing RLS policies on stock tables
DROP POLICY IF EXISTS "Allow all for authenticated users on stock_locations" ON stock_locations;
DROP POLICY IF EXISTS "Allow all for authenticated users on stock_items" ON stock_items;
DROP POLICY IF EXISTS "Allow all for authenticated users on stock_ledger" ON stock_ledger;
DROP POLICY IF EXISTS "Allow all for authenticated users on stock_balances" ON stock_balances;
DROP POLICY IF EXISTS "Allow all for authenticated users on stock_item_mappings" ON stock_item_mappings;
DROP POLICY IF EXISTS "Allow all for authenticated users on stock_adjustments" ON stock_adjustments;
DROP POLICY IF EXISTS "Allow all for authenticated users on stock_adjustment_items" ON stock_adjustment_items;
DROP POLICY IF EXISTS "Allow all for authenticated users on customer_returns" ON customer_returns;
DROP POLICY IF EXISTS "Allow all for authenticated users on customer_return_items" ON customer_return_items;

-- Disable RLS on stock tables
ALTER TABLE IF EXISTS stock_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_item_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_adjustment_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_return_items DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2: DISABLE RLS ON DPR TABLES
-- ============================================================================

-- Drop existing RLS policies on DPR tables
DROP POLICY IF EXISTS "Allow all for authenticated users" ON dpr_data;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON dpr_machine_entries;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON dpr_stoppage_entries;

-- Disable RLS on DPR tables
ALTER TABLE IF EXISTS dpr_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dpr_machine_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dpr_stoppage_entries DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: ADD MISSING FIELDS TO DPR_MACHINE_ENTRIES (per spec)
-- ============================================================================

-- Add stoppage fields directly to machine entries for simpler querying
-- These are in addition to the stoppage_entries table for detailed stoppages
-- Only add if dpr_machine_entries table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        ALTER TABLE dpr_machine_entries 
            ADD COLUMN IF NOT EXISTS stoppage_reason TEXT,
            ADD COLUMN IF NOT EXISTS stoppage_start TIME,
            ADD COLUMN IF NOT EXISTS stoppage_end TIME,
            ADD COLUMN IF NOT EXISTS stoppage_total_min DECIMAL(10, 2);
        
        -- Add is_changeover flag as alternative to section_type
        -- (section_type still works, this is for API compatibility)
        ALTER TABLE dpr_machine_entries 
            ADD COLUMN IF NOT EXISTS is_changeover BOOLEAN DEFAULT FALSE;
        
        -- Sync is_changeover with section_type for existing data
        UPDATE dpr_machine_entries 
        SET is_changeover = (section_type = 'changeover')
        WHERE is_changeover IS NULL OR is_changeover != (section_type = 'changeover');
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: CREATE DPR_PRODUCTION_ENTRIES VIEW FOR STOCK LEDGER
-- ============================================================================
-- This view provides a unified interface for stock posting that combines
-- all relevant fields from machine entries with stoppage summary
-- Only create if DPR tables exist

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        
        CREATE OR REPLACE VIEW dpr_production_entries AS
SELECT 
    me.id,
    me.dpr_id,
    me.machine_no,
    me.operator_name,
    me.product,  -- CRITICAL: This is the mold name for SFG lookup
    me.cavity,
    me.trg_cycle_sec AS trg_cycle,
    me.trg_run_time_min AS trg_run_time,
    me.part_wt_gm AS part_wt,
    me.act_part_wt_gm AS act_part_wt,
    me.act_cycle_sec AS act_cycle,
    me.part_wt_check,
    me.cycle_time_check,
    me.shots_start,
    me.shots_end,
    me.target_qty_nos AS target_qty,
    me.actual_qty_nos AS actual_qty,
    me.ok_prod_qty_nos AS ok_prod_qty,
    me.ok_prod_kgs,
    me.ok_prod_percent,
    me.rej_kgs,
    me.lumps_kgs,
    me.run_time_mins AS run_time,
    me.down_time_min AS down_time,
    me.stoppage_reason,
    me.stoppage_start,
    me.stoppage_end,
    me.stoppage_total_min AS stoppage_total,
    me.mould_change,
    me.remark AS remarks,
    me.section_type,
    COALESCE(me.is_changeover, me.section_type = 'changeover') AS is_changeover,
    me.created_at,
    me.updated_at,
    -- Include DPR header info for convenience
    d.report_date,
    d.shift,
    d.shift_incharge
        FROM dpr_machine_entries me
        JOIN dpr_data d ON me.dpr_id = d.id;
        
        COMMENT ON VIEW dpr_production_entries IS 'Unified view of DPR production entries with all fields for stock ledger posting';
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: UPDATE DPR_DATA WITH STOCK STATUS FIELDS (ensure they exist)
-- ============================================================================

-- These should already exist from the stock ledger migration, but ensure they're there
-- Only add if dpr_data table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        ALTER TABLE dpr_data 
            ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
            ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);
        
        -- Create index for stock_status
        CREATE INDEX IF NOT EXISTS idx_dpr_data_stock_status ON dpr_data(stock_status);
    END IF;
END $$;

-- ============================================================================
-- SECTION 6: ENSURE SFG_BOM AND FG_BOM HAVE RLS DISABLED
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all for authenticated users" ON sfg_bom;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON fg_bom;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON local_bom;

-- Disable RLS on BOM tables
ALTER TABLE IF EXISTS sfg_bom DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fg_bom DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS local_bom DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 7: CREATE HELPER FUNCTION FOR DPR STOCK POSTING
-- ============================================================================

-- Function to get SFG code from mold name (product field)
CREATE OR REPLACE FUNCTION get_sfg_code_from_mold(
    p_mold_name VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_sfg_code VARCHAR;
BEGIN
    SELECT sfg_code INTO v_sfg_code
    FROM sfg_bom
    WHERE item_name = p_mold_name
    LIMIT 1;
    
    RETURN v_sfg_code;
END;
$$ LANGUAGE plpgsql;

-- Function to get BOM percentages from mold name
CREATE OR REPLACE FUNCTION get_bom_percentages_from_mold(
    p_mold_name VARCHAR
) RETURNS TABLE (
    sfg_code VARCHAR,
    hp_pct DECIMAL,
    icp_pct DECIMAL,
    rcp_pct DECIMAL,
    ldpe_pct DECIMAL,
    gpps_pct DECIMAL,
    mb_pct DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.sfg_code,
        COALESCE(b.hp_percentage, 0) AS hp_pct,
        COALESCE(b.icp_percentage, 0) AS icp_pct,
        COALESCE(b.rcp_percentage, 0) AS rcp_pct,
        COALESCE(b.ldpe_percentage, 0) AS ldpe_pct,
        COALESCE(b.gpps_percentage, 0) AS gpps_pct,
        COALESCE(b.mb_percentage, 0) AS mb_pct
    FROM sfg_bom b
    WHERE b.item_name = p_mold_name
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 8: CREATE DPR AGGREGATED VIEW FOR STOCK POSTING
-- ============================================================================

-- View that aggregates DPR production by SFG code for stock posting
-- Only create if DPR tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        
        CREATE OR REPLACE VIEW dpr_production_aggregated AS
SELECT 
    me.dpr_id,
    d.report_date,
    d.shift,
    me.product AS mold_name,
    get_sfg_code_from_mold(me.product) AS sfg_code,
    SUM(COALESCE(me.ok_prod_qty_nos, 0)) AS total_pieces,
    SUM(COALESCE(me.ok_prod_kgs, 0)) AS total_good_kgs,
    SUM(COALESCE(me.rej_kgs, 0)) AS total_rej_kgs,
    SUM(COALESCE(me.ok_prod_kgs, 0) + COALESCE(me.rej_kgs, 0)) AS total_consumption_kgs
FROM dpr_machine_entries me
JOIN dpr_data d ON me.dpr_id = d.id
WHERE me.product IS NOT NULL 
    AND me.product != ''
        GROUP BY me.dpr_id, d.report_date, d.shift, me.product;
        
        COMMENT ON VIEW dpr_production_aggregated IS 'Aggregated DPR production by mold/SFG for stock posting calculations';
    END IF;
END $$;

-- ============================================================================
-- SECTION 9: ADDITIONAL INDEXES FOR STOCK PERFORMANCE
-- ============================================================================

-- Index on product field for SFG lookup during DPR posting
-- Only create if dpr_machine_entries table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_machine_entries') THEN
        CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_product ON dpr_machine_entries(product);
    END IF;
END $$;

-- Index on sfg_bom item_name for mold lookup
CREATE INDEX IF NOT EXISTS idx_sfg_bom_item_name ON sfg_bom(item_name);

-- Index on fg_bom item_code for FG lookup
CREATE INDEX IF NOT EXISTS idx_fg_bom_item_code ON fg_bom(item_code);

-- ============================================================================
-- SECTION 10: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN dpr_machine_entries.product IS 'MOLD NAME - Critical for SFG lookup via sfg_bom.item_name';
COMMENT ON COLUMN dpr_machine_entries.ok_prod_qty_nos IS 'Good production quantity in pieces - USED FOR SFG creation in stock';
COMMENT ON COLUMN dpr_machine_entries.ok_prod_kgs IS 'Good production weight in kg - USED FOR RM CONSUMPTION calculation';
COMMENT ON COLUMN dpr_machine_entries.rej_kgs IS 'Rejected weight in kg - USED FOR RM CONSUMPTION and REGRIND creation';
COMMENT ON COLUMN dpr_machine_entries.is_changeover IS 'True if this is a changeover entry, synced with section_type';
COMMENT ON COLUMN dpr_machine_entries.stoppage_reason IS 'Summary stoppage reason (detailed in dpr_stoppage_entries)';
COMMENT ON COLUMN dpr_machine_entries.stoppage_total_min IS 'Total stoppage time in minutes';

COMMENT ON FUNCTION get_sfg_code_from_mold IS 'Returns SFG code from mold name via sfg_bom lookup';
COMMENT ON FUNCTION get_bom_percentages_from_mold IS 'Returns BOM RM percentages from mold name';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

