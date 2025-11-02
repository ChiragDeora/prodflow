-- ============================================================================
-- ADD ROW LEVEL SECURITY TO AUTH TABLES
-- This will change tables from "Unrestricted" to "Restricted" in Supabase
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
-- STEP 2: Create a session context function for authenticated users
-- ============================================================================

-- Function to get current authenticated user from session token
CREATE OR REPLACE FUNCTION auth_system.get_current_user_id()
RETURNS UUID AS $$
DECLARE
    session_token TEXT;
    user_id UUID;
BEGIN
    -- Get session token from current_setting (set by application)
    BEGIN
        session_token := current_setting('app.current_session_token', true);
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    
    IF session_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user from valid session
    SELECT s.user_id INTO user_id
    FROM auth_system.auth_sessions s
    JOIN auth_system.auth_users u ON s.user_id = u.id
    WHERE s.session_token = session_token
        AND s.is_active = true
        AND s.expires_at > NOW()
        AND u.status = 'active';
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is root admin
CREATE OR REPLACE FUNCTION auth_system.is_root_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    is_admin BOOLEAN := FALSE;
BEGIN
    user_id := auth_system.get_current_user_id();
    
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
-- STEP 3: Create RLS policies for auth_users table
-- ============================================================================

-- Policy: Root admin can see all users
CREATE POLICY "root_admin_full_access" ON auth_system.auth_users
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

-- Policy: Users can view their own profile
CREATE POLICY "users_view_own_profile" ON auth_system.auth_users
    FOR SELECT 
    USING (id = auth_system.get_current_user_id());

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile" ON auth_system.auth_users
    FOR UPDATE 
    USING (id = auth_system.get_current_user_id())
    WITH CHECK (
        id = auth_system.get_current_user_id()
        -- Users cannot change critical fields - these must remain the same
        AND is_root_admin = (SELECT is_root_admin FROM auth_system.auth_users WHERE id = auth_system.get_current_user_id())
        AND status = (SELECT status FROM auth_system.auth_users WHERE id = auth_system.get_current_user_id())
        AND username = (SELECT username FROM auth_system.auth_users WHERE id = auth_system.get_current_user_id())
        AND email = (SELECT email FROM auth_system.auth_users WHERE id = auth_system.get_current_user_id())
    );

-- Policy: Only allow signup inserts (no authenticated user yet)
CREATE POLICY "allow_signup_inserts" ON auth_system.auth_users
    FOR INSERT 
    WITH CHECK (
        auth_system.get_current_user_id() IS NULL  -- No session = signup
        OR auth_system.is_root_admin() = true      -- Or root admin creating user
    );

-- ============================================================================
-- STEP 4: Create RLS policies for auth_sessions table
-- ============================================================================

-- Policy: Users can manage their own sessions
CREATE POLICY "users_own_sessions" ON auth_system.auth_sessions
    FOR ALL 
    USING (user_id = auth_system.get_current_user_id());

-- Policy: Root admin can view all sessions
CREATE POLICY "root_admin_all_sessions" ON auth_system.auth_sessions
    FOR SELECT 
    USING (auth_system.is_root_admin() = true);

-- ============================================================================
-- STEP 5: Create RLS policies for audit logs
-- ============================================================================

-- Policy: Root admin can view all audit logs
CREATE POLICY "root_admin_all_audit_logs" ON auth_system.auth_audit_logs
    FOR SELECT 
    USING (auth_system.is_root_admin() = true);

-- Policy: Users can view their own audit logs
CREATE POLICY "users_own_audit_logs" ON auth_system.auth_audit_logs
    FOR SELECT 
    USING (user_id = auth_system.get_current_user_id());

-- Policy: Allow audit log inserts (system logging)
CREATE POLICY "allow_audit_inserts" ON auth_system.auth_audit_logs
    FOR INSERT 
    WITH CHECK (true);  -- System can always log

-- ============================================================================
-- STEP 6: Create RLS policies for admin-only tables
-- ============================================================================

-- Resources, roles, permissions - admin only
CREATE POLICY "admin_only_resources" ON auth_system.auth_resources
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

CREATE POLICY "admin_only_resource_fields" ON auth_system.auth_resource_fields
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

CREATE POLICY "admin_only_roles" ON auth_system.auth_roles
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

CREATE POLICY "admin_only_user_roles" ON auth_system.auth_user_roles
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

CREATE POLICY "admin_only_permissions" ON auth_system.auth_permissions
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

CREATE POLICY "admin_only_role_permissions" ON auth_system.auth_role_permissions
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

CREATE POLICY "admin_only_user_permissions" ON auth_system.auth_user_permissions
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

CREATE POLICY "admin_only_password_resets" ON auth_system.auth_password_resets
    FOR ALL 
    USING (auth_system.is_root_admin() = true);

-- ============================================================================
-- STEP 7: Grant necessary permissions to public views
-- ============================================================================

-- Grant access to the auth schema functions
GRANT EXECUTE ON FUNCTION auth_system.get_current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth_system.is_root_admin() TO authenticated, anon;

-- ============================================================================
-- STEP 8: Create helper function to set session context
-- ============================================================================

-- Function for application to set current session token
CREATE OR REPLACE FUNCTION public.set_session_context(session_token TEXT)
RETURNS VOID AS $$
BEGIN
    -- Set the session token in PostgreSQL session variables
    PERFORM set_config('app.current_session_token', session_token, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT 'SUCCESS: RLS policies enabled on all auth tables!' as status;
SELECT 'Tables will now show as "Restricted" in Supabase dashboard' as message;
SELECT 'Use set_session_context(token) in your API calls for proper auth' as instruction;
