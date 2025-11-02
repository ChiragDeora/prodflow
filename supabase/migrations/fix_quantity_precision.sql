-- Fix qty_meter and qty_meter_2 precision issues
-- This script handles views that depend on the columns by dropping and recreating them

-- First, drop dependent views
DROP VIEW IF EXISTS fg_bom_with_versions CASCADE;
DROP VIEW IF EXISTS local_bom_with_versions CASCADE;
DROP VIEW IF EXISTS sfg_bom_with_versions CASCADE;

-- Fix FG BOM table qty_meter fields only
ALTER TABLE fg_bom 
ALTER COLUMN qty_meter TYPE DECIMAL(10,4),
ALTER COLUMN qty_meter_2 TYPE DECIMAL(10,4);

-- Fix LOCAL BOM table qty_meter fields only
ALTER TABLE local_bom 
ALTER COLUMN qty_meter TYPE DECIMAL(10,4),
ALTER COLUMN qty_meter_2 TYPE DECIMAL(10,4);

-- Fix version tables if they exist (only qty_meter fields)
DO $$
BEGIN
    -- Check if fg_bom_versions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fg_bom_versions') THEN
        ALTER TABLE fg_bom_versions 
        ALTER COLUMN qty_meter TYPE DECIMAL(10,4),
        ALTER COLUMN qty_meter_2 TYPE DECIMAL(10,4);
    END IF;
    
    -- Check if local_bom_versions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'local_bom_versions') THEN
        ALTER TABLE local_bom_versions 
        ALTER COLUMN qty_meter TYPE DECIMAL(10,4),
        ALTER COLUMN qty_meter_2 TYPE DECIMAL(10,4);
    END IF;
END $$;

-- Recreate the views with the correct column types
-- Note: You may need to adjust these view definitions based on your actual view structure

-- Recreate fg_bom_with_versions view (adjust the SELECT statement as needed)
CREATE OR REPLACE VIEW fg_bom_with_versions AS
SELECT 
    f.*,
    v.version_number,
    v.is_active
FROM fg_bom f
LEFT JOIN fg_bom_versions v ON f.id = v.fg_bom_id;

-- Recreate local_bom_with_versions view (adjust the SELECT statement as needed)
CREATE OR REPLACE VIEW local_bom_with_versions AS
SELECT 
    l.*,
    v.version_number,
    v.is_active
FROM local_bom l
LEFT JOIN local_bom_versions v ON l.id = v.local_bom_id;

-- Verify the changes for qty_meter fields only
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name IN ('fg_bom', 'local_bom', 'fg_bom_versions', 'local_bom_versions')
    AND column_name IN ('qty_meter', 'qty_meter_2')
ORDER BY table_name, column_name;
