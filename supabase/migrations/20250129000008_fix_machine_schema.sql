-- Fix machine schema to match the code expectations
-- Add missing fields to machines table

-- Add missing fields to machines table
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'IM',
ADD COLUMN IF NOT EXISTS size INTEGER,
ADD COLUMN IF NOT EXISTS clm_sr_no VARCHAR(200),
ADD COLUMN IF NOT EXISTS inj_serial_no VARCHAR(200),
ADD COLUMN IF NOT EXISTS serial_no VARCHAR(200),
ADD COLUMN IF NOT EXISTS mfg_date DATE,
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100),
ADD COLUMN IF NOT EXISTS nameplate_details TEXT;

-- Update existing data to populate new fields
UPDATE machines SET 
  size = capacity_tons,
  category = CASE 
    WHEN machine_id LIKE 'JSW%' THEN 'IM'
    WHEN machine_id LIKE 'HAIT%' THEN 'IM'
    WHEN machine_id LIKE 'TOYO%' THEN 'IM'
    WHEN machine_id LIKE 'WITT%' THEN 'Robot'
    WHEN machine_id LIKE 'SWTK%' THEN 'Robot'
    WHEN machine_id LIKE 'CONY%' THEN 'Aux'
    WHEN machine_id LIKE 'Hoist%' THEN 'Aux'
    WHEN machine_id LIKE 'Pump%' THEN 'Aux'
    WHEN machine_id LIKE 'CTower%' THEN 'Aux'
    WHEN machine_id LIKE 'Blower%' THEN 'Aux'
    WHEN machine_id LIKE 'Grinding%' THEN 'Aux'
    WHEN machine_id LIKE 'PPACK%' THEN 'Aux'
    WHEN machine_id LIKE 'SILO%' THEN 'Aux'
    WHEN machine_id LIKE 'LIFT%' THEN 'Aux'
    WHEN machine_id LIKE 'Stacker%' THEN 'Aux'
    WHEN machine_id LIKE 'Cooler%' THEN 'Aux'
    WHEN machine_id LIKE 'RO%' THEN 'Aux'
    WHEN machine_id LIKE 'Chiller%' THEN 'Utility'
    WHEN machine_id LIKE 'AIR%' THEN 'Utility'
    WHEN machine_id LIKE 'ELEC%' THEN 'Utility'
    ELSE 'IM'
  END
WHERE category IS NULL OR category = 'IM';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machines_category ON machines(category);
CREATE INDEX IF NOT EXISTS idx_machines_size ON machines(size);
CREATE INDEX IF NOT EXISTS idx_machines_serial_no ON machines(serial_no); 