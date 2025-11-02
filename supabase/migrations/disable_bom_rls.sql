-- ============================================================================
-- DISABLE RLS ON BOM TRIAL TABLES
-- ============================================================================

-- Drop all existing RLS policies on BOM trial tables
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_master_trial" ON bom_master_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_master_trial" ON bom_master_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_versions_trial" ON bom_versions_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_versions_trial" ON bom_versions_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_components_trial" ON bom_components_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_components_trial" ON bom_components_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_audit_trial" ON bom_audit_trial;
DROP POLICY IF EXISTS "Allow all operations on bom_audit_trial" ON bom_audit_trial;

-- Disable RLS on all BOM trial tables
ALTER TABLE bom_master_trial DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_versions_trial DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_components_trial DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_audit_trial DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('bom_master_trial', 'bom_versions_trial', 'bom_components_trial', 'bom_audit_trial');

-- Show success message
SELECT 'RLS successfully disabled on all BOM trial tables' as status;
