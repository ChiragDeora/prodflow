-- Update molds table to include new columns for enhanced mold master data

-- Add new columns to molds table
ALTER TABLE molds 
ADD COLUMN IF NOT EXISTS item_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS item_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS type VARCHAR(100),
ADD COLUMN IF NOT EXISTS cycle_time DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS st_wt DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS hrc_zone VARCHAR(50),
ADD COLUMN IF NOT EXISTS make VARCHAR(100);

-- Update existing data to populate new fields with default values
UPDATE molds SET 
  item_code = mold_id,
  item_name = mold_name,
  type = 'Injection Mold',
  cycle_time = 30.0,
  st_wt = 100.0,
  hrc_zone = 'Zone A',
  make = maker
WHERE item_code IS NULL;

-- Add indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_molds_item_code ON molds(item_code);
CREATE INDEX IF NOT EXISTS idx_molds_type ON molds(type);
CREATE INDEX IF NOT EXISTS idx_molds_hrc_zone ON molds(hrc_zone);
CREATE INDEX IF NOT EXISTS idx_molds_make ON molds(make); 