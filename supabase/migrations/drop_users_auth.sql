-- Drop Users, Authentication, and Permissions System
-- This script removes all user management, authentication, and access control tables
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check what user/auth tables exist
-- ============================================================================

-- Show current tables to see what we're working with
SELECT 'Current tables in database:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check which user/auth tables actually exist
SELECT 'Checking user/auth table existence:' as info;
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN 'EXISTS - Will be dropped'
        ELSE 'DOES NOT EXIST - Will skip'
    END as status
FROM (VALUES 
    ('user_profiles'),
    ('approved_phone_numbers'),
    ('permissions'),
    ('user_permissions'),
    ('module_permissions')
) AS t(table_name);

-- ============================================================================
-- STEP 2: Drop user authentication tables
-- ============================================================================

-- Drop user profiles and related tables
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS approved_phone_numbers CASCADE;

-- Drop permissions system tables
DROP TABLE IF EXISTS module_permissions CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- ============================================================================
-- STEP 3: Drop user authentication functions
-- ============================================================================

-- Drop user management functions
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
DROP FUNCTION IF EXISTS link_user_profile(TEXT);
DROP FUNCTION IF EXISTS get_user_profile(TEXT);

-- ============================================================================
-- STEP 4: Drop user authentication triggers
-- ============================================================================

-- Drop user-related triggers
DROP TRIGGER IF EXISTS email_confirmation_trigger ON auth.users;
DROP TRIGGER IF EXISTS user_signup_trigger ON auth.users;
DROP TRIGGER IF EXISTS new_signup_notification_trigger ON user_profiles;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_approved_phone_numbers_updated_at ON approved_phone_numbers;
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
DROP TRIGGER IF EXISTS update_module_permissions_updated_at ON module_permissions;

-- ============================================================================
-- STEP 5: Drop user authentication indexes
-- ============================================================================

-- Drop user-related indexes
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
-- STEP 6: Remove RLS policies that require authentication
-- ============================================================================

-- Remove RLS policies that check for authenticated users
DROP POLICY IF EXISTS "Allow all for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON molds;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON schedule_jobs;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view linked profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update linked profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Yogesh can view all profiles" ON user_profiles;

-- ============================================================================
-- STEP 7: Create open access policies for core business tables
-- ============================================================================

-- Create policies that allow all access (no authentication required)
CREATE POLICY "Allow all access" ON machines
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON molds
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON schedule_jobs
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON lines
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON packing_materials
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON raw_materials
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON units
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON unit_management_settings
    FOR ALL USING (true);

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

SELECT 'SUCCESS: User authentication system removed!' as status;
SELECT 'Your production scheduler now works without login requirements.' as message;
SELECT 'All core business tables are accessible to everyone.' as details;
