-- ============================================================================
-- FIX COLOR/LABEL MASTER RLS POLICY
-- Disable RLS since the application uses custom authentication
-- Similar to other master tables in the system
-- ============================================================================

-- Drop ALL existing policies (in case there are multiple or conflicting ones)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON color_label_master;
DROP POLICY IF EXISTS "Allow all for authenticated users on color_label_master" ON color_label_master;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on color_label_master" ON color_label_master;

-- Disable RLS to allow imports to work with custom auth system
-- This is consistent with other master tables that don't use Supabase's built-in auth
ALTER TABLE color_label_master DISABLE ROW LEVEL SECURITY;

