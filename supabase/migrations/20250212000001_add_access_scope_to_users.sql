-- ============================================================================
-- Add Access Scope Field to auth_users Table
-- Controls network access restrictions: FACTORY_ONLY or UNIVERSAL
-- ============================================================================

-- Create the access_scope enum type in auth_system schema
DO $$ BEGIN
    CREATE TYPE auth_system.access_scope_type AS ENUM ('FACTORY_ONLY', 'UNIVERSAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add access_scope column to the ACTUAL table (auth_system.auth_users)
ALTER TABLE auth_system.auth_users 
ADD COLUMN IF NOT EXISTS access_scope auth_system.access_scope_type DEFAULT 'FACTORY_ONLY'::auth_system.access_scope_type;

-- Set root admin users to UNIVERSAL (they should always have universal access)
UPDATE auth_system.auth_users 
SET access_scope = 'UNIVERSAL'::auth_system.access_scope_type 
WHERE is_root_admin = TRUE;

-- Create a trigger to ensure root admin always has UNIVERSAL access
CREATE OR REPLACE FUNCTION auth_system.enforce_root_admin_universal_access()
RETURNS TRIGGER AS $$
BEGIN
    -- If user is root admin, always force UNIVERSAL access
    IF NEW.is_root_admin = TRUE THEN
        NEW.access_scope := 'UNIVERSAL'::auth_system.access_scope_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_enforce_root_admin_access ON auth_system.auth_users;
CREATE TRIGGER trigger_enforce_root_admin_access
    BEFORE INSERT OR UPDATE ON auth_system.auth_users
    FOR EACH ROW
    EXECUTE FUNCTION auth_system.enforce_root_admin_universal_access();

-- Grant EXECUTE permission on the function to required roles
GRANT EXECUTE ON FUNCTION auth_system.enforce_root_admin_universal_access() TO anon;
GRANT EXECUTE ON FUNCTION auth_system.enforce_root_admin_universal_access() TO authenticated;
GRANT EXECUTE ON FUNCTION auth_system.enforce_root_admin_universal_access() TO service_role;

-- Add comment for documentation
COMMENT ON COLUMN auth_system.auth_users.access_scope IS 'Network access scope: FACTORY_ONLY (requires factory IP) or UNIVERSAL (any network)';

-- ============================================================================
-- Recreate the public view to include the new column
-- ============================================================================

DROP VIEW IF EXISTS public.auth_users;
CREATE VIEW public.auth_users AS SELECT * FROM auth_system.auth_users;

-- Grant appropriate permissions on the view
-- Note: For UPDATE/INSERT/DELETE to work through views, the underlying table
-- must also have permissions (granted in 20250213000001_grant_auth_system_schema_permissions.sql)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_users TO authenticated;
GRANT SELECT ON public.auth_users TO anon;

-- Ensure the underlying table has permissions (in case grant migration wasn't run)
DO $$
BEGIN
    -- Grant permissions on auth_system schema if not already granted
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants 
        WHERE grantee = 'authenticated' 
        AND table_schema = 'auth_system' 
        AND table_name = 'auth_users'
    ) THEN
        GRANT USAGE ON SCHEMA auth_system TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON auth_system.auth_users TO authenticated;
    END IF;
END $$;
