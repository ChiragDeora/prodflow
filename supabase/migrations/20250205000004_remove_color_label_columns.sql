-- ============================================================================
-- REMOVE UNUSED COLUMNS FROM COLOR_LABEL_MASTER
-- Removes hex_code and description columns to match simplified format
-- ============================================================================

-- Drop the hex_code column if it exists
ALTER TABLE color_label_master DROP COLUMN IF EXISTS hex_code;

-- Drop the description column if it exists
ALTER TABLE color_label_master DROP COLUMN IF EXISTS description;

-- Drop the index on hex_code if it exists
DROP INDEX IF EXISTS idx_color_label_master_hex_code;


