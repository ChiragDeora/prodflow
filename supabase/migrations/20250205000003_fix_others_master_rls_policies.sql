-- ============================================================================
-- FIX RLS POLICIES FOR OTHERS MASTER TABLES
-- Fixes the RLS policies to include WITH CHECK clause for INSERT operations
-- Uses auth.uid() IS NOT NULL which is more reliable than auth.role()
-- ============================================================================

-- Drop ALL existing policies (in case there are multiple)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON color_label_master;
DROP POLICY IF EXISTS "Allow all for authenticated users on color_label_master" ON color_label_master;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on color_label_master" ON color_label_master;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON party_name_master;
DROP POLICY IF EXISTS "Allow all for authenticated users on party_name_master" ON party_name_master;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on party_name_master" ON party_name_master;

-- Recreate policies with both USING and WITH CHECK clauses
-- Using auth.uid() IS NOT NULL is more reliable for checking authenticated users
CREATE POLICY "Allow all for authenticated users" ON color_label_master
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON party_name_master
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('color_label_master', 'party_name_master');

