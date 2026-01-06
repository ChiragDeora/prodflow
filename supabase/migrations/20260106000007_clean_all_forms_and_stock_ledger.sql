-- ============================================================================
-- COMPLETE CLEANUP: Reset ALL Forms History and Stock Ledger
-- ============================================================================
-- WARNING: This script will DELETE ALL:
-- - DPR data (dpr_data, dpr_machine_entries, dpr_stoppage_entries)
-- - GRN data (store_grn, store_grn_items)
-- - JW GRN data (store_jw_annexure_grn, store_jw_annexure_grn_items)
-- - MIS data (store_mis, store_mis_items)
-- - FG Transfer data (store_fgn, store_fgn_items)
-- - Dispatch data (dispatch_delivery_challan, dispatch_delivery_challan_items, dispatch_dispatch_memo, dispatch_dispatch_memo_items)
-- - Customer Returns (customer_returns, customer_return_items)
-- - Stock Adjustments (stock_adjustments, stock_adjustment_items)
-- - Stock ledger entries (stock_ledger)
-- - Stock balances (stock_balances) - will be reset to 0
-- 
-- This is a DESTRUCTIVE operation. Use only when starting fresh.
-- ============================================================================

-- Step 1: Delete ALL stock ledger entries (must be first due to foreign keys)
DELETE FROM stock_ledger;

-- Step 2: Delete ALL DPR related data
DELETE FROM dpr_stoppage_entries;
DELETE FROM dpr_machine_entries;
DELETE FROM dpr_data;

-- Step 3: Delete ALL GRN data
DELETE FROM store_grn_items;
DELETE FROM store_grn;

-- Step 4: Delete ALL JW GRN data
DELETE FROM store_jw_annexure_grn_items;
DELETE FROM store_jw_annexure_grn;

-- Step 5: Delete ALL Purchase Order data (must be before Material Indent Slip due to FK)
DELETE FROM purchase_purchase_order_items;
DELETE FROM purchase_purchase_order;

-- Step 6: Delete ALL MIS (Material Issue Slip) data
DELETE FROM store_mis_items;
DELETE FROM store_mis;

-- Step 7: Delete ALL Material Indent Slip data (after Purchase Orders are deleted)
DELETE FROM purchase_material_indent_slip_items;
DELETE FROM purchase_material_indent_slip;

-- Step 8: Delete ALL FG Transfer data
DELETE FROM store_fgn_items;
DELETE FROM store_fgn;

-- Step 9: Delete ALL Dispatch data
DELETE FROM dispatch_delivery_challan_items;
DELETE FROM dispatch_delivery_challan;
DELETE FROM dispatch_dispatch_memo_items;
DELETE FROM dispatch_dispatch_memo;

-- Step 10: Delete ALL Customer Returns
DELETE FROM customer_return_items;
DELETE FROM customer_returns;

-- Step 11: Delete ALL Stock Adjustments
DELETE FROM stock_adjustment_items;
DELETE FROM stock_adjustments;

-- Step 12: Reset ALL stock balances to 0
UPDATE stock_balances 
SET 
    current_balance = 0,
    last_updated = NOW();

