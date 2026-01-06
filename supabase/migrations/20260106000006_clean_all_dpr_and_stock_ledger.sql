-- ============================================================================
-- COMPLETE CLEANUP: Reset All DPR Data and Stock Ledger
-- ============================================================================
-- WARNING: This script will DELETE ALL:
-- - DPR data (dpr_data, dpr_machine_entries, dpr_stoppage_entries)
-- - Stock ledger entries (stock_ledger)
-- - Stock balances (stock_balances) - will be reset to 0
-- 
-- This is a DESTRUCTIVE operation. Use only when starting fresh.
-- ============================================================================

-- Step 1: Delete ALL stock ledger entries
DELETE FROM stock_ledger;

-- Step 2: Delete ALL DPR stoppage entries (cascade from machine entries)
DELETE FROM dpr_stoppage_entries;

-- Step 3: Delete ALL DPR machine entries
DELETE FROM dpr_machine_entries;

-- Step 4: Delete ALL DPR data
DELETE FROM dpr_data;

-- Step 5: Reset ALL stock balances to 0
-- This ensures balances are clean for fresh start
UPDATE stock_balances 
SET 
    current_balance = 0,
    last_updated = NOW();

-- Alternative: Delete all stock balances (they'll be recalculated when new entries are posted)
-- DELETE FROM stock_balances;

-- Step 6: Verify cleanup
DO $$
DECLARE
    ledger_count INTEGER;
    dpr_count INTEGER;
    machine_entries_count INTEGER;
    stoppage_count INTEGER;
    balance_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ledger_count FROM stock_ledger;
    SELECT COUNT(*) INTO dpr_count FROM dpr_data;
    SELECT COUNT(*) INTO machine_entries_count FROM dpr_machine_entries;
    SELECT COUNT(*) INTO stoppage_count FROM dpr_stoppage_entries;
    SELECT COUNT(*) INTO balance_count FROM stock_balances WHERE current_balance != 0;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CLEANUP VERIFICATION:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Stock Ledger Entries: %', ledger_count;
    RAISE NOTICE 'DPR Records: %', dpr_count;
    RAISE NOTICE 'DPR Machine Entries: %', machine_entries_count;
    RAISE NOTICE 'DPR Stoppage Entries: %', stoppage_count;
    RAISE NOTICE 'Non-Zero Stock Balances: %', balance_count;
    RAISE NOTICE '========================================';
    
    IF ledger_count = 0 AND dpr_count = 0 AND machine_entries_count = 0 THEN
        RAISE NOTICE '✅ Cleanup successful! All DPR and stock ledger data removed.';
    ELSE
        RAISE WARNING '⚠️ Some data may still exist. Please check manually.';
    END IF;
END $$;

-- Step 7: Show remaining stock items (these are kept - they're master data)
SELECT 
    'Stock Items (Master Data - Kept):' as info,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE item_type = 'RM') as raw_materials,
    COUNT(*) FILTER (WHERE item_type = 'PM') as packing_materials,
    COUNT(*) FILTER (WHERE item_type = 'SFG') as semi_finished,
    COUNT(*) FILTER (WHERE item_type = 'FG') as finished_goods
FROM stock_items
WHERE is_active = true;

-- Step 8: Show remaining stock balances (should all be 0 now)
SELECT 
    'Stock Balances Summary:' as info,
    COUNT(*) as total_balances,
    COUNT(*) FILTER (WHERE current_balance != 0) as non_zero_balances,
    SUM(current_balance) FILTER (WHERE current_balance != 0) as total_stock_value
FROM stock_balances;

-- ============================================================================
-- WHAT'S BEEN DELETED:
-- ✅ All stock_ledger entries (all transaction history)
-- ✅ All dpr_data records
-- ✅ All dpr_machine_entries records
-- ✅ All dpr_stoppage_entries records
-- ✅ All stock_balances reset to 0
--
-- WHAT'S BEEN KEPT:
-- ✅ stock_items (master data - item definitions)
-- ✅ stock_locations (master data - location definitions)
-- ✅ All other master data (molds, machines, lines, etc.)
-- ✅ All other forms (GRN, MIS, FG Transfer, etc.)
-- ============================================================================
--
-- NEXT STEPS:
-- 1. You can now create fresh DPR entries
-- 2. Post them to stock ledger when ready
-- 3. Stock balances will be calculated from new entries
-- ============================================================================


