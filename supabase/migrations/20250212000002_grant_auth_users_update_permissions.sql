-- ============================================================================
-- Grant Update Permissions for auth_users Table
-- ============================================================================
-- This migration fixes permission issues for updating auth_users table
-- through the public.auth_users view. It ensures the authenticated role
-- has UPDATE permissions on the underlying auth_system.auth_users table.
-- ============================================================================

-- Grant EXECUTE permission on the enforce_root_admin_universal_access function
-- (in case it wasn't granted in the previous migration)
DO $$
BEGIN
    -- Check if function exists and grant permissions
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth_system'
        AND p.proname = 'enforce_root_admin_universal_access'
    ) THEN
        GRANT EXECUTE ON FUNCTION auth_system.enforce_root_admin_universal_access() TO anon;
        GRANT EXECUTE ON FUNCTION auth_system.enforce_root_admin_universal_access() TO authenticated;
        GRANT EXECUTE ON FUNCTION auth_system.enforce_root_admin_universal_access() TO service_role;
        RAISE NOTICE 'Granted EXECUTE permissions on enforce_root_admin_universal_access function';
    END IF;
END $$;

-- Ensure authenticated role has UPDATE permissions on auth_system.auth_users
-- This is required for UPDATE operations through the public.auth_users view
DO $$
BEGIN
    -- Grant schema usage if not already granted
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.usage_privileges 
        WHERE grantee = 'authenticated' 
        AND object_schema = 'auth_system'
    ) THEN
        GRANT USAGE ON SCHEMA auth_system TO authenticated;
        RAISE NOTICE 'Granted USAGE on auth_system schema to authenticated';
    END IF;

    -- Grant UPDATE permission on the table if not already granted
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE grantee = 'authenticated' 
        AND table_schema = 'auth_system' 
        AND table_name = 'auth_users'
        AND privilege_type = 'UPDATE'
    ) THEN
        GRANT UPDATE ON auth_system.auth_users TO authenticated;
        RAISE NOTICE 'Granted UPDATE permission on auth_system.auth_users to authenticated';
    ELSE
        RAISE NOTICE 'UPDATE permission on auth_system.auth_users already exists for authenticated';
    END IF;

    -- Also ensure SELECT, INSERT, DELETE are granted (for completeness)
    GRANT SELECT, INSERT, DELETE ON auth_system.auth_users TO authenticated;
    RAISE NOTICE 'Ensured SELECT, INSERT, DELETE permissions on auth_system.auth_users for authenticated';
END $$;

-- Update the public view permissions to allow UPDATE operations
DO $$
BEGIN
    -- Grant UPDATE permission on the view
    GRANT UPDATE ON public.auth_users TO authenticated;
    RAISE NOTICE 'Granted UPDATE permission on public.auth_users view to authenticated';
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration ensures:
-- 1. Function execute permissions are granted
-- 2. authenticated role has UPDATE permission on auth_system.auth_users table
-- 3. authenticated role has UPDATE permission on public.auth_users view
-- 
-- These permissions are required for the admin user update API to work
-- when using the anon key with proper RBAC/RLS policies.
-- ============================================================================

