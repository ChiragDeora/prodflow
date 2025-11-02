-- ============================================================================
-- ADD SFG BOM FIELDS TO BOM_MASTER_TRIAL TABLE
-- ============================================================================

-- Drop all existing triggers and functions to start clean
DROP TRIGGER IF EXISTS enforce_bom_master_immutability ON bom_master_trial;
DROP TRIGGER IF EXISTS enforce_bom_version_immutability ON bom_versions_trial;
DROP FUNCTION IF EXISTS enforce_bom_immutability() CASCADE;

-- Create a simple trigger function for bom_master_trial only
CREATE OR REPLACE FUNCTION enforce_bom_master_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent updates to released BOMs
    IF TG_OP = 'UPDATE' AND OLD.status = 'released' THEN
        RAISE EXCEPTION 'Cannot modify released BOM. Create a new version instead.';
    END IF;
    
    -- Prevent deletion of released BOMs
    IF TG_OP = 'DELETE' AND OLD.status = 'released' THEN
        RAISE EXCEPTION 'Cannot delete released BOM. Archive it instead.';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger only for bom_master_trial
CREATE TRIGGER enforce_bom_master_immutability
    BEFORE UPDATE OR DELETE ON bom_master_trial
    FOR EACH ROW EXECUTE FUNCTION enforce_bom_master_immutability();

-- Add SFG-specific fields to bom_master_trial table
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS sl_no INTEGER;
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS sfg_code VARCHAR(100);
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS pcs INTEGER DEFAULT 0;
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS part_weight_gm_pcs DECIMAL(10,2);
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS colour VARCHAR(50);
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS hp_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS icp_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS rcp_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS ldpe_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS gpps_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE bom_master_trial ADD COLUMN IF NOT EXISTS mb_percentage DECIMAL(5,2) DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_sfg_code ON bom_master_trial(sfg_code);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_item_name ON bom_master_trial(item_name);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_sl_no ON bom_master_trial(sl_no);

-- Add comments for documentation
COMMENT ON COLUMN bom_master_trial.sl_no IS 'Serial number for SFG items';
COMMENT ON COLUMN bom_master_trial.item_name IS 'Name of the SFG item';
COMMENT ON COLUMN bom_master_trial.sfg_code IS 'Unique SFG product code';
COMMENT ON COLUMN bom_master_trial.pcs IS 'Number of pieces';
COMMENT ON COLUMN bom_master_trial.part_weight_gm_pcs IS 'Part weight in grams per piece';
COMMENT ON COLUMN bom_master_trial.colour IS 'Color specification';
COMMENT ON COLUMN bom_master_trial.hp_percentage IS 'HP percentage';
COMMENT ON COLUMN bom_master_trial.icp_percentage IS 'ICP percentage';
COMMENT ON COLUMN bom_master_trial.rcp_percentage IS 'RCP percentage';
COMMENT ON COLUMN bom_master_trial.ldpe_percentage IS 'LDPE percentage';
COMMENT ON COLUMN bom_master_trial.gpps_percentage IS 'GPPS percentage';
COMMENT ON COLUMN bom_master_trial.mb_percentage IS 'MB percentage';

-- Update existing records to have default values
UPDATE bom_master_trial 
SET 
  sl_no = 1,
  item_name = COALESCE(item_name, product_name),
  sfg_code = COALESCE(sfg_code, product_code),
  pcs = COALESCE(pcs, 0),
  part_weight_gm_pcs = COALESCE(part_weight_gm_pcs, 0),
  colour = COALESCE(colour, ''),
  hp_percentage = COALESCE(hp_percentage, 0),
  icp_percentage = COALESCE(icp_percentage, 0),
  rcp_percentage = COALESCE(rcp_percentage, 0),
  ldpe_percentage = COALESCE(ldpe_percentage, 0),
  gpps_percentage = COALESCE(gpps_percentage, 0),
  mb_percentage = COALESCE(mb_percentage, 0)
WHERE sl_no IS NULL;
