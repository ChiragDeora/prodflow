-- =====================================================
-- CREATE DPR EXCEL DATA TABLES
-- =====================================================
-- This migration creates dedicated tables for Excel/legacy DPR data:
-- 1. dpr_excel_uploads - Tracks Excel file upload metadata
-- 2. dpr_excel_data - Stores DPR data from Excel (mirrors dpr_data)
-- 3. dpr_excel_machine_entries - Stores machine entries (NO FK constraint on machine_no)
--
-- These tables are separate from the main dpr_data/dpr_machine_entries
-- to allow legacy data with different machine naming conventions.
-- =====================================================

-- =====================================================
-- 1. CREATE DPR_EXCEL_UPLOADS TABLE
-- =====================================================
-- Tracks Excel file upload metadata
CREATE TABLE IF NOT EXISTS dpr_excel_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- File Information
    file_name VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    
    -- Upload Context
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_by_user_id UUID,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Import Statistics
    total_sheets_processed INTEGER DEFAULT 0,
    total_records_processed INTEGER DEFAULT 0,
    records_imported_success INTEGER DEFAULT 0,
    records_imported_failed INTEGER DEFAULT 0,
    
    -- Import Status
    import_status VARCHAR(20) DEFAULT 'PENDING' 
        CHECK (import_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL')),
    import_started_at TIMESTAMP WITH TIME ZONE,
    import_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error/Warning Information
    errors JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    
    -- Storage Reference (if file is stored in cloud storage)
    storage_path VARCHAR(1000),
    storage_bucket VARCHAR(255),
    
    -- Additional Metadata
    description TEXT,
    notes TEXT,
    
    -- Date Range of Data in the Upload
    data_date_from DATE,
    data_date_to DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE DPR_EXCEL_DATA TABLE
-- =====================================================
-- Mirrors dpr_data structure but for Excel imports (reference/legacy data)
CREATE TABLE IF NOT EXISTS dpr_excel_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to upload
    excel_upload_id UUID REFERENCES dpr_excel_uploads(id) ON DELETE CASCADE,
    
    -- Basic Info (same as dpr_data)
    report_date DATE NOT NULL,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('DAY', 'NIGHT')),
    shift_incharge VARCHAR(255),
    
    -- Additional header fields
    production_manager VARCHAR(255),
    quality_incharge VARCHAR(255),
    remarks TEXT,
    
    -- Excel source info
    excel_file_name VARCHAR(500),
    excel_sheet_name VARCHAR(255),
    excel_row_number INTEGER,
    
    -- Audit fields
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Note: No unique constraint - allow multiple entries for same date/shift
    -- Legacy data may have duplicates or multiple imports
);

-- Create a unique index that only applies when excel_upload_id is NOT NULL
-- This prevents duplicate uploads but allows manual/imported entries without upload tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_dpr_excel_data_date_shift_upload 
ON dpr_excel_data(report_date, shift, excel_upload_id) 
WHERE excel_upload_id IS NOT NULL;

-- =====================================================
-- 3. CREATE DPR_EXCEL_MACHINE_ENTRIES TABLE
-- =====================================================
-- Mirrors dpr_machine_entries but WITHOUT FK constraint on machine_no
-- This allows Excel data with any machine naming convention
CREATE TABLE IF NOT EXISTS dpr_excel_machine_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpr_excel_id UUID NOT NULL REFERENCES dpr_excel_data(id) ON DELETE CASCADE,
    
    -- Section Type: 'current' or 'changeover'
    section_type VARCHAR(20) NOT NULL DEFAULT 'current' CHECK (section_type IN ('current', 'changeover')),
    is_changeover BOOLEAN DEFAULT FALSE,
    
    -- Basic Info - NO FK CONSTRAINT on machine_no (allows any value from Excel)
    machine_no VARCHAR(50) NOT NULL,
    operator_name VARCHAR(255),
    product VARCHAR(255),
    previous_product VARCHAR(255),
    cavity INTEGER,
    
    -- Process Parameters
    trg_cycle_sec DECIMAL(8, 2),
    trg_run_time_min DECIMAL(10, 2),
    part_wt_gm DECIMAL(10, 3),
    act_part_wt_gm DECIMAL(10, 3),
    act_cycle_sec DECIMAL(8, 2),
    part_wt_check VARCHAR(20) CHECK (part_wt_check IN ('OK', 'NOT OK', '', NULL)),
    cycle_time_check VARCHAR(20) CHECK (cycle_time_check IN ('OK', 'NOT OK', '', NULL)),
    
    -- No of Shots
    shots_start INTEGER,
    shots_end INTEGER,
    
    -- Production Data
    target_qty_nos INTEGER,
    actual_qty_nos INTEGER,
    ok_prod_qty_nos INTEGER,
    ok_prod_kgs DECIMAL(10, 3),
    ok_prod_percent DECIMAL(5, 2),
    rej_kgs DECIMAL(10, 3),
    lumps_kgs DECIMAL(10, 3),
    
    -- Run Time
    run_time_mins DECIMAL(10, 2),
    down_time_min DECIMAL(10, 2),
    
    -- Stoppage/Changeover Time
    stoppage_reason TEXT,
    stoppage_start VARCHAR(20),
    stoppage_end VARCHAR(20),
    stoppage_total_min DECIMAL(10, 2),
    changeover_start_time VARCHAR(20),
    changeover_end_time VARCHAR(20),
    changeover_duration_min DECIMAL(10, 2),
    changeover_reason TEXT,
    
    -- Other fields
    mould_change VARCHAR(255),
    remark TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================
