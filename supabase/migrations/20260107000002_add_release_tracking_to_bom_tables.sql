-- ============================================================================
-- ADD RELEASE TRACKING AND VERSIONING TO BOM TABLES
-- ============================================================================
-- 1. Adds released_at and released_by columns to track when BOMs were released
--    and by whom. Released BOMs become view-only.
-- 2. Adds version tracking - same item_name with different sfg_code (incremented
--    end digit) is allowed and treated as a new version.
-- ============================================================================

-- Add release tracking columns to sfg_bom
ALTER TABLE sfg_bom 
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_by VARCHAR(100);

-- Add release tracking columns to fg_bom  
ALTER TABLE fg_bom 
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_by VARCHAR(100);

-- Add release tracking columns to local_bom
ALTER TABLE local_bom 
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_by VARCHAR(100);

-- Add updated_by column if not exists
ALTER TABLE sfg_bom 
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE fg_bom 
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE local_bom 
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Add version column to track BOM versions
-- Version is determined by sfg_code end digit for same item_name
ALTER TABLE sfg_bom 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE fg_bom 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE local_bom 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_sfg_bom_status ON sfg_bom(status);
CREATE INDEX IF NOT EXISTS idx_fg_bom_status ON fg_bom(status);
CREATE INDEX IF NOT EXISTS idx_local_bom_status ON local_bom(status);

-- Index on item_name for version grouping
CREATE INDEX IF NOT EXISTS idx_sfg_bom_item_name ON sfg_bom(item_name);
CREATE INDEX IF NOT EXISTS idx_fg_bom_item_code ON fg_bom(item_code);
CREATE INDEX IF NOT EXISTS idx_local_bom_item_code ON local_bom(item_code);

-- Update views to include new columns
-- First drop existing views
DROP VIEW IF EXISTS sfg_bom_with_versions CASCADE;
DROP VIEW IF EXISTS fg_bom_with_versions CASCADE;
DROP VIEW IF EXISTS local_bom_with_versions CASCADE;

-- Recreate views with version info
-- For SFG: shows versions grouped by item_name (same mold name, different sfg_code = different versions)
CREATE OR REPLACE VIEW sfg_bom_with_versions AS
SELECT 
    s.*,
    -- Count versions with same item_name
    (SELECT COUNT(*) FROM sfg_bom s2 WHERE s2.item_name = s.item_name) as total_versions,
    -- Get the latest version number for this item_name
    (SELECT MAX(CAST(RIGHT(s3.sfg_code, 1) AS INTEGER)) FROM sfg_bom s3 WHERE s3.item_name = s.item_name) as latest_version,
    -- Get all related versions as JSON
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', v.id,
            'sfg_code', v.sfg_code,
            'version', CAST(RIGHT(v.sfg_code, 1) AS INTEGER),
            'status', v.status,
            'released_at', v.released_at,
            'released_by', v.released_by
        ) ORDER BY v.sfg_code DESC)
         FROM sfg_bom v 
         WHERE v.item_name = s.item_name AND v.id != s.id), '[]'::json
    ) as related_versions
FROM sfg_bom s;

CREATE OR REPLACE VIEW fg_bom_with_versions AS
SELECT 
    f.*,
    (SELECT COUNT(*) FROM fg_bom f2 WHERE f2.item_code LIKE SUBSTRING(f.item_code FROM 1 FOR LENGTH(f.item_code)-1) || '%') as total_versions,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', v.id,
            'item_code', v.item_code,
            'status', v.status,
            'released_at', v.released_at
        ) ORDER BY v.item_code DESC)
         FROM fg_bom v 
         WHERE v.item_code LIKE SUBSTRING(f.item_code FROM 1 FOR LENGTH(f.item_code)-1) || '%' AND v.id != f.id), '[]'::json
    ) as related_versions
FROM fg_bom f;

CREATE OR REPLACE VIEW local_bom_with_versions AS
SELECT 
    l.*,
    (SELECT COUNT(*) FROM local_bom l2 WHERE l2.item_code LIKE SUBSTRING(l.item_code FROM 1 FOR LENGTH(l.item_code)-1) || '%') as total_versions,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', v.id,
            'item_code', v.item_code,
            'status', v.status,
            'released_at', v.released_at
        ) ORDER BY v.item_code DESC)
         FROM local_bom v 
         WHERE v.item_code LIKE SUBSTRING(l.item_code FROM 1 FOR LENGTH(l.item_code)-1) || '%' AND v.id != l.id), '[]'::json
    ) as related_versions
FROM local_bom l;

-- Comment on columns
COMMENT ON COLUMN sfg_bom.released_at IS 'Timestamp when BOM was released (made view-only)';
COMMENT ON COLUMN sfg_bom.released_by IS 'User who released the BOM';
COMMENT ON COLUMN sfg_bom.version IS 'Version number - derived from sfg_code end digit';
COMMENT ON COLUMN fg_bom.released_at IS 'Timestamp when BOM was released (made view-only)';
COMMENT ON COLUMN fg_bom.released_by IS 'User who released the BOM';
COMMENT ON COLUMN local_bom.released_at IS 'Timestamp when BOM was released (made view-only)';
COMMENT ON COLUMN local_bom.released_by IS 'User who released the BOM';

-- ============================================================================
-- VERSIONING LOGIC
-- ============================================================================
-- SFG BOM versioning works as follows:
-- - item_name stays the same (e.g., "RP-Ro10-C")
-- - sfg_code end digit increments (e.g., 110110001 → 110110002)
-- - Each unique sfg_code is allowed (no duplicate sfg_code)
-- - Same item_name with different sfg_code = different versions
--
-- Example:
-- | item_name   | sfg_code  | version | status   |
-- |-------------|-----------|---------|----------|
-- | RP-Ro10-C   | 110110001 | 1       | released |
-- | RP-Ro10-C   | 110110002 | 2       | draft    |
-- ============================================================================

-- ============================================================================
-- OUTPUT
-- ============================================================================
SELECT 'Release tracking and versioning added to BOM tables successfully' as result;

