-- =====================================================
-- ADD CHANGEOVER FLAGS TO PRODUCT COLORS AND PARTY CODES
-- =====================================================
-- This migration adds explicit is_changeover flags to 
-- production_block_product_colors and production_block_party_codes
-- to clearly distinguish changeover data from regular production data.
-- 
-- IMPORTANT: Changeover data does NOT overlap with original block data because:
-- 1. Original production block has its own block_id (e.g., "block-123")
--    - Product colors/party codes saved with block_id = "block-123", is_changeover = false
-- 2. Changeover block has a DIFFERENT block_id (e.g., "changeover-block-123-456")
--    - Product colors/party codes saved with block_id = "changeover-block-123-456", is_changeover = true
-- 
-- The block_id foreign key ensures complete separation. The is_changeover flag is for
-- clarity and easier querying, but the actual separation is by different block_ids.
-- =====================================================

-- Add is_changeover column to production_block_product_colors
ALTER TABLE production_block_product_colors
ADD COLUMN IF NOT EXISTS is_changeover BOOLEAN NOT NULL DEFAULT false;

-- Add is_changeover column to production_block_party_codes
ALTER TABLE production_block_party_codes
ADD COLUMN IF NOT EXISTS is_changeover BOOLEAN NOT NULL DEFAULT false;

-- Update existing records: set is_changeover = true for entries linked to changeover blocks
UPDATE production_block_product_colors pbc
SET is_changeover = true
FROM production_blocks pb
WHERE pbc.block_id = pb.id
  AND pb.is_changeover_block = true
  AND pbc.is_changeover = false;

UPDATE production_block_party_codes pbc
SET is_changeover = true
FROM production_blocks pb
WHERE pbc.block_id = pb.id
  AND pb.is_changeover_block = true
  AND pbc.is_changeover = false;

-- Add index for efficient querying of changeover product colors
CREATE INDEX IF NOT EXISTS idx_production_block_product_colors_is_changeover 
ON production_block_product_colors(is_changeover) 
WHERE is_changeover = true;

-- Add index for efficient querying of changeover party codes
CREATE INDEX IF NOT EXISTS idx_production_block_party_codes_is_changeover 
ON production_block_party_codes(is_changeover) 
WHERE is_changeover = true;

-- Add comments to clarify the new columns
COMMENT ON COLUMN production_block_product_colors.is_changeover IS 
'True if this product color entry is for a changeover block. 
Changeover blocks are created when a production block has changeover_time and changeover_mold_id set.
When is_changeover = true, this records the party name and color for the CHANGEOVER MOLD 
(specified in changeover_mold_id), NOT the original production block''s mold.
This flag makes it explicit which product colors are for changeover vs regular production, 
even though it can be inferred from the block''s is_changeover_block flag via a join.';

COMMENT ON COLUMN production_block_party_codes.is_changeover IS 
'True if this party code entry is for a changeover block. 
Changeover blocks are created when a production block has changeover_time and changeover_mold_id set.
When is_changeover = true, this records the party name for the CHANGEOVER MOLD 
(specified in changeover_mold_id), NOT the original production block''s mold.
This flag makes it explicit which party codes are for changeover vs regular production, 
even though it can be inferred from the block''s is_changeover_block flag via a join.';

-- Create a trigger to automatically set is_changeover flag when inserting/updating
-- based on the block's is_changeover_block status
CREATE OR REPLACE FUNCTION set_changeover_flag_for_product_colors()
RETURNS TRIGGER AS $$
BEGIN
    -- Set is_changeover based on the block's is_changeover_block flag
    SELECT pb.is_changeover_block INTO NEW.is_changeover
    FROM production_blocks pb
    WHERE pb.id = NEW.block_id;
    
    -- If block not found, keep the default (false)
    IF NEW.is_changeover IS NULL THEN
        NEW.is_changeover := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_changeover_flag_product_colors
    BEFORE INSERT OR UPDATE ON production_block_product_colors
    FOR EACH ROW
    EXECUTE FUNCTION set_changeover_flag_for_product_colors();

-- Create a trigger for party codes
CREATE OR REPLACE FUNCTION set_changeover_flag_for_party_codes()
RETURNS TRIGGER AS $$
BEGIN
    -- Set is_changeover based on the block's is_changeover_block flag
    SELECT pb.is_changeover_block INTO NEW.is_changeover
    FROM production_blocks pb
    WHERE pb.id = NEW.block_id;
    
    -- If block not found, keep the default (false)
    IF NEW.is_changeover IS NULL THEN
        NEW.is_changeover := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_changeover_flag_party_codes
    BEFORE INSERT OR UPDATE ON production_block_party_codes
    FOR EACH ROW
    EXECUTE FUNCTION set_changeover_flag_for_party_codes();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Uncomment to verify the migration:

-- Check product colors with changeover flag
-- SELECT 
--     pbc.id,
--     pbc.block_id,
--     pb.is_changeover_block,
--     pbc.is_changeover,
--     pbc.color,
--     pbc.quantity,
--     pbc.party_code
-- FROM production_block_product_colors pbc
-- JOIN production_blocks pb ON pbc.block_id = pb.id
-- WHERE pb.is_changeover_block = true
-- LIMIT 10;

-- Check party codes with changeover flag
-- SELECT 
--     pbc.id,
--     pbc.block_id,
--     pb.is_changeover_block,
--     pbc.is_changeover,
--     pbc.party_code
-- FROM production_block_party_codes pbc
-- JOIN production_blocks pb ON pbc.block_id = pb.id
-- WHERE pb.is_changeover_block = true
-- LIMIT 10;

