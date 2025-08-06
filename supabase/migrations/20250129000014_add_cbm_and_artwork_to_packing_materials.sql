-- Add CBM and Artwork columns to packing_materials table
-- CBM: Cubic meter measurement for flat box area
-- Artwork: Image field for artwork (empty by default)

-- Add CBM column (decimal for precise measurements)
ALTER TABLE packing_materials 
ADD COLUMN cbm DECIMAL(10,4);

-- Add Artwork column (TEXT for storing image data or URL)
ALTER TABLE packing_materials 
ADD COLUMN artwork TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN packing_materials.cbm IS 'Cubic meter measurement - area that flat box would take';
COMMENT ON COLUMN packing_materials.artwork IS 'Artwork image data or URL';

-- Create index for CBM for better performance on sorting/filtering
CREATE INDEX IF NOT EXISTS idx_packing_materials_cbm ON packing_materials(cbm); 