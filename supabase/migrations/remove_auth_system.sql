-- SQL Script to Remove Authentication System
-- This script removes all authentication, user management, and access control
-- while preserving the user profile button functionality

-- ============================================================================
-- STEP 0: Check what tables actually exist before removal
-- ============================================================================

-- Show current tables to see what we're working with
SELECT 'Current tables in database:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check which auth tables actually exist
SELECT 'Checking auth table existence:' as info;
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN 'EXISTS'
        ELSE 'DOES NOT EXIST'
    END as status
FROM (VALUES 
    ('user_profiles'),
    ('approved_phone_numbers'),
    ('permissions'),
    ('user_permissions'),
    ('module_permissions')
) AS t(table_name);

-- ============================================================================
-- STEP 1: Drop all authentication-related tables (with existence checks)
-- ============================================================================

-- Drop access control tables (only if they exist)
DROP TABLE IF EXISTS module_permissions CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS approved_phone_numbers CASCADE;

-- Drop user profiles table (only if it exists)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- ============================================================================
-- STEP 2: Drop all authentication-related functions (with existence checks)
-- ============================================================================

-- Drop access control functions (only if they exist)
DROP FUNCTION IF EXISTS check_user_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS check_module_access(UUID, TEXT);
DROP FUNCTION IF EXISTS is_phone_approved(TEXT);
DROP FUNCTION IF EXISTS create_default_admin();
DROP FUNCTION IF EXISTS set_default_user_permissions(UUID);
DROP FUNCTION IF EXISTS check_user_approval_for_login(TEXT);
DROP FUNCTION IF EXISTS create_user_profile_signup(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_user_profile_on_signup();
DROP FUNCTION IF EXISTS handle_email_confirmation();
DROP FUNCTION IF EXISTS notify_admin_of_new_signup();
DROP FUNCTION IF EXISTS get_user_profile_direct(UUID);
DROP FUNCTION IF EXISTS update_user_role_direct(TEXT, TEXT);

-- ============================================================================
-- STEP 3: Drop all authentication-related triggers (with existence checks)
-- ============================================================================

-- Drop triggers (only if they exist)
DROP TRIGGER IF EXISTS email_confirmation_trigger ON auth.users;
DROP TRIGGER IF EXISTS user_signup_trigger ON auth.users;
DROP TRIGGER IF EXISTS new_signup_notification_trigger ON user_profiles;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_approved_phone_numbers_updated_at ON approved_phone_numbers;
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
DROP TRIGGER IF EXISTS update_module_permissions_updated_at ON module_permissions;

-- ============================================================================
-- STEP 4: Drop all authentication-related indexes (with existence checks)
-- ============================================================================

-- Drop indexes (only if they exist)
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_user_profiles_phone;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_user_profiles_approval_status;
DROP INDEX IF EXISTS idx_user_profiles_auth_user_id;
DROP INDEX IF EXISTS idx_approved_phone_numbers_phone;
DROP INDEX IF EXISTS idx_user_permissions_user_id;
DROP INDEX IF EXISTS idx_user_permissions_permission_id;
DROP INDEX IF EXISTS idx_module_permissions_user_id;
DROP INDEX IF EXISTS idx_module_permissions_module;

-- ============================================================================
-- STEP 5: Remove RLS policies for authenticated users from core tables
-- ============================================================================

-- Remove RLS policies that check for authenticated users (only if they exist)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON molds;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON schedule_jobs;

-- ============================================================================
-- STEP 6: Create new RLS policies that allow all access (no authentication required)
-- ============================================================================

-- Create policies that allow all access (no authentication required)
CREATE POLICY "Allow all access" ON machines
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON molds
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON schedule_jobs
    FOR ALL USING (true);

-- ============================================================================
-- STEP 7: Remove any remaining auth-related data
-- ============================================================================

-- Remove any auth-related data from the auth schema (if accessible)
-- Note: This might not work depending on Supabase permissions
-- DELETE FROM auth.users WHERE email != 'service_role';

-- ============================================================================
-- STEP 8: Verify the cleanup
-- ============================================================================

-- Check what tables remain
SELECT 'Tables remaining after cleanup:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check what functions remain
SELECT 'Functions remaining after cleanup:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- The authentication system has been completely removed.
-- The application will now work without authentication.
-- All core functionality (machines, molds, schedules) is accessible without login.
