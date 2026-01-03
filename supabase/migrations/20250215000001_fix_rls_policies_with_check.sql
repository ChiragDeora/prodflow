-- ============================================================================
-- FIX RLS POLICIES - Add WITH CHECK clauses for INSERT operations
-- ============================================================================
-- This migration fixes RLS policies that were missing WITH CHECK clauses,
-- which caused INSERT operations to fail with "new row violates row-level security policy"
-- Uses auth.uid() IS NOT NULL which is more reliable than auth.role() = 'authenticated'
-- ============================================================================

-- ============================================================================
-- PURCHASE TABLES
-- ============================================================================

-- Drop and recreate purchase_vendor_registration policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on vendor_registration" ON purchase_vendor_registration;
CREATE POLICY "Allow all operations for authenticated users on vendor_registration"
    ON purchase_vendor_registration
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate purchase_material_indent_slip policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on material_indent_slip" ON purchase_material_indent_slip;
CREATE POLICY "Allow all operations for authenticated users on material_indent_slip"
    ON purchase_material_indent_slip
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate purchase_material_indent_slip_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on material_indent_slip_items" ON purchase_material_indent_slip_items;
CREATE POLICY "Allow all operations for authenticated users on material_indent_slip_items"
    ON purchase_material_indent_slip_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate purchase_purchase_order policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on purchase_order" ON purchase_purchase_order;
CREATE POLICY "Allow all operations for authenticated users on purchase_order"
    ON purchase_purchase_order
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate purchase_purchase_order_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on purchase_order_items" ON purchase_purchase_order_items;
CREATE POLICY "Allow all operations for authenticated users on purchase_order_items"
    ON purchase_purchase_order_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- STORE TABLES
-- ============================================================================

-- Drop and recreate store_grn policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_grn" ON store_grn;
CREATE POLICY "Allow all operations for authenticated users on store_grn"
    ON store_grn
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate store_grn_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_grn_items" ON store_grn_items;
CREATE POLICY "Allow all operations for authenticated users on store_grn_items"
    ON store_grn_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate store_mis policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_mis" ON store_mis;
CREATE POLICY "Allow all operations for authenticated users on store_mis"
    ON store_mis
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate store_mis_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_mis_items" ON store_mis_items;
CREATE POLICY "Allow all operations for authenticated users on store_mis_items"
    ON store_mis_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate store_fgn policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_fgn" ON store_fgn;
CREATE POLICY "Allow all operations for authenticated users on store_fgn"
    ON store_fgn
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate store_fgn_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_fgn_items" ON store_fgn_items;
CREATE POLICY "Allow all operations for authenticated users on store_fgn_items"
    ON store_fgn_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- DISPATCH TABLES
-- ============================================================================

-- Drop and recreate dispatch_dispatch_memo policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on dispatch_memo" ON dispatch_dispatch_memo;
CREATE POLICY "Allow all operations for authenticated users on dispatch_memo"
    ON dispatch_dispatch_memo
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate dispatch_dispatch_memo_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on dispatch_memo_items" ON dispatch_dispatch_memo_items;
CREATE POLICY "Allow all operations for authenticated users on dispatch_memo_items"
    ON dispatch_dispatch_memo_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate dispatch_delivery_challan policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on delivery_challan" ON dispatch_delivery_challan;
CREATE POLICY "Allow all operations for authenticated users on delivery_challan"
    ON dispatch_delivery_challan
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate dispatch_delivery_challan_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on delivery_challan_items" ON dispatch_delivery_challan_items;
CREATE POLICY "Allow all operations for authenticated users on delivery_challan_items"
    ON dispatch_delivery_challan_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- JOB WORK CHALLAN TABLES
-- ============================================================================

-- Drop and recreate store_job_work_challan policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_job_work_challan" ON store_job_work_challan;
CREATE POLICY "Allow all operations for authenticated users on store_job_work_challan"
    ON store_job_work_challan
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate store_job_work_challan_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_job_work_challan_items" ON store_job_work_challan_items;
CREATE POLICY "Allow all operations for authenticated users on store_job_work_challan_items"
    ON store_job_work_challan_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- JW ANNEXURE GRN TABLES
-- ============================================================================

-- Drop and recreate store_jw_annexure_grn policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on jw_annexure_grn" ON store_jw_annexure_grn;
CREATE POLICY "Allow all operations for authenticated users on jw_annexure_grn"
    ON store_jw_annexure_grn
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate store_jw_annexure_grn_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on jw_annexure_grn_items" ON store_jw_annexure_grn_items;
CREATE POLICY "Allow all operations for authenticated users on jw_annexure_grn_items"
    ON store_jw_annexure_grn_items
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

