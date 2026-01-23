-- ============================================================================
-- ADD total_qty_kg COLUMN TO production_fg_transfer_note_items
-- ============================================================================
-- This migration adds total_qty_kg column to store calculated weight in KG
-- using the formula: Total Qty (KG) = Total Qty (pcs) × (SFG1_rp_int_wt + SFG2_rp_int_wt) / 1000
-- ============================================================================

-- Add total_qty_kg column
ALTER TABLE production_fg_transfer_note_items
ADD COLUMN IF NOT EXISTS total_qty_kg DECIMAL(10,4);

-- Update comment
COMMENT ON COLUMN production_fg_transfer_note_items.total_qty_kg IS 'Calculated: Total Qty (pcs) × (SFG1_rp_int_wt + SFG2_rp_int_wt) / 1000 (in KG)';

-- Calculate total_qty_kg for existing records if total_qty_ton exists
-- Formula: total_qty_kg = total_qty_ton × 1000 (convert tons to KG)
UPDATE production_fg_transfer_note_items
SET total_qty_kg = total_qty_ton * 1000
WHERE total_qty_ton IS NOT NULL AND total_qty_kg IS NULL;

-- For records without total_qty_ton, calculate from pcs and int_wt
UPDATE production_fg_transfer_note_items
SET total_qty_kg = (total_qty_pcs * (COALESCE(sfg1_int_wt, 0) + COALESCE(sfg2_int_wt, 0))) / 1000
WHERE total_qty_kg IS NULL AND total_qty_pcs > 0;

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE '✅ Added total_qty_kg column to production_fg_transfer_note_items';
    RAISE NOTICE '✅ Updated existing records with calculated KG values';
    RAISE NOTICE '✅ Migration completed successfully!';
END $$;
