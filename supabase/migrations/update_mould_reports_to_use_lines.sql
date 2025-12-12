-- Update mould loading unloading reports table to use line_no instead of machine_no
-- Migration to change from machine_no to line_no

-- Step 1: Add the new line_no column
ALTER TABLE mould_loading_unloading_reports 
ADD COLUMN IF NOT EXISTS line_no VARCHAR(50);

-- Step 2: Add foreign key constraint to lines table
ALTER TABLE mould_loading_unloading_reports 
ADD CONSTRAINT fk_mould_reports_line 
FOREIGN KEY (line_no) REFERENCES lines(line_id) ON DELETE SET NULL;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_mould_reports_line_no ON mould_loading_unloading_reports(line_no);

-- Step 4: Update existing records (if any) - this is optional and depends on your data migration strategy
-- You might want to map existing machine_no values to appropriate line_no values
-- UPDATE mould_loading_unloading_reports 
-- SET line_no = (
--     SELECT line_id 
--     FROM lines 
--     WHERE im_machine_id = mould_loading_unloading_reports.machine_no 
--        OR robot_machine_id = mould_loading_unloading_reports.machine_no
--        OR conveyor_machine_id = mould_loading_unloading_reports.machine_no
--        OR hoist_machine_id = mould_loading_unloading_reports.machine_no
--     LIMIT 1
-- )
-- WHERE machine_no IS NOT NULL AND line_no IS NULL;

-- Step 5: Drop the old machine_no column (uncomment when ready)
-- ALTER TABLE mould_loading_unloading_reports DROP COLUMN IF EXISTS machine_no;

-- Step 6: Drop the existing function first (required when changing parameter names)
-- Use the exact signature as PostgreSQL sees it (date, character varying, character varying)
DROP FUNCTION IF EXISTS create_mould_report_with_procedures(date, character varying, character varying);

-- Step 7: Create the updated function with line_no parameter
CREATE OR REPLACE FUNCTION create_mould_report_with_procedures(
    p_report_date DATE,
    p_line_no VARCHAR(50),
    p_created_by VARCHAR(255)
) RETURNS UUID AS $$
DECLARE
    new_report_id UUID;
BEGIN
    -- Insert main report
    INSERT INTO mould_loading_unloading_reports (
        report_date, 
        line_no, 
        created_by
    ) VALUES (
        p_report_date, 
        p_line_no, 
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

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mould_loading_unloading_reports' 
AND column_name IN ('machine_no', 'line_no')
ORDER BY column_name;
