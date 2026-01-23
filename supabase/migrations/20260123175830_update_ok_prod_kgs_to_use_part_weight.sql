-- =====================================================
-- UPDATE OK PROD KGS CALCULATION TO USE PART WEIGHT
-- =====================================================
-- This migration updates the database function and trigger to use
-- part_wt_gm (target part weight) instead of act_part_wt_gm (actual part weight)
-- for calculating ok_prod_kgs.

-- Drop the existing function first (required when changing parameter names)
DROP FUNCTION IF EXISTS calculate_ok_prod_kgs(INTEGER, DECIMAL);

-- Recreate the function to use part weight (target)
CREATE FUNCTION calculate_ok_prod_kgs(
    ok_prod_qty INTEGER,
    part_wt_gm DECIMAL
) RETURNS DECIMAL(10, 3) AS $$
BEGIN
    IF ok_prod_qty IS NULL OR part_wt_gm IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN (ok_prod_qty * part_wt_gm) / 1000.0; -- Convert gm to kg
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to use part weight (target)
CREATE OR REPLACE FUNCTION update_ok_prod_kgs()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ok_prod_qty_nos IS NOT NULL AND NEW.part_wt_gm IS NOT NULL THEN
        NEW.ok_prod_kgs := calculate_ok_prod_kgs(NEW.ok_prod_qty_nos, NEW.part_wt_gm);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger with updated condition
DROP TRIGGER IF EXISTS trigger_update_ok_prod_kgs ON dpr_machine_entries;

CREATE TRIGGER trigger_update_ok_prod_kgs
    BEFORE INSERT OR UPDATE ON dpr_machine_entries
    FOR EACH ROW
    WHEN (NEW.ok_prod_qty_nos IS NOT NULL AND NEW.part_wt_gm IS NOT NULL)
    EXECUTE FUNCTION update_ok_prod_kgs();

-- Update the comment to reflect the change
COMMENT ON COLUMN dpr_machine_entries.ok_prod_kgs IS 'Auto-calculated: (ok_prod_qty_nos * part_wt_gm) / 1000';
