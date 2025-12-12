-- ============================================================================
-- FIX PARTY NAME MASTER RLS POLICY
-- Disable RLS since the application uses custom authentication
-- Similar to color_label_master and other master tables in the system
-- ============================================================================

-- Drop ALL existing policies (in case there are multiple or conflicting ones)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON party_name_master;
DROP POLICY IF EXISTS "Allow all for authenticated users on party_name_master" ON party_name_master;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on party_name_master" ON party_name_master;

-- Disable RLS to allow imports to work with custom auth system
-- This is consistent with other master tables that don't use Supabase's built-in auth
ALTER TABLE party_name_master DISABLE ROW LEVEL SECURITY;

