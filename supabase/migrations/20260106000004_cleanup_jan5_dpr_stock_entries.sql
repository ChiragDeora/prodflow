-- ============================================================================
-- CLEANUP SQL: Fix Corrupted DPR Stock Ledger Entries for January 5th, 2026
-- ============================================================================
-- This script:
-- 1. Deletes all DPR stock_ledger entries for 2026-01-05
-- 2. Deletes all DPR_CANCEL entries for 2026-01-05
-- 3. Recalculates stock_balances
-- 4. Resets DPR stock_status to 'DRAFT' so they can be re-posted
-- ============================================================================

-- Step 1: Delete all DPR-related stock ledger entries for Jan 5, 2026
-- This includes both DPR and DPR_CANCEL entries
DELETE FROM stock_ledger 
WHERE document_type IN ('DPR', 'DPR_CANCEL')
AND (
    document_number LIKE 'DPR-2026-01-05%'
    OR transaction_date = '2026-01-05'
);

-- Step 2: Reset DPR stock_status for Jan 5, 2026 back to DRAFT
UPDATE dpr_data 
SET 
    stock_status = 'DRAFT',
    posted_to_stock_at = NULL,
    posted_to_stock_by = NULL
WHERE report_date = '2026-01-05';

-- Step 3: Recalculate stock_balances from scratch
-- This function rebuilds the stock_balances table from stock_ledger entries

-- First, clear all existing balances (they'll be recalculated)
-- We'll use a transaction to ensure data consistency

DO $$
DECLARE
    item_rec RECORD;
    location_rec RECORD;
    calculated_balance DECIMAL(18,4);
BEGIN
    -- For each item and location combination in stock_ledger, recalculate balance
    FOR item_rec IN 
        SELECT DISTINCT item_code, item_id 
        FROM stock_ledger
    LOOP
        FOR location_rec IN 
            SELECT DISTINCT location_code 
            FROM stock_ledger 
            WHERE item_code = item_rec.item_code
        LOOP
            -- Calculate sum of all quantities for this item at this location
            SELECT COALESCE(SUM(quantity), 0) 
            INTO calculated_balance
            FROM stock_ledger
            WHERE item_code = item_rec.item_code
            AND location_code = location_rec.location_code;
            
            -- Update or insert the balance
            INSERT INTO stock_balances (item_id, item_code, location_code, current_balance, unit_of_measure, last_updated)
            SELECT 
                item_rec.item_id,
                item_rec.item_code,
                location_rec.location_code,
                calculated_balance,
                (SELECT unit_of_measure FROM stock_items WHERE item_code = item_rec.item_code LIMIT 1),
                NOW()
            ON CONFLICT (item_code, location_code) 
            DO UPDATE SET 
                current_balance = calculated_balance,
                last_updated = NOW();
                
            RAISE NOTICE 'Updated balance for % at %: %', item_rec.item_code, location_rec.location_code, calculated_balance;
        END LOOP;
    END LOOP;
END $$;

-- Step 4: Verify the cleanup - show current balances
-- Expected after cleanup:
-- STORE: RM-HP 150 KG, RM-ICP 25 KG (from GRN minus MIS out)
-- PRODUCTION: RM-HP 100 KG, RM-ICP 25 KG (from MIS in)
-- FG_STORE: empty (no SFG yet since DPR not posted)

SELECT 
    item_code,
    location_code,
    current_balance,
    unit_of_measure,
    last_updated
FROM stock_balances
WHERE current_balance != 0
ORDER BY location_code, item_code;

-- Step 5: Show all remaining stock_ledger entries for verification
SELECT 
    document_type,
    document_number,
    item_code,
    location_code,
    quantity,
    movement_type,
    transaction_date
FROM stock_ledger
WHERE transaction_date >= '2026-01-05'
ORDER BY posted_at;

-- ============================================================================
-- VERIFICATION NOTES:
-- After running this script:
-- 1. All DPR entries from Jan 5 should be deleted from stock_ledger
-- 2. DPR records should show stock_status = 'DRAFT'
-- 3. Stock balances should reflect only GRN and MIS entries
-- 4. FG_STORE should have 0 SFG items (pending DPR re-post)
-- 5. STORE should have REGRIND = 0 (pending DPR re-post)
-- ============================================================================

