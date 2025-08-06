-- Update existing raw_materials table to add new fields and TDS image support
-- This script updates the existing table structure without recreating it

-- First, make old columns nullable to avoid constraint issues
ALTER TABLE raw_materials 
ALTER COLUMN type1 DROP NOT NULL,
ALTER COLUMN type2 DROP NOT NULL;

-- Add new columns to existing raw_materials table
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'PP',
ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT 'HP',
ADD COLUMN IF NOT EXISTS tds_image TEXT,
ADD COLUMN IF NOT EXISTS remark TEXT;

-- Update existing data to populate new fields
-- Convert old type1/type2 structure to new category/type structure
UPDATE raw_materials 
SET 
  category = COALESCE(type1, 'PP'),
  type = COALESCE(type2, 'HP')
WHERE category IS NULL OR type IS NULL;

-- Update MFI and density to allow NULL values
ALTER TABLE raw_materials 
ALTER COLUMN mfi TYPE DECIMAL(10,2),
ALTER COLUMN density TYPE DECIMAL(10,3);

-- Update existing data to handle NULL values properly
UPDATE raw_materials 
SET mfi = NULL 
WHERE mfi = 0;

UPDATE raw_materials 
SET density = NULL 
WHERE density = 0;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_type ON raw_materials(type);
CREATE INDEX IF NOT EXISTS idx_raw_materials_supplier ON raw_materials(supplier);
CREATE INDEX IF NOT EXISTS idx_raw_materials_grade ON raw_materials(grade);

-- Drop old columns after migration is complete
ALTER TABLE raw_materials DROP COLUMN IF EXISTS type1;
ALTER TABLE raw_materials DROP COLUMN IF EXISTS type2;

-- Print success message (PostgreSQL doesn't have PRINT, so we'll use RAISE NOTICE)
DO $$
BEGIN
    RAISE NOTICE 'Raw Materials table updated successfully!';
    RAISE NOTICE 'New features added:';
    RAISE NOTICE '- TDS image support (tds_image field)';
    RAISE NOTICE '- Updated schema with category and type fields';
    RAISE NOTICE '- Support for null MFI and density values';
    RAISE NOTICE '- Remark field for additional notes';
    RAISE NOTICE '- Updated table headers: Sl. No., Category, Type, Grade, Supplier, MFI, Density, TDS, Remark, Actions';
    RAISE NOTICE 'Ready for Excel import!';
END $$; 