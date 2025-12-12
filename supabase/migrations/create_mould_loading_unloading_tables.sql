-- Create Mould Loading & Unloading Report tables

-- Main report table
CREATE TABLE IF NOT EXISTS mould_loading_unloading_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_no VARCHAR(50) DEFAULT 'DPPL-PRD-004/R00',
    report_date DATE NOT NULL,
    machine_no VARCHAR(50),
    
    -- Unloading section
    unloading_mould_name VARCHAR(255),
    unloading_start_time TIME,
    
    -- Loading section  
    loading_mould_name VARCHAR(255),
    first_shot_start_time TIME,
    total_time_lost_for_change INTERVAL,
    mould_change_done_by VARCHAR(255),
    
    -- Verification
    report_verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    
    -- Audit fields
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'verified')),
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unloading procedures checklist
CREATE TABLE IF NOT EXISTS mould_unloading_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES mould_loading_unloading_reports(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    procedure_text TEXT NOT NULL,
    tick_yes_no BOOLEAN,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loading procedures checklist  
CREATE TABLE IF NOT EXISTS mould_loading_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES mould_loading_unloading_reports(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    procedure_text TEXT NOT NULL,
    tick_yes_no BOOLEAN,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default unloading procedures
INSERT INTO mould_unloading_procedures (report_id, sr_no, procedure_text) VALUES
(NULL, 1, 'Keep The Mould Ready near the machine which is to be load'),
(NULL, 2, 'Collect Last sample of Running Mould'),
(NULL, 3, 'Shut Down the chiller line valves & then run Mould For 7 to 8 Shorts.'),
(NULL, 4, 'Apply Anticorrosion Spray in mould.'),
(NULL, 5, 'Remove water & Air lines from Mould.'),
(NULL, 6, 'Put Lock Patti on Mould'),
(NULL, 7, 'Unload the mould.'),
(NULL, 8, 'Clean the Water lines for mould by applying air.'),
(NULL, 9, 'Shift the hot runner controller to keep proper place.'),
(NULL, 10, 'If mention any Problem observed in mould during this run.');

-- Insert default loading procedures
INSERT INTO mould_loading_procedures (report_id, sr_no, procedure_text) VALUES
(NULL, 1, 'Check Before loading the mould - HRS, Lock patti, locating ring, water & air Nipples'),
(NULL, 2, 'Load the mould & clamp it properly.'),
(NULL, 3, 'Remove Lock Patti & Crane.'),
(NULL, 4, 'Open the Mould'),
(NULL, 5, 'Do the water & air line Connections.'),
(NULL, 6, 'Check air ejector operations.'),
(NULL, 7, 'Connect HRS as per Mould No.'),
(NULL, 8, 'Clean the mould properly.'),
(NULL, 9, 'Do the auto tonnage setting of mould.'),
(NULL, 10, 'Set the parameters or Load from machine mould data sheet.'),
(NULL, 11, 'Start the production.'),
(NULL, 12, 'Collect the first of sample of the mould'),
(NULL, 13, 'If mention any problem observed during loading & starting of mould.');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mould_reports_date ON mould_loading_unloading_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_mould_reports_machine ON mould_loading_unloading_reports(machine_no);
CREATE INDEX IF NOT EXISTS idx_mould_reports_status ON mould_loading_unloading_reports(status);
CREATE INDEX IF NOT EXISTS idx_unloading_procedures_report ON mould_unloading_procedures(report_id);
CREATE INDEX IF NOT EXISTS idx_loading_procedures_report ON mould_loading_procedures(report_id);

-- Function to create a new report with default procedures
CREATE OR REPLACE FUNCTION create_mould_report_with_procedures(
    p_report_date DATE,
    p_machine_no VARCHAR(50),
    p_created_by VARCHAR(255)
) RETURNS UUID AS $$
DECLARE
    new_report_id UUID;
BEGIN
    -- Insert main report
    INSERT INTO mould_loading_unloading_reports (
        report_date, 
        machine_no, 
        created_by
    ) VALUES (
        p_report_date, 
        p_machine_no, 
        p_created_by
    ) RETURNING id INTO new_report_id;
    
    -- Insert unloading procedures for this report
    INSERT INTO mould_unloading_procedures (report_id, sr_no, procedure_text)
    SELECT 
        new_report_id,
        sr_no,
        procedure_text
    FROM mould_unloading_procedures 
    WHERE report_id IS NULL;
    
    -- Insert loading procedures for this report
    INSERT INTO mould_loading_procedures (report_id, sr_no, procedure_text)
    SELECT 
        new_report_id,
        sr_no,
        procedure_text
    FROM mould_loading_procedures 
    WHERE report_id IS NULL;
    
    RETURN new_report_id;
END;
$$ LANGUAGE plpgsql;

-- Verify tables were created
SELECT 'mould_loading_unloading_reports' as table_name, COUNT(*) as record_count FROM mould_loading_unloading_reports
UNION ALL
SELECT 'mould_unloading_procedures' as table_name, COUNT(*) as record_count FROM mould_unloading_procedures
UNION ALL
SELECT 'mould_loading_procedures' as table_name, COUNT(*) as record_count FROM mould_loading_procedures;
