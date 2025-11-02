-- ============================================================================
-- SIMPLE ROW LEVEL SECURITY FOR AUTH TABLES
-- Clean and minimal RLS policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on all auth tables
-- ============================================================================

ALTER TABLE auth_system.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_resource_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.auth_password_resets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create simple context function
-- ============================================================================

-- Function to get current user ID from application context
CREATE OR REPLACE FUNCTION auth_system.current_user_id()
RETURNS UUID AS $$
DECLARE
    session_token TEXT;
    user_id UUID;
BEGIN
    -- Try to get session token from current_setting
    BEGIN
        session_token := current_setting('app.session_token', true);
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    
    IF session_token IS NULL OR session_token = '' THEN
        RETURN NULL;
    END IF;
    
    -- Get user from active session
    SELECT s.user_id INTO user_id
    FROM auth_system.auth_sessions s
    WHERE s.session_token = session_token
        AND s.is_active = true
        AND s.expires_at > NOW();
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is root admin
CREATE OR REPLACE FUNCTION auth_system.is_current_user_root_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    is_admin BOOLEAN := FALSE;
BEGIN
    user_id := auth_system.current_user_id();
    
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT is_root_admin INTO is_admin
    FROM auth_system.auth_users
    WHERE id = user_id AND status = 'active';
    
    RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create simple RLS policies
-- ============================================================================

-- AUTH USERS TABLE
-- Allow root admin full access
CREATE POLICY "root_admin_users_access" ON auth_system.auth_users
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

-- Allow users to see their own profile
CREATE POLICY "users_own_profile_select" ON auth_system.auth_users
    FOR SELECT 
    USING (id = auth_system.current_user_id());

-- Allow users to update their own profile
CREATE POLICY "users_own_profile_update" ON auth_system.auth_users
    FOR UPDATE 
    USING (id = auth_system.current_user_id());

-- Allow new user registration (no current user)
CREATE POLICY "allow_user_registration" ON auth_system.auth_users
    FOR INSERT 
    WITH CHECK (auth_system.current_user_id() IS NULL);

-- AUTH SESSIONS TABLE
-- Allow users to manage their own sessions
CREATE POLICY "users_own_sessions" ON auth_system.auth_sessions
    FOR ALL 
    USING (
        user_id = auth_system.current_user_id() 
        OR auth_system.is_current_user_root_admin() = true
    );

-- AUTH AUDIT LOGS TABLE
-- Allow root admin to see all logs
CREATE POLICY "root_admin_all_logs" ON auth_system.auth_audit_logs
    FOR SELECT 
    USING (auth_system.is_current_user_root_admin() = true);

-- Allow users to see their own logs
CREATE POLICY "users_own_logs" ON auth_system.auth_audit_logs
    FOR SELECT 
    USING (user_id = auth_system.current_user_id());

-- Allow system to insert audit logs
CREATE POLICY "system_insert_logs" ON auth_system.auth_audit_logs
    FOR INSERT 
    WITH CHECK (true);

-- ADMIN-ONLY TABLES (Resources, Roles, Permissions)
-- Only root admin can access these
CREATE POLICY "admin_only_resources" ON auth_system.auth_resources
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

CREATE POLICY "admin_only_resource_fields" ON auth_system.auth_resource_fields
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

CREATE POLICY "admin_only_roles" ON auth_system.auth_roles
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

CREATE POLICY "admin_only_user_roles" ON auth_system.auth_user_roles
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

CREATE POLICY "admin_only_permissions" ON auth_system.auth_permissions
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

CREATE POLICY "admin_only_role_permissions" ON auth_system.auth_role_permissions
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

CREATE POLICY "admin_only_user_permissions" ON auth_system.auth_user_permissions
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

CREATE POLICY "admin_only_password_resets" ON auth_system.auth_password_resets
    FOR ALL 
    USING (auth_system.is_current_user_root_admin() = true);

-- ============================================================================
-- STEP 4: Create helper function for setting session context
-- ============================================================================

-- Function for application to set current session token
CREATE OR REPLACE FUNCTION public.set_session_context(token TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.session_token', token, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION auth_system.current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth_system.is_current_user_root_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_session_context(TEXT) TO authenticated, anon;

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT 'SUCCESS: Simple RLS policies enabled!' as status;
SELECT 'Tables will now show as "Restricted" in Supabase' as message;
SELECT 'Use set_session_context(token) before database calls' as instruction;
