-- Update FG BOM to have single CBM column instead of CBM Export and CBM General

-- First, let's see what data exists in the current CBM columns
SELECT 'Current CBM columns data' as info, 
       COUNT(*) as total_records,
       COUNT(cbm_export) as records_with_export,
       COUNT(cbm_general) as records_with_general
FROM fg_bom;

-- Add single CBM column to FG BOM
ALTER TABLE fg_bom ADD COLUMN IF NOT EXISTS cbm DECIMAL(10,4);

-- Migrate data: Use cbm_export if it exists, otherwise use cbm_general
UPDATE fg_bom 
SET cbm = COALESCE(cbm_export, cbm_general)
WHERE cbm IS NULL;

-- Drop the separate CBM columns
ALTER TABLE fg_bom DROP COLUMN IF EXISTS cbm_export;
ALTER TABLE fg_bom DROP COLUMN IF EXISTS cbm_general;

-- Update the FG BOM display view to show single CBM column
CREATE OR REPLACE VIEW fg_bom_display AS
SELECT 
    id,
    sl_no,
    item_code,
    party_name,
    pack_size,
    sfg_1,
    sfg_1_qty as "SFG-1 QTY",
    sfg_2,
    sfg_2_qty as "SFG-2 QTY",
    cnt_code,
    cnt_qty,
    polybag_code,
    poly_qty,
    bopp_1,
    qty_meter,
    bopp_2,
    qty_meter_2,
    cbm as "CBM",  -- Single CBM column
    status,
    created_by,
    created_at,
    updated_at
FROM fg_bom;

-- Verify the changes
SELECT 'Updated FG BOM structure' as info, 
       item_code, 
       cbm,
       status
FROM fg_bom 
LIMIT 5;

-- Show column structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'fg_bom' 
  AND column_name LIKE '%cbm%'
ORDER BY column_name;
