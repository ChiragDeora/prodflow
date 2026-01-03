-- =====================================================
-- ADD SUPPORT FOR CHANGEOVER PRODUCT COLORS AND PARTY CODES
-- =====================================================
-- This migration documents and ensures support for storing
-- separate product colors and party codes for changeover blocks.
-- 
-- The production_block_product_colors table already supports this
-- functionality - each changeover block (identified by is_changeover_block = true)
-- can have its own product colors and party codes stored via the block_id foreign key.
-- 
-- When a production block has changeover configured (changeover_time and changeover_mold_id),
-- a separate changeover block is created on the next day. The changeover block can have
-- its own product colors and party codes, separate from the original production block.
-- 
-- This migration adds comments to clarify the relationship and ensures
-- proper indexing for efficient queries.
-- =====================================================

-- Add comments to clarify changeover product colors support
COMMENT ON TABLE production_block_product_colors IS 
'Stores product colors with quantities for each production block. 
Each block (including changeover blocks) can have multiple product colors with different quantities.
Each color can optionally be associated with a party code.
For changeover blocks (is_changeover_block = true), this stores the changeover-specific product colors 
and party codes configured in the "Changeover Party Name and Colors" section of the edit modal.
These are separate from the original production block''s product colors.';

COMMENT ON COLUMN production_block_product_colors.block_id IS 
'References production_blocks.id. 
- For regular production blocks: stores the main product colors and party codes.
- For changeover blocks (is_changeover_block = true): stores the changeover-specific product colors 
  and party codes configured in the "Changeover Party Name and Colors" section of the edit modal.
  These are separate from the original production block''s product colors.';

COMMENT ON COLUMN production_block_product_colors.party_code IS 
'Party code/name from party_name_master. Colors available for each party are defined in party_color_mapping table.
For changeover blocks, this represents the party codes configured specifically for the changeover block.
These party codes are independent of the original production block''s party codes.';

COMMENT ON COLUMN production_block_product_colors.color IS 
'Color name (e.g., "Black", "Peach", "White"). For changeover blocks, these are the colors 
configured specifically for the changeover block, separate from the original production block.';

COMMENT ON COLUMN production_block_product_colors.quantity IS 
'Number of pieces for this color. For changeover blocks, these quantities are specific to 
the changeover block and independent of the original production block quantities.';

-- Ensure indexes exist for efficient queries on changeover blocks
CREATE INDEX IF NOT EXISTS idx_production_block_product_colors_block_id 
ON production_block_product_colors(block_id);

CREATE INDEX IF NOT EXISTS idx_production_block_product_colors_party_code 
ON production_block_product_colors(party_code) 
WHERE party_code IS NOT NULL;

-- Add index for querying changeover blocks specifically
CREATE INDEX IF NOT EXISTS idx_production_blocks_changeover_block 
ON production_blocks(is_changeover_block) 
WHERE is_changeover_block = true;

-- Add comment to production_blocks table about changeover product colors
COMMENT ON COLUMN production_blocks.is_changeover_block IS 
'True if this is the changeover block (displayed in gray). Created automatically when changeover_time 
and changeover_mold_id are set on a production block.
Changeover blocks have their own product colors and party codes stored in production_block_product_colors table, 
separate from the original production block that triggered the changeover.
The changeover block is created on the next day (start_day + 1) on the same line as the original block.';

COMMENT ON COLUMN production_blocks.changeover_mold_id IS 
'Reference to the mold that will be used after changeover. When set along with changeover_time, 
a changeover block is automatically created. The changeover block can have its own product colors 
and party codes configured in the "Changeover Party Name and Colors" section of the edit modal.';

COMMENT ON COLUMN production_blocks.changeover_time IS 
'Changeover time in minutes from production day start (8 AM). When set along with changeover_mold_id, 
a changeover block is created. The changeover block can have separate product colors and party codes.';

