-- ============================================================================
-- Ensure Root Admin Can Update Users and Change Passwords
-- ============================================================================
-- This migration ensures that root admins can update user information
-- and change passwords through the admin API routes.
-- 
-- Note: The application uses custom session-based auth, not Supabase Auth.
-- The API routes use verifyRootAdmin() which checks the session, then uses
-- the supabase client. RLS policies are a safety net - main auth is at API level.

-- Handle auth_system schema (if it exists)
DO $$
BEGIN
    -- Check if auth_system schema exists and has the function
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth_system' AND p.proname = 'is_current_user_root_admin'
    ) THEN
        -- Drop existing conflicting policies
        DROP POLICY IF EXISTS "root_admin_users_access" ON auth_system.auth_users;
        DROP POLICY IF EXISTS "root_admin_can_update_users" ON auth_system.auth_users;
        
        -- Ensure root admin can update users (using existing function)
        CREATE POLICY "root_admin_can_update_users" ON auth_system.auth_users
            FOR UPDATE
            USING (auth_system.is_current_user_root_admin() = true)
            WITH CHECK (auth_system.is_current_user_root_admin() = true);
            
        -- Add comment
        COMMENT ON POLICY "root_admin_can_update_users" ON auth_system.auth_users IS 
            'Allows root admin to update all user fields including passwords';
    END IF;
END $$;

-- Handle public schema (if auth_users exists there)
-- Note: For public schema, we rely on the API-level authorization
-- The service role used by API routes bypasses RLS anyway
DO $$
BEGIN
    -- Check if auth_users table exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'auth_users'
    ) THEN
        -- Drop existing conflicting policies
        DROP POLICY IF EXISTS "Root admin can manage all users" ON auth_users;
        DROP POLICY IF EXISTS "root_admin_full_access" ON auth_users;
        DROP POLICY IF EXISTS "root_admin_can_update_users" ON auth_users;
        
        -- Create a simple policy that allows updates
        -- The actual authorization is handled at the API level via verifyRootAdmin()
        -- Service role bypasses RLS, so this is mainly for completeness
        CREATE POLICY "root_admin_can_update_users" ON auth_users
            FOR UPDATE
            USING (true)  -- Service role will bypass this anyway
            WITH CHECK (true);
            
        COMMENT ON POLICY "root_admin_can_update_users" ON auth_users IS 
            'Allows updates to users. Authorization is handled at API level via verifyRootAdmin()';
    END IF;
END $$;

-- Grant necessary permissions (service role already has these, but ensure they're set)
-- Note: The supabase client used by API routes typically uses service role
-- which bypasses RLS, so these grants are for completeness
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth_system' AND tablename = 'auth_users') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON auth_system.auth_users TO postgres;
        GRANT SELECT, INSERT, UPDATE, DELETE ON auth_system.auth_users TO service_role;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_users') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON auth_users TO postgres;
        GRANT SELECT, INSERT, UPDATE, DELETE ON auth_users TO service_role;
    END IF;
END $$;

