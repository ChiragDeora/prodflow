-- Apply comprehensive machine master fields directly
-- Run this in your Supabase SQL editor

-- Add new fields to machines table
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS serial_no VARCHAR(200),
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);

-- Update existing data to set category based on type
UPDATE machines SET 
  category = CASE 
    WHEN type LIKE '%Injection%' OR type LIKE '%IM%' THEN 'IM'
    WHEN type LIKE '%Robot%' THEN 'Robot'
    WHEN type LIKE '%Aux%' OR type LIKE '%Auxiliary%' THEN 'Aux'
    WHEN type LIKE '%Utility%' THEN 'Utility'
    ELSE type
  END
WHERE category IS NULL;

-- Set default values for new fields
UPDATE machines SET 
  serial_no = COALESCE(clm_sr_no, '') || CASE 
    WHEN inj_serial_no IS NOT NULL AND inj_serial_no != '' 
    THEN '/' || inj_serial_no 
    ELSE '' 
  END
WHERE serial_no IS NULL;

-- Add index for category field for better performance
CREATE INDEX IF NOT EXISTS idx_machines_category ON machines(category);

-- Add index for serial number searches
CREATE INDEX IF NOT EXISTS idx_machines_serial_no ON machines(serial_no);

-- Verify the changes
SELECT 
  machine_id,
  make,
  model,
  category,
  serial_no,
  dimensions,
  clm_sr_no,
  inj_serial_no
FROM machines 
LIMIT 5; 