-- Verify the structure supports changeover product colors
DO $$
BEGIN
    -- Check if production_block_product_colors table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'production_block_product_colors'
    ) THEN
        RAISE NOTICE 'production_block_product_colors table exists - changeover product colors support is ready';
    ELSE
        RAISE EXCEPTION 'production_block_product_colors table does not exist - please run create_prod_planner_tables.sql first';
    END IF;
    
    -- Check if foreign key constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'production_block_product_colors_block_id_fkey'
        AND table_name = 'production_block_product_colors'
    ) THEN
        RAISE NOTICE 'Foreign key constraint exists - changeover blocks can reference product colors';
    ELSE
        RAISE WARNING 'Foreign key constraint may not exist - verify production_block_product_colors structure';
    END IF;
    
    -- Check if indexes were created
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_production_block_product_colors_block_id'
    ) THEN
        RAISE NOTICE 'Index idx_production_block_product_colors_block_id created successfully';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_production_blocks_changeover_block'
    ) THEN
        RAISE NOTICE 'Index idx_production_blocks_changeover_block created successfully';
    END IF;
END $$;

-- =====================================================
-- USAGE NOTES
-- =====================================================
-- 1. When editing a production block with changeover configured:
--    - The "Party Codes & Product Colors" section is for the main production block
--    - The "Changeover Party Name and Colors" section (visible when changeover_time and 
--      changeover_mold_id are set) is for the changeover block
--
-- 2. When saving a production block with changeover:
--    - The main block's product colors are saved to production_block_product_colors 
--      with the main block's id
--    - The changeover product colors are saved to production_block_product_colors 
--      with the changeover block's id (created automatically)
--
-- 3. When loading blocks:
--    - The changeover block's product colors are loaded and attached to the parent block
--      as changeoverProductColors and changeoverPartyCodes
--
-- 4. Querying changeover blocks with product colors:
--    - Use the query below to see all changeover blocks with their product colors
-- =====================================================

-- Summary query to show changeover blocks with their product colors
-- This is a view-like query for documentation purposes
-- (Uncomment and run manually if you want to see changeover blocks with product colors)
/*
SELECT 
    pb.id AS block_id,
    pb.label AS block_label,
    pb.is_changeover_block,
    pb.changeover_mold_id,
    pb.start_day,
    pb.line_id,
    COUNT(DISTINCT pbc.id) AS product_color_count,
    COUNT(DISTINCT pbc.party_code) AS party_code_count,
    STRING_AGG(DISTINCT pbc.party_code, ', ') AS party_codes,
    STRING_AGG(DISTINCT pbc.color || ' (' || pbc.quantity || ')', ', ') AS product_colors
FROM production_blocks pb
LEFT JOIN production_block_product_colors pbc ON pb.id = pbc.block_id
WHERE pb.is_changeover_block = true
GROUP BY pb.id, pb.label, pb.is_changeover_block, pb.changeover_mold_id, pb.start_day, pb.line_id
ORDER BY pb.line_id, pb.start_day;
*/

-- Query to find parent blocks and their associated changeover blocks with product colors
/*
SELECT 
    parent.id AS parent_block_id,
    parent.label AS parent_block_label,
    parent.changeover_time,
    parent.changeover_mold_id,
    changeover.id AS changeover_block_id,
    changeover.label AS changeover_block_label,
    COUNT(DISTINCT pbc.id) AS changeover_product_color_count,
    STRING_AGG(DISTINCT pbc.party_code, ', ') AS changeover_party_codes,
    STRING_AGG(DISTINCT pbc.color || ' (' || pbc.quantity || ')', ', ') AS changeover_product_colors
FROM production_blocks parent
LEFT JOIN production_blocks changeover ON 
    changeover.is_changeover_block = true 
    AND changeover.line_id = parent.line_id 
    AND changeover.start_day = parent.start_day + 1
LEFT JOIN production_block_product_colors pbc ON changeover.id = pbc.block_id
WHERE parent.changeover_time IS NOT NULL 
    AND parent.changeover_time > 0
    AND parent.changeover_mold_id IS NOT NULL
GROUP BY parent.id, parent.label, parent.changeover_time, parent.changeover_mold_id,
         changeover.id, changeover.label
ORDER BY parent.line_id, parent.start_day;
*/
