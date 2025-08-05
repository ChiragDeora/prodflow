-- Add category column to machines table

-- Add category column to machines table
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'IM';

-- Update existing data to populate category field based on machine_id patterns
UPDATE machines SET 
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

-- Add index for better performance on category column
CREATE INDEX IF NOT EXISTS idx_machines_category ON machines(category); 