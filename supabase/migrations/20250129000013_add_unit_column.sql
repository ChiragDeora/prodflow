-- Add Unit column to all master data tables for multi-factory support
-- This will help distinguish between different factory units (Unit 1, Unit 2, etc.)

-- Add unit column to machines table
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Unit 1';

-- Add unit column to molds table
ALTER TABLE molds 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Unit 1';

-- Add unit column to raw_materials table
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Unit 1';

-- Add unit column to packing_materials table
ALTER TABLE packing_materials 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Unit 1';

-- Update existing data to set unit to 'Unit 1' if it's null
UPDATE machines SET unit = 'Unit 1' WHERE unit IS NULL;
UPDATE molds SET unit = 'Unit 1' WHERE unit IS NULL;
UPDATE raw_materials SET unit = 'Unit 1' WHERE unit IS NULL;
UPDATE packing_materials SET unit = 'Unit 1' WHERE unit IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machines_unit ON machines(unit);
CREATE INDEX IF NOT EXISTS idx_molds_unit ON molds(unit);
CREATE INDEX IF NOT EXISTS idx_raw_materials_unit ON raw_materials(unit);
CREATE INDEX IF NOT EXISTS idx_packing_materials_unit ON packing_materials(unit);

-- Add comments to document the new fields
COMMENT ON COLUMN machines.unit IS 'Factory unit identifier (Unit 1, Unit 2, etc.)';
COMMENT ON COLUMN molds.unit IS 'Factory unit identifier (Unit 1, Unit 2, etc.)';
COMMENT ON COLUMN raw_materials.unit IS 'Factory unit identifier (Unit 1, Unit 2, etc.)';
COMMENT ON COLUMN packing_materials.unit IS 'Factory unit identifier (Unit 1, Unit 2, etc.)';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Added Unit column to all master data tables:';
    RAISE NOTICE '- machines table';
    RAISE NOTICE '- molds table';
    RAISE NOTICE '- raw_materials table';
    RAISE NOTICE '- packing_materials table';
    RAISE NOTICE 'All existing records set to "Unit 1"';
    RAISE NOTICE 'Ready for multi-factory expansion!';
END $$; 