-- Step 13: Verify cleanup
DO $$
DECLARE
    ledger_count INTEGER;
    dpr_count INTEGER;
    grn_count INTEGER;
    jw_grn_count INTEGER;
    po_count INTEGER;
    mis_count INTEGER;
    indent_count INTEGER;
    fgn_count INTEGER;
    dispatch_count INTEGER;
    return_count INTEGER;
    adjustment_count INTEGER;
    balance_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ledger_count FROM stock_ledger;
    SELECT COUNT(*) INTO dpr_count FROM dpr_data;
    SELECT COUNT(*) INTO grn_count FROM store_grn;
    SELECT COUNT(*) INTO jw_grn_count FROM store_jw_annexure_grn;
    SELECT COUNT(*) INTO po_count FROM purchase_purchase_order;
    SELECT COUNT(*) INTO mis_count FROM store_mis;
    SELECT COUNT(*) INTO indent_count FROM purchase_material_indent_slip;
    SELECT COUNT(*) INTO fgn_count FROM store_fgn;
    SELECT 
        (SELECT COUNT(*) FROM dispatch_delivery_challan) + 
        (SELECT COUNT(*) FROM dispatch_dispatch_memo)
    INTO dispatch_count;
    SELECT COUNT(*) INTO return_count FROM customer_returns;
    SELECT COUNT(*) INTO adjustment_count FROM stock_adjustments;
    SELECT COUNT(*) INTO balance_count FROM stock_balances WHERE current_balance != 0;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMPLETE CLEANUP VERIFICATION:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Stock Ledger Entries: %', ledger_count;
    RAISE NOTICE 'DPR Records: %', dpr_count;
    RAISE NOTICE 'GRN Records: %', grn_count;
    RAISE NOTICE 'JW GRN Records: %', jw_grn_count;
    RAISE NOTICE 'Purchase Order Records: %', po_count;
    RAISE NOTICE 'MIS (Issue Slip) Records: %', mis_count;
    RAISE NOTICE 'Material Indent Slip Records: %', indent_count;
    RAISE NOTICE 'FG Transfer Records: %', fgn_count;
    RAISE NOTICE 'Dispatch Records: %', dispatch_count;
    RAISE NOTICE 'Customer Returns: %', return_count;
    RAISE NOTICE 'Stock Adjustments: %', adjustment_count;
    RAISE NOTICE 'Non-Zero Stock Balances: %', balance_count;
    RAISE NOTICE '========================================';
    
    IF ledger_count = 0 AND dpr_count = 0 AND grn_count = 0 AND mis_count = 0 AND indent_count = 0 AND fgn_count = 0 AND po_count = 0 THEN
        RAISE NOTICE '✅ Cleanup successful! All forms and stock ledger data removed.';
    ELSE
        RAISE WARNING '⚠️ Some data may still exist. Please check manually.';
    END IF;
END $$;

-- Step 14: Show what's been kept (master data)
-- Note: Status columns may not exist in all tables, so we just count all records
SELECT 
    'Master Data (Kept):' as info,
    (SELECT COUNT(*) FROM stock_items WHERE is_active = true) as stock_items,
    (SELECT COUNT(*) FROM stock_locations WHERE is_active = true) as stock_locations,
    (SELECT COUNT(*) FROM molds) as total_molds,
    (SELECT COUNT(*) FROM machines) as total_machines,
    (SELECT COUNT(*) FROM lines) as total_lines;

-- Step 15: Show stock balances summary (should all be 0)
SELECT 
    'Stock Balances Summary:' as info,
    COUNT(*) as total_balances,
    COUNT(*) FILTER (WHERE current_balance != 0) as non_zero_balances,
    SUM(current_balance) FILTER (WHERE current_balance != 0) as total_stock_value
FROM stock_balances;

-- ============================================================================
-- WHAT'S BEEN DELETED:
-- ✅ All stock_ledger entries (all transaction history)
-- ✅ All dpr_data, dpr_machine_entries, dpr_stoppage_entries
-- ✅ All store_grn and store_grn_items
-- ✅ All store_jw_annexure_grn and store_jw_annexure_grn_items
-- ✅ All store_mis and store_mis_items (Material Issue Slip)
-- ✅ All purchase_material_indent_slip and purchase_material_indent_slip_items (Material Indent Slip)
-- ✅ All store_fgn and store_fgn_items
-- ✅ All dispatch_delivery_challan and dispatch_delivery_challan_items
-- ✅ All dispatch_dispatch_memo and dispatch_dispatch_memo_items
-- ✅ All customer_returns and customer_return_items
-- ✅ All stock_adjustments and stock_adjustment_items
-- ✅ All stock_balances reset to 0
--
-- WHAT'S BEEN KEPT:
-- ✅ stock_items (master data - item definitions)
-- ✅ stock_locations (master data - location definitions)
-- ✅ molds, machines, lines (master data)
-- ✅ All BOM tables (sfg_bom, fg_bom, local_bom)
-- ✅ User accounts and permissions
-- ✅ All other configuration data
-- ============================================================================
--
-- NEXT STEPS:
-- 1. You can now create fresh forms (GRN, MIS, DPR, etc.)
-- 2. Post them to stock ledger when ready
-- 3. Stock balances will be calculated from new entries
-- 4. System is ready for fresh start!
-- ============================================================================

