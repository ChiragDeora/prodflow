-- ============================================================================
-- UPDATE RECEIVED QUANTITIES FROM JW ANNEXURE GRN
-- ============================================================================
-- This trigger updates received_qty in purchase_material_indent_slip_items
-- when JW Annexure GRN items are created/updated
-- ============================================================================

-- Function to update received quantities when JW Annexure GRN is created/updated
CREATE OR REPLACE FUNCTION update_received_quantities_from_jw_grn()
RETURNS TRIGGER AS $$
DECLARE
    v_indent_slip_id UUID;
BEGIN
    -- Get indent_slip_id from the parent GRN
    SELECT indent_slip_id INTO v_indent_slip_id
    FROM store_jw_annexure_grn
    WHERE id = NEW.jw_annexure_grn_id;
    
    -- If indent_slip_id exists and rcd_qty is provided, update the received quantity
    IF v_indent_slip_id IS NOT NULL AND NEW.rcd_qty IS NOT NULL THEN
        -- Match items by item_code and/or item_name (prefer exact match on both, fallback to either)
        UPDATE purchase_material_indent_slip_items 
        SET received_qty = COALESCE(received_qty, 0) + NEW.rcd_qty
        WHERE indent_slip_id = v_indent_slip_id
        AND (
            -- Best match: both item_code and item_name match
            (NEW.item_code IS NOT NULL AND NEW.item_name IS NOT NULL 
             AND COALESCE(item_code::text, '') = COALESCE(NEW.item_code::text, '')
             AND COALESCE(item_name::text, '') = COALESCE(NEW.item_name::text, ''))
            OR
            -- Match by item_code only (if item_name is not available)
            (NEW.item_code IS NOT NULL AND NEW.item_name IS NULL
             AND COALESCE(item_code::text, '') = COALESCE(NEW.item_code::text, ''))
            OR
            -- Match by item_name only (if item_code is not available)
            (NEW.item_code IS NULL AND NEW.item_name IS NOT NULL
             AND COALESCE(item_name::text, '') = COALESCE(NEW.item_name::text, ''))
            OR
            -- Fallback: match by position (sr_no) when both are NULL
            (NEW.item_code IS NULL AND NEW.item_name IS NULL AND sr_no = NEW.sr_no)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_received_quantities_from_jw_grn ON store_jw_annexure_grn_items;

-- Create trigger to update received quantities when JW Annexure GRN items are inserted/updated
CREATE TRIGGER trigger_update_received_quantities_from_jw_grn
    AFTER INSERT OR UPDATE OF rcd_qty ON store_jw_annexure_grn_items
    FOR EACH ROW
    WHEN (NEW.rcd_qty IS NOT NULL)
    EXECUTE FUNCTION update_received_quantities_from_jw_grn();

-- Also handle deletions (subtract the quantity)
CREATE OR REPLACE FUNCTION subtract_received_quantities_from_jw_grn()
RETURNS TRIGGER AS $$
DECLARE
    v_indent_slip_id UUID;
BEGIN
    -- Get indent_slip_id from the parent GRN
    SELECT indent_slip_id INTO v_indent_slip_id
    FROM store_jw_annexure_grn
    WHERE id = OLD.jw_annexure_grn_id;
    
    -- If indent_slip_id exists and rcd_qty was set, subtract it
    IF v_indent_slip_id IS NOT NULL AND OLD.rcd_qty IS NOT NULL THEN
        UPDATE purchase_material_indent_slip_items 
        SET received_qty = GREATEST(0, COALESCE(received_qty, 0) - OLD.rcd_qty)
        WHERE indent_slip_id = v_indent_slip_id
        AND (
            (OLD.item_code IS NOT NULL AND COALESCE(item_code::text, '') = COALESCE(OLD.item_code::text, ''))
            OR
            (OLD.item_name IS NOT NULL AND COALESCE(item_name::text, '') = COALESCE(OLD.item_name::text, ''))
        );
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_subtract_received_quantities_from_jw_grn ON store_jw_annexure_grn_items;

-- Create trigger to subtract received quantities when JW Annexure GRN items are deleted
CREATE TRIGGER trigger_subtract_received_quantities_from_jw_grn
    AFTER DELETE ON store_jw_annexure_grn_items
    FOR EACH ROW
    WHEN (OLD.rcd_qty IS NOT NULL)
    EXECUTE FUNCTION subtract_received_quantities_from_jw_grn();

COMMENT ON FUNCTION update_received_quantities_from_jw_grn() IS 'Updates received quantities in Material Indent when JW Annexure GRN items are created/updated';
COMMENT ON FUNCTION subtract_received_quantities_from_jw_grn() IS 'Subtracts received quantities in Material Indent when JW Annexure GRN items are deleted';

-- ============================================================================
-- BACKFILL - Update received_qty for existing JW Annexure GRNs
-- ============================================================================
-- This adds received_qty from JW Annexure GRNs to existing received_qty
-- (which may already include quantities from normal GRNs)
-- ============================================================================

-- Update received_qty by adding JW Annexure GRN quantities
-- This only adds, doesn't reset, so normal GRN quantities are preserved
UPDATE purchase_material_indent_slip_items misi
SET received_qty = COALESCE(misi.received_qty, 0) + COALESCE((
    SELECT SUM(jwi.rcd_qty)
    FROM store_jw_annexure_grn_items jwi
    JOIN store_jw_annexure_grn jw ON jw.id = jwi.jw_annexure_grn_id
    WHERE jw.indent_slip_id = misi.indent_slip_id
      AND jwi.rcd_qty IS NOT NULL
      AND (
          -- Match by both item_code and item_name if both exist
          (jwi.item_code IS NOT NULL AND jwi.item_name IS NOT NULL
           AND COALESCE(misi.item_code::text, '') = COALESCE(jwi.item_code::text, '')
           AND COALESCE(misi.item_name::text, '') = COALESCE(jwi.item_name::text, ''))
          OR
          -- Match by item_code only
          (jwi.item_code IS NOT NULL AND jwi.item_name IS NULL
           AND COALESCE(misi.item_code::text, '') = COALESCE(jwi.item_code::text, ''))
          OR
          -- Match by item_name only
          (jwi.item_code IS NULL AND jwi.item_name IS NOT NULL
           AND COALESCE(misi.item_name::text, '') = COALESCE(jwi.item_name::text, ''))
          OR
          -- Fallback: match by sr_no
          (jwi.item_code IS NULL AND jwi.item_name IS NULL AND jwi.sr_no = misi.sr_no)
      )
), 0)
WHERE misi.indent_slip_id IN (
    SELECT DISTINCT indent_slip_id 
    FROM store_jw_annexure_grn 
    WHERE indent_slip_id IS NOT NULL
);

