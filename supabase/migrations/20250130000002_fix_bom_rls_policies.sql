-- ============================================================================
-- FIX BOM RLS POLICIES FOR TRIAL TABLES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_master_trial" ON bom_master_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_versions_trial" ON bom_versions_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_components_trial" ON bom_components_trial;
DROP POLICY IF EXISTS "Allow all for authenticated users on bom_audit_trial" ON bom_audit_trial;

-- Create comprehensive RLS policies for trial tables
-- These allow all operations for any authenticated user while keeping RLS enabled

-- BOM Master Trial policies
CREATE POLICY "Allow all operations on bom_master_trial" ON bom_master_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- BOM Versions Trial policies  
CREATE POLICY "Allow all operations on bom_versions_trial" ON bom_versions_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- BOM Components Trial policies
CREATE POLICY "Allow all operations on bom_components_trial" ON bom_components_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- BOM Audit Trial policies
CREATE POLICY "Allow all operations on bom_audit_trial" ON bom_audit_trial
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure RLS is enabled (in case it was disabled)
ALTER TABLE bom_master_trial ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_versions_trial ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_components_trial ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_audit_trial ENABLE ROW LEVEL SECURITY;