-- dpr_excel_uploads indexes
CREATE INDEX IF NOT EXISTS idx_dpr_excel_uploads_uploaded_by ON dpr_excel_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_uploads_uploaded_at ON dpr_excel_uploads(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_uploads_import_status ON dpr_excel_uploads(import_status);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_uploads_file_name ON dpr_excel_uploads(file_name);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_uploads_data_dates ON dpr_excel_uploads(data_date_from, data_date_to);

-- dpr_excel_data indexes
CREATE INDEX IF NOT EXISTS idx_dpr_excel_data_upload_id ON dpr_excel_data(excel_upload_id);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_data_date ON dpr_excel_data(report_date);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_data_shift ON dpr_excel_data(shift);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_data_date_shift ON dpr_excel_data(report_date, shift);

-- dpr_excel_machine_entries indexes
CREATE INDEX IF NOT EXISTS idx_dpr_excel_machine_entries_dpr_id ON dpr_excel_machine_entries(dpr_excel_id);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_machine_entries_machine_no ON dpr_excel_machine_entries(machine_no);
CREATE INDEX IF NOT EXISTS idx_dpr_excel_machine_entries_section_type ON dpr_excel_machine_entries(section_type);

-- =====================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_dpr_excel_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dpr_excel_uploads_updated_at ON dpr_excel_uploads;
CREATE TRIGGER trigger_dpr_excel_uploads_updated_at
    BEFORE UPDATE ON dpr_excel_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_dpr_excel_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_dpr_excel_data_updated_at ON dpr_excel_data;
CREATE TRIGGER trigger_dpr_excel_data_updated_at
    BEFORE UPDATE ON dpr_excel_data
    FOR EACH ROW
    EXECUTE FUNCTION update_dpr_excel_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_dpr_excel_machine_entries_updated_at ON dpr_excel_machine_entries;
CREATE TRIGGER trigger_dpr_excel_machine_entries_updated_at
    BEFORE UPDATE ON dpr_excel_machine_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_dpr_excel_tables_updated_at();

-- =====================================================
-- 6. DISABLE RLS FOR API ACCESS
-- =====================================================
ALTER TABLE dpr_excel_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE dpr_excel_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE dpr_excel_machine_entries DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE dpr_excel_uploads IS 'Tracks Excel file uploads for DPR legacy/reference data';
COMMENT ON TABLE dpr_excel_data IS 'Stores DPR data imported from Excel files (legacy/reference data)';
COMMENT ON TABLE dpr_excel_machine_entries IS 'Stores machine entries from Excel imports - NO FK constraint on machine_no to allow legacy data';

COMMENT ON COLUMN dpr_excel_uploads.import_status IS 'PENDING: Not started, PROCESSING: In progress, COMPLETED: All records imported, FAILED: Import failed, PARTIAL: Some records failed';
COMMENT ON COLUMN dpr_excel_machine_entries.machine_no IS 'Machine identifier from Excel - not constrained to lines table';

-- =====================================================
-- 8. VIEW FOR EXCEL DPR DATA WITH MACHINE ENTRIES
-- =====================================================
-- Drop existing view first to allow column name changes
DROP VIEW IF EXISTS dpr_excel_data_with_entries;
CREATE VIEW dpr_excel_data_with_entries AS
SELECT 
    d.id,
    d.excel_upload_id,
    d.report_date,
    d.shift,
    d.shift_incharge,
    d.excel_file_name,
    d.created_at,
    u.file_name AS upload_file_name,
    u.uploaded_by,
    u.uploaded_at,
    COUNT(m.id) AS machine_entry_count,
    COALESCE(SUM(m.ok_prod_qty_nos), 0) AS total_ok_prod_qty,
    COALESCE(SUM(m.ok_prod_kgs), 0) AS total_ok_prod_kgs,
    COALESCE(SUM(m.rej_kgs), 0) AS total_rej_kgs
FROM dpr_excel_data d
LEFT JOIN dpr_excel_uploads u ON d.excel_upload_id = u.id
LEFT JOIN dpr_excel_machine_entries m ON d.id = m.dpr_excel_id
GROUP BY d.id, d.excel_upload_id, d.report_date, d.shift, d.shift_incharge,
         d.excel_file_name, d.created_at, u.file_name, u.uploaded_by, u.uploaded_at;

-- =====================================================
-- 9. VIEW FOR EXCEL UPLOAD SUMMARY
-- =====================================================
-- Drop existing view first to allow column name changes
DROP VIEW IF EXISTS dpr_excel_upload_summary;
CREATE VIEW dpr_excel_upload_summary AS
SELECT 
    eu.id,
    eu.file_name,
    eu.uploaded_by,
    eu.uploaded_at,
    eu.import_status,
    eu.total_sheets_processed,
    eu.total_records_processed,
    eu.records_imported_success,
    eu.records_imported_failed,
    eu.data_date_from,
    eu.data_date_to,
    COUNT(ed.id) AS dpr_count,
    MIN(ed.report_date) AS actual_date_from,
    MAX(ed.report_date) AS actual_date_to
FROM dpr_excel_uploads eu
LEFT JOIN dpr_excel_data ed ON eu.id = ed.excel_upload_id
GROUP BY eu.id, eu.file_name, eu.uploaded_by, eu.uploaded_at, eu.import_status,
         eu.total_sheets_processed, eu.total_records_processed, 
         eu.records_imported_success, eu.records_imported_failed,
         eu.data_date_from, eu.data_date_to;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
