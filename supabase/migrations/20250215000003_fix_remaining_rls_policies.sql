-- ============================================================================
-- FIX REMAINING RLS POLICIES - Add WITH CHECK clauses for missing tables
-- ============================================================================
-- This fixes the 4 tables that were missed in the previous migration:
-- - store_job_work_challan
-- - store_job_work_challan_items
-- - store_jw_annexure_grn
-- - store_jw_annexure_grn_items
-- ============================================================================

-- Drop and recreate store_job_work_challan policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_job_work_challan" ON store_job_work_challan;
CREATE POLICY "Allow all operations for authenticated users on store_job_work_challan"
    ON store_job_work_challan
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Drop and recreate store_job_work_challan_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_job_work_challan_items" ON store_job_work_challan_items;
CREATE POLICY "Allow all operations for authenticated users on store_job_work_challan_items"
    ON store_job_work_challan_items
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Drop and recreate store_jw_annexure_grn policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on jw_annexure_grn" ON store_jw_annexure_grn;
CREATE POLICY "Allow all operations for authenticated users on jw_annexure_grn"
    ON store_jw_annexure_grn
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Drop and recreate store_jw_annexure_grn_items policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on jw_annexure_grn_items" ON store_jw_annexure_grn_items;
CREATE POLICY "Allow all operations for authenticated users on jw_annexure_grn_items"
    ON store_jw_annexure_grn_items
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

