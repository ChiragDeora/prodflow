-- ============================================================================
-- CLEANUP: Remove existing stock ledger entries for specific DPR
-- Run this when you get "duplicate key" error trying to post DPR
-- ============================================================================

-- Replace the DPR ID below with the one that's failing
-- DPR ID from error: 3342cf1d-eb11-499e-8ddc-45b62b8b7992

-- Step 1: Delete all existing stock ledger entries for this DPR
DELETE FROM stock_ledger 
WHERE document_id = '3342cf1d-eb11-499e-8ddc-45b62b8b7992'
AND document_type IN ('DPR', 'DPR_CANCEL');

-- Step 2: Reset the DPR stock_status to DRAFT
UPDATE dpr_data 
SET 
    stock_status = 'DRAFT',
    posted_to_stock_at = NULL,
    posted_to_stock_by = NULL
WHERE id = '3342cf1d-eb11-499e-8ddc-45b62b8b7992';

-- Step 3: Recalculate affected stock balances
-- This recalculates balances for items that were affected
DO $$
DECLARE
    item_rec RECORD;
    location_rec RECORD;
    calculated_balance DECIMAL(18,4);
BEGIN
    -- Find items that were in the deleted entries and recalculate their balances
    FOR item_rec IN 
        SELECT DISTINCT si.item_code, si.id as item_id, si.unit_of_measure
        FROM stock_items si
        WHERE si.item_code IN ('RM-HP', 'RM-ICP', 'REGRIND', '110510001')
           OR si.item_type IN ('RM', 'SFG')
    LOOP
        FOR location_rec IN 
            SELECT DISTINCT location_code FROM stock_locations WHERE is_active = true
        LOOP
            -- Calculate sum of all quantities for this item at this location
            SELECT COALESCE(SUM(quantity), 0) 
            INTO calculated_balance
            FROM stock_ledger
            WHERE item_code = item_rec.item_code
            AND location_code = location_rec.location_code;
            
            -- Update or insert the balance
            INSERT INTO stock_balances (item_id, item_code, location_code, current_balance, unit_of_measure, last_updated)
            VALUES (
                item_rec.item_id,
                item_rec.item_code,
                location_rec.location_code,
                calculated_balance,
                item_rec.unit_of_measure,
                NOW()
            )
            ON CONFLICT (item_code, location_code) 
            DO UPDATE SET 
                current_balance = calculated_balance,
                last_updated = NOW();
        END LOOP;
    END LOOP;
END $$;

-- Step 4: Verify cleanup
SELECT 'Stock ledger entries for this DPR:' as info;
SELECT COUNT(*) as remaining_entries 
FROM stock_ledger 
WHERE document_id = '3342cf1d-eb11-499e-8ddc-45b62b8b7992';

SELECT 'DPR status:' as info;
SELECT id, report_date, shift, stock_status 
FROM dpr_data 
WHERE id = '3342cf1d-eb11-499e-8ddc-45b62b8b7992';

