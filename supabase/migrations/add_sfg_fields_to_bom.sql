-- ============================================================================
-- ADD SFG-SPECIFIC FIELDS TO BOM MASTER TRIAL TABLE
-- ============================================================================

-- Add SFG-specific fields to bom_master_trial table
ALTER TABLE bom_master_trial 
ADD COLUMN IF NOT EXISTS sl_no INTEGER,
ADD COLUMN IF NOT EXISTS item_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS sfg_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS pcs INTEGER,
ADD COLUMN IF NOT EXISTS part_weight_gm_pcs DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS colour VARCHAR(50),
ADD COLUMN IF NOT EXISTS hp_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS icp_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rcp_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ldpe_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS gpps_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS mb_percentage DECIMAL(5,2);

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_sl_no ON bom_master_trial(sl_no);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_sfg_code ON bom_master_trial(sfg_code);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_item_name ON bom_master_trial(item_name);

-- Update existing records to populate item_name from product_name
UPDATE bom_master_trial 
SET item_name = product_name 
WHERE item_name IS NULL;

-- Show success message
SELECT 'SFG-specific fields successfully added to BOM Master Trial table' as status;
