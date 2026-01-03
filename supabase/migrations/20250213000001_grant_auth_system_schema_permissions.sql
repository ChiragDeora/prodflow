-- ============================================================================
-- Grant Schema Permissions for auth_system
-- ============================================================================
-- This migration grants USAGE permission on the auth_system schema
-- to anon and authenticated roles so they can access tables through
-- the Supabase client. Access is still controlled by RLS policies.
-- ============================================================================

DO $$
BEGIN
    -- Grant USAGE on schema to allow access
    GRANT USAGE ON SCHEMA auth_system TO anon;
    GRANT USAGE ON SCHEMA auth_system TO authenticated;
    GRANT USAGE ON SCHEMA auth_system TO service_role;
    
    -- Grant SELECT, INSERT, UPDATE, DELETE on all auth_system tables
    -- RLS policies will control actual access
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth_system TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth_system TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth_system TO service_role;
    
    -- Grant USAGE on sequences (for auto-incrementing IDs)
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth_system TO anon;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth_system TO authenticated;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth_system TO service_role;
    
    -- Grant EXECUTE on functions in auth_system schema
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth_system TO anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth_system TO authenticated;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth_system TO service_role;
    
    -- Set default privileges for future tables
    ALTER DEFAULT PRIVILEGES IN SCHEMA auth_system 
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA auth_system 
        GRANT USAGE ON SEQUENCES TO anon, authenticated, service_role;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA auth_system 
        GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
    
    RAISE NOTICE 'Successfully granted permissions on auth_system schema';
END $$;

