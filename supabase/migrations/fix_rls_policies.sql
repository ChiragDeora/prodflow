-- ============================================================================
-- FIX BOM RLS POLICIES - Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies (both old and new names)
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_master_trial" ON bom_master_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_master_trial" ON bom_master_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_versions_trial" ON bom_versions_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_versions_trial" ON bom_versions_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_components_trial" ON bom_components_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_components_trial" ON bom_components_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_audit_trial" ON bom_audit_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_audit_trial" ON bom_audit_trial;

-- Create permissive policies that allow all operations for authenticated users
-- This keeps RLS enabled but allows imports to work

CREATE POLICY "Allow all operations on bom_master_trial" ON bom_master_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on bom_versions_trial" ON bom_versions_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on bom_components_trial" ON bom_components_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on bom_audit_trial" ON bom_audit_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('bom_master_trial', 'bom_versions_trial', 'bom_components_trial', 'bom_audit_trial');
