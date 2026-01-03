-- ============================================================================
-- VERIFY RLS POLICIES - Check that all policies have WITH CHECK clauses
-- ============================================================================
-- Run this query to verify that all the RLS policies were updated correctly
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN with_check IS NULL OR with_check = '' THEN '❌ MISSING WITH CHECK'
        ELSE '✅ HAS WITH CHECK'
    END as with_check_status,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename IN (
    'purchase_vendor_registration',
    'purchase_material_indent_slip',
    'purchase_material_indent_slip_items',
    'purchase_purchase_order',
    'purchase_purchase_order_items',
    'store_grn',
    'store_grn_items',
    'store_mis',
    'store_mis_items',
    'store_fgn',
    'store_fgn_items',
    'dispatch_dispatch_memo',
    'dispatch_dispatch_memo_items',
    'dispatch_delivery_challan',
    'dispatch_delivery_challan_items',
    'store_job_work_challan',
    'store_job_work_challan_items',
    'store_jw_annexure_grn',
    'store_jw_annexure_grn_items'
)
ORDER BY tablename, policyname;

