-- Fix sr_no data type to support string values like "RP-1", "RP-2", etc.
-- Change sr_no from INTEGER to VARCHAR

-- First, drop the existing column
ALTER TABLE molds DROP COLUMN IF EXISTS sr_no;

-- Add the column back as VARCHAR
ALTER TABLE molds ADD COLUMN sr_no VARCHAR(50);

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_molds_sr_no ON molds(sr_no);

-- Add comment
COMMENT ON COLUMN molds.sr_no IS 'Serial number for mold identification (string format)';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Fixed sr_no data type from INTEGER to VARCHAR to support string values like "RP-1", "RP-2"';
    RAISE NOTICE 'Mold master table updated successfully!';
END $$; 