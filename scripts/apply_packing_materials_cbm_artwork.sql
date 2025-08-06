-- Apply CBM and Artwork columns to packing_materials table
-- This script adds the new columns to the existing packing_materials table

-- Add CBM column (decimal for precise measurements)
ALTER TABLE packing_materials 
ADD COLUMN IF NOT EXISTS cbm DECIMAL(10,4);

-- Add Artwork column (TEXT for storing image data or URL)
ALTER TABLE packing_materials 
ADD COLUMN IF NOT EXISTS artwork TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN packing_materials.cbm IS 'Cubic meter measurement - area that flat box would take';
COMMENT ON COLUMN packing_materials.artwork IS 'Artwork image data or URL';

-- Create index for CBM for better performance on sorting/filtering
CREATE INDEX IF NOT EXISTS idx_packing_materials_cbm ON packing_materials(cbm);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'packing_materials' 
AND column_name IN ('cbm', 'artwork')
ORDER BY column_name; 