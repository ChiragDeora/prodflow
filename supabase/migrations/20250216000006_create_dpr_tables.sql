-- =====================================================
-- CREATE DPR (DAILY PRODUCTION REPORT) TABLES
-- =====================================================
-- This migration creates comprehensive DPR tables with:
-- 1. Main DPR table (one record per date/shift)
-- 2. DPR Machine Entries table (one record per machine per DPR)
-- 3. DPR Stoppage Entries table (multiple stoppages per machine)
-- 4. Calculated summary fields and functions
-- =====================================================

-- =====================================================
-- 1. MAIN DPR TABLE
-- =====================================================
-- One record per date/shift combination
CREATE TABLE IF NOT EXISTS dpr_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    report_date DATE NOT NULL,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('DAY', 'NIGHT')),
    shift_incharge VARCHAR(255),
    
    -- Audit fields
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255),
    
    -- Ensure one DPR per date/shift
    UNIQUE(report_date, shift)
);

-- =====================================================
-- 2. DPR MACHINE ENTRIES TABLE
-- =====================================================
-- One record per machine per DPR
-- Supports both Current Production and Changeover sections
CREATE TABLE IF NOT EXISTS dpr_machine_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_id UUID NOT NULL REFERENCES dpr_data(id) ON DELETE CASCADE,
    
    -- Section Type: 'current' or 'changeover'
    section_type VARCHAR(20) NOT NULL DEFAULT 'current' CHECK (section_type IN ('current', 'changeover')),
    
    -- Basic Info
    machine_no VARCHAR(50) NOT NULL,
    operator_name VARCHAR(255),
    product VARCHAR(255),
    cavity INTEGER,
    
    -- Process Parameters
    trg_cycle_sec DECIMAL(8, 2), -- Target Cycle (sec)
    trg_run_time_min DECIMAL(10, 2), -- Target Run Time (min)
    part_wt_gm DECIMAL(10, 3), -- Part Weight (gm)
    act_part_wt_gm DECIMAL(10, 3), -- Actual Part Weight (gm)
    act_cycle_sec DECIMAL(8, 2), -- Actual Cycle (sec)
    part_wt_check VARCHAR(20) CHECK (part_wt_check IN ('OK', 'NOT OK', '')), -- Part Weight Check
    cycle_time_check VARCHAR(20) CHECK (cycle_time_check IN ('OK', 'NOT OK', '')), -- Cycle Time Check
    
    -- No of Shots
    shots_start INTEGER, -- No of Shots (Start)
    shots_end INTEGER, -- No of Shots (End)
    
    -- Production Data
    target_qty_nos INTEGER, -- Target Qty (Nos)
    actual_qty_nos INTEGER, -- Actual Qty (Nos)
    ok_prod_qty_nos INTEGER, -- Ok Prod Qty (Nos)
    ok_prod_kgs DECIMAL(10, 3), -- Ok Prod (Kgs)
    ok_prod_percent DECIMAL(5, 2), -- Ok Prod (%)
    rej_kgs DECIMAL(10, 3), -- Rej (Kgs)
    lumps_kgs DECIMAL(10, 3), -- Lumps (Kgs)
    
    -- Run Time
    run_time_mins DECIMAL(10, 2), -- Run Time (mins)
    down_time_min DECIMAL(10, 2), -- Down time (min)
    
    -- Stoppage Time and Remarks (summary - detailed in stoppage table)
    mould_change VARCHAR(255), -- Mould change
    remark TEXT, -- REMARK
    
    -- Foreign key to machines table
    CONSTRAINT fk_dpr_machine_entries_machine FOREIGN KEY (machine_no) REFERENCES machines(machine_id) ON DELETE SET NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one entry per machine per section per DPR
    UNIQUE(dpr_id, machine_no, section_type)
);

-- =====================================================
-- 3. DPR STOPPAGE ENTRIES TABLE
-- =====================================================
-- Multiple stoppages per machine entry
CREATE TABLE IF NOT EXISTS dpr_stoppage_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_machine_entry_id UUID NOT NULL REFERENCES dpr_machine_entries(id) ON DELETE CASCADE,
    
    -- Stoppage details
    reason TEXT, -- Reason
    start_time TIME, -- Start Time
    end_time TIME, -- End Time
    total_time_min DECIMAL(10, 2), -- Total Time (min) - calculated from start/end time
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CALCULATED FIELDS AND FUNCTIONS
-- =====================================================

-- Function to calculate Ok Prod (Kgs) from Ok Prod Qty and Part Weight
CREATE OR REPLACE FUNCTION calculate_ok_prod_kgs(
    ok_prod_qty INTEGER,
    part_wt_gm DECIMAL
) RETURNS DECIMAL(10, 3) AS $$
BEGIN
    IF ok_prod_qty IS NULL OR part_wt_gm IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (ok_prod_qty * part_wt_gm) / 1000.0; -- Convert gm to kg
END;
$$ LANGUAGE plpgsql;

-- Function to calculate Ok Prod (%) from Actual Qty and Ok Prod Qty
CREATE OR REPLACE FUNCTION calculate_ok_prod_percent(
    actual_qty INTEGER,
    ok_prod_qty INTEGER
) RETURNS DECIMAL(5, 2) AS $$
BEGIN
    IF actual_qty IS NULL OR actual_qty = 0 OR ok_prod_qty IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (ok_prod_qty::DECIMAL / actual_qty::DECIMAL) * 100.0;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate Total Time from Start Time and End Time
CREATE OR REPLACE FUNCTION calculate_total_time_min(
    start_time TIME,
    end_time TIME
) RETURNS DECIMAL(10, 2) AS $$
BEGIN
    IF start_time IS NULL OR end_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Handle time wrap-around (end time next day)
    IF end_time < start_time THEN
        -- End time is next day
        RETURN ((24 * 60) - EXTRACT(EPOCH FROM (start_time - end_time)) / 60);
    ELSE
        RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 60;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate Down Time from stoppage entries
-- This can be used to update down_time_min in machine entries
CREATE OR REPLACE FUNCTION calculate_down_time_from_stoppages(
    p_dpr_machine_entry_id UUID
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
    total_down_time DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(total_time_min), 0)
    INTO total_down_time
    FROM dpr_stoppage_entries
    WHERE dpr_machine_entry_id = p_dpr_machine_entry_id;
    
    RETURN total_down_time;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate Ok Prod (Kgs) when Ok Prod Qty or Part Weight changes
CREATE OR REPLACE FUNCTION update_ok_prod_kgs()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ok_prod_qty_nos IS NOT NULL AND NEW.part_wt_gm IS NOT NULL THEN
        NEW.ok_prod_kgs := calculate_ok_prod_kgs(NEW.ok_prod_qty_nos, NEW.part_wt_gm);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ok_prod_kgs
    BEFORE INSERT OR UPDATE ON dpr_machine_entries
    FOR EACH ROW
    WHEN (NEW.ok_prod_qty_nos IS NOT NULL AND NEW.part_wt_gm IS NOT NULL)
    EXECUTE FUNCTION update_ok_prod_kgs();

-- Trigger to auto-calculate Ok Prod (%) when Actual Qty or Ok Prod Qty changes
CREATE OR REPLACE FUNCTION update_ok_prod_percent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.actual_qty_nos IS NOT NULL AND NEW.ok_prod_qty_nos IS NOT NULL AND NEW.actual_qty_nos > 0 THEN
        NEW.ok_prod_percent := calculate_ok_prod_percent(NEW.actual_qty_nos, NEW.ok_prod_qty_nos);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ok_prod_percent
    BEFORE INSERT OR UPDATE ON dpr_machine_entries
    FOR EACH ROW
    WHEN (NEW.actual_qty_nos IS NOT NULL AND NEW.ok_prod_qty_nos IS NOT NULL)
    EXECUTE FUNCTION update_ok_prod_percent();

-- Trigger to auto-calculate Total Time in stoppage entries
CREATE OR REPLACE FUNCTION update_stoppage_total_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.total_time_min := calculate_total_time_min(NEW.start_time, NEW.end_time);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stoppage_total_time
    BEFORE INSERT OR UPDATE ON dpr_stoppage_entries
    FOR EACH ROW
    WHEN (NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL)
    EXECUTE FUNCTION update_stoppage_total_time();

-- =====================================================
-- 5. SUMMARY VIEW FOR SHIFT TOTALS
-- =====================================================
-- View to calculate shift totals from machine entries
-- Aggregates both current production and changeover sections
CREATE OR REPLACE VIEW dpr_shift_totals AS
SELECT 
    d.id AS dpr_id,
    d.report_date,
    d.shift,
    
    -- Sum all metrics from both current and changeover production entries
    COALESCE(SUM(m.target_qty_nos), 0) AS shift_target_qty_nos,
    COALESCE(SUM(m.actual_qty_nos), 0) AS shift_actual_qty_nos,
    COALESCE(SUM(m.ok_prod_qty_nos), 0) AS shift_ok_prod_qty_nos,
    COALESCE(SUM(m.ok_prod_kgs), 0) AS shift_ok_prod_kgs,
    COALESCE(SUM(m.rej_kgs), 0) AS shift_rej_kgs,
    COALESCE(SUM(m.lumps_kgs), 0) AS shift_lumps_kgs,
    COALESCE(SUM(m.run_time_mins), 0) AS shift_run_time_mins,
    COALESCE(SUM(m.down_time_min), 0) AS shift_down_time_min,
    
    -- Calculate Ok Prod (%)
    CASE 
        WHEN COALESCE(SUM(m.actual_qty_nos), 0) > 0
        THEN (COALESCE(SUM(m.ok_prod_qty_nos), 0)::DECIMAL / 
              COALESCE(SUM(m.actual_qty_nos), 0)::DECIMAL) * 100.0
        ELSE NULL
    END AS shift_ok_prod_percent,
    
    -- Total Time = Run Time + Down Time
    (COALESCE(SUM(m.run_time_mins), 0) +
     COALESCE(SUM(m.down_time_min), 0)) AS shift_total_time_min
    
FROM dpr_data d
LEFT JOIN dpr_machine_entries m ON d.id = m.dpr_id
GROUP BY d.id, d.report_date, d.shift;

-- =====================================================
-- 6. ACHIEVEMENT METRICS VIEW
-- =====================================================
-- View to calculate achievement metrics
CREATE OR REPLACE VIEW dpr_achievement_metrics AS
SELECT 
    d.id AS dpr_id,
    d.report_date,
    d.shift,
    
    -- Actual vs Target
    CASE 
        WHEN st.shift_target_qty_nos > 0
        THEN (st.shift_actual_qty_nos::DECIMAL / st.shift_target_qty_nos::DECIMAL) * 100.0
        ELSE NULL
    END AS actual_vs_target_percent,
    
    -- Rej vs Ok Prod
    CASE 
        WHEN st.shift_ok_prod_kgs > 0
        THEN (st.shift_rej_kgs::DECIMAL / st.shift_ok_prod_kgs::DECIMAL) * 100.0
        ELSE NULL
    END AS rej_vs_ok_prod_percent,
    
    -- Run Time vs Total
    CASE 
        WHEN st.shift_total_time_min > 0
        THEN (st.shift_run_time_mins::DECIMAL / st.shift_total_time_min::DECIMAL) * 100.0
        ELSE NULL
    END AS run_time_vs_total_percent,
    
    -- Down Time vs Total
    CASE 
        WHEN st.shift_total_time_min > 0
        THEN (st.shift_down_time_min::DECIMAL / st.shift_total_time_min::DECIMAL) * 100.0
        ELSE NULL
    END AS down_time_vs_total_percent
    
FROM dpr_data d
LEFT JOIN dpr_shift_totals st ON d.id = st.dpr_id;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- DPR Data indexes
CREATE INDEX IF NOT EXISTS idx_dpr_data_date ON dpr_data(report_date);
CREATE INDEX IF NOT EXISTS idx_dpr_data_shift ON dpr_data(shift);
CREATE INDEX IF NOT EXISTS idx_dpr_data_date_shift ON dpr_data(report_date, shift);

-- DPR Machine Entries indexes
CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_dpr_id ON dpr_machine_entries(dpr_id);
CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_machine_no ON dpr_machine_entries(machine_no);
CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_section_type ON dpr_machine_entries(section_type);
CREATE INDEX IF NOT EXISTS idx_dpr_machine_entries_dpr_machine ON dpr_machine_entries(dpr_id, machine_no);

-- DPR Stoppage Entries indexes
CREATE INDEX IF NOT EXISTS idx_dpr_stoppage_entries_machine_entry_id ON dpr_stoppage_entries(dpr_machine_entry_id);

-- =====================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dpr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_dpr_data_updated_at
    BEFORE UPDATE ON dpr_data
    FOR EACH ROW
    EXECUTE FUNCTION update_dpr_updated_at();

CREATE TRIGGER trigger_dpr_machine_entries_updated_at
    BEFORE UPDATE ON dpr_machine_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_dpr_updated_at();

CREATE TRIGGER trigger_dpr_stoppage_entries_updated_at
    BEFORE UPDATE ON dpr_stoppage_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_dpr_updated_at();

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE dpr_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpr_machine_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpr_stoppage_entries ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON dpr_data
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON dpr_machine_entries
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON dpr_stoppage_entries
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE dpr_data IS 'Main DPR table - one record per date/shift combination';
COMMENT ON TABLE dpr_machine_entries IS 'DPR machine entries - one record per machine per section (current/changeover) per DPR';
COMMENT ON TABLE dpr_stoppage_entries IS 'DPR stoppage entries - multiple stoppages per machine entry';

COMMENT ON COLUMN dpr_machine_entries.section_type IS 'Type of production section: current (Current Production) or changeover (Changeover)';
COMMENT ON COLUMN dpr_machine_entries.ok_prod_kgs IS 'Auto-calculated: (ok_prod_qty_nos * part_wt_gm) / 1000';
COMMENT ON COLUMN dpr_machine_entries.ok_prod_percent IS 'Auto-calculated: (ok_prod_qty_nos / actual_qty_nos) * 100';
COMMENT ON COLUMN dpr_stoppage_entries.total_time_min IS 'Auto-calculated from start_time and end_time';

COMMENT ON VIEW dpr_shift_totals IS 'Calculated shift totals from all machine entries (current production only)';
COMMENT ON VIEW dpr_achievement_metrics IS 'Calculated achievement metrics: Actual vs Target, Rej vs Ok Prod, Run Time vs Total, Down Time vs Total';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

