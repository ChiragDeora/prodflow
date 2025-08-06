-- Add comprehensive mold master fields including drawing images
-- Based on the Excel headers: Sr.no., Mold name, Type, Cavity, Cycle Time, Dwg Wt, Std. Wt., RP wt., Dimensions, Mold Wt., HRC Make, HRC Zone, Make, Start Date, Make Dwg, RP Dwg

-- Add new columns to molds table
ALTER TABLE molds 
ADD COLUMN IF NOT EXISTS sr_no INTEGER,
ADD COLUMN IF NOT EXISTS type VARCHAR(100),
ADD COLUMN IF NOT EXISTS cavity INTEGER,
ADD COLUMN IF NOT EXISTS cycle_time DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS dwg_wt DECIMAL(10,2), -- Drawing Weight
ADD COLUMN IF NOT EXISTS std_wt DECIMAL(10,2), -- Standard Weight
ADD COLUMN IF NOT EXISTS rp_wt DECIMAL(10,2), -- RP Weight
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(200),
ADD COLUMN IF NOT EXISTS mold_wt DECIMAL(10,2), -- Mold Weight
ADD COLUMN IF NOT EXISTS hrc_make VARCHAR(100),
ADD COLUMN IF NOT EXISTS hrc_zone VARCHAR(50),
ADD COLUMN IF NOT EXISTS make VARCHAR(100),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS make_dwg_image TEXT, -- Make Drawing Image (Base64 or URL)
ADD COLUMN IF NOT EXISTS rp_dwg_image TEXT; -- RP Drawing Image (Base64 or URL)

-- Update existing data to populate new fields with default values
UPDATE molds SET 
  sr_no = CAST(mold_id AS INTEGER)
WHERE sr_no IS NULL AND mold_id ~ '^[0-9]+$';

UPDATE molds SET 
  type = 'Injection Mold'
WHERE type IS NULL;

UPDATE molds SET 
  cavity = cavities
WHERE cavity IS NULL;

UPDATE molds SET 
  cycle_time = 30.0
WHERE cycle_time IS NULL;

UPDATE molds SET 
  dwg_wt = 0.0
WHERE dwg_wt IS NULL;

UPDATE molds SET 
  std_wt = st_wt
WHERE std_wt IS NULL AND st_wt IS NOT NULL;

UPDATE molds SET 
  std_wt = 100.0
WHERE std_wt IS NULL;

UPDATE molds SET 
  rp_wt = 0.0
WHERE rp_wt IS NULL;

UPDATE molds SET 
  dimensions = 'Standard'
WHERE dimensions IS NULL;

UPDATE molds SET 
  mold_wt = 0.0
WHERE mold_wt IS NULL;

UPDATE molds SET 
  hrc_make = 'Standard'
WHERE hrc_make IS NULL;

UPDATE molds SET 
  hrc_zone = 'Zone A'
WHERE hrc_zone IS NULL;

UPDATE molds SET 
  make = maker
WHERE make IS NULL;

UPDATE molds SET 
  start_date = purchase_date
WHERE start_date IS NULL;

-- Add indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_molds_sr_no ON molds(sr_no);
CREATE INDEX IF NOT EXISTS idx_molds_type ON molds(type);
CREATE INDEX IF NOT EXISTS idx_molds_cavity ON molds(cavity);
CREATE INDEX IF NOT EXISTS idx_molds_cycle_time ON molds(cycle_time);
CREATE INDEX IF NOT EXISTS idx_molds_hrc_make ON molds(hrc_make);
CREATE INDEX IF NOT EXISTS idx_molds_hrc_zone ON molds(hrc_zone);
CREATE INDEX IF NOT EXISTS idx_molds_make ON molds(make);
CREATE INDEX IF NOT EXISTS idx_molds_start_date ON molds(start_date);

-- Add comments to document the new fields
COMMENT ON COLUMN molds.sr_no IS 'Serial number for mold identification';
COMMENT ON COLUMN molds.type IS 'Type of mold (e.g., Injection Mold)';
COMMENT ON COLUMN molds.cavity IS 'Number of cavities in the mold';
COMMENT ON COLUMN molds.cycle_time IS 'Cycle time in seconds';
COMMENT ON COLUMN molds.dwg_wt IS 'Drawing weight';
COMMENT ON COLUMN molds.std_wt IS 'Standard weight';
COMMENT ON COLUMN molds.rp_wt IS 'RP weight';
COMMENT ON COLUMN molds.dimensions IS 'Mold dimensions';
COMMENT ON COLUMN molds.mold_wt IS 'Mold weight';
COMMENT ON COLUMN molds.hrc_make IS 'HRC make information';
COMMENT ON COLUMN molds.hrc_zone IS 'HRC zone information';
COMMENT ON COLUMN molds.make IS 'Make of the mold';
COMMENT ON COLUMN molds.start_date IS 'Start date for the mold';
COMMENT ON COLUMN molds.make_dwg_image IS 'Make drawing image (Base64 encoded or URL)';
COMMENT ON COLUMN molds.rp_dwg_image IS 'RP drawing image (Base64 encoded or URL)';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Mold master table updated with comprehensive fields:';
    RAISE NOTICE '- Serial number (sr_no)';
    RAISE NOTICE '- Type field';
    RAISE NOTICE '- Cavity count';
    RAISE NOTICE '- Cycle time';
    RAISE NOTICE '- Drawing weight (dwg_wt)';
    RAISE NOTICE '- Standard weight (std_wt)';
    RAISE NOTICE '- RP weight (rp_wt)';
    RAISE NOTICE '- Dimensions';
    RAISE NOTICE '- Mold weight (mold_wt)';
    RAISE NOTICE '- HRC make (hrc_make)';
    RAISE NOTICE '- HRC zone (hrc_zone)';
    RAISE NOTICE '- Make field';
    RAISE NOTICE '- Start date';
    RAISE NOTICE '- Make drawing image (make_dwg_image)';
    RAISE NOTICE '- RP drawing image (rp_dwg_image)';
    RAISE NOTICE 'Mold master table updated successfully!';
END $$; 