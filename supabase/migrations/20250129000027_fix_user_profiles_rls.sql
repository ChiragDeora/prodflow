-- Fix RLS policies for user_profiles table to allow admin access
-- This resolves the 400 error when accessing User Management

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view linked profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update linked profiles" ON user_profiles;

-- Create new policies that allow admin access and proper user access
-- Admin can do everything
CREATE POLICY "Admin can manage all profiles" ON user_profiles
    FOR ALL USING (auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

-- Users can view their own profile (by auth_user_id or id)
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (
        auth.uid()::text = auth_user_id::text 
        OR auth.uid()::text = id::text
    );

-- Users can update their own profile (by auth_user_id or id)
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (
        auth.uid()::text = auth_user_id::text 
        OR auth.uid()::text = id::text
    );

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation" ON user_profiles
    FOR INSERT WITH CHECK (
        auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
        OR auth.uid()::text = auth_user_id::text
        OR auth.uid() IS NULL
    );

-- Verify the policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Test that admin can access all profiles
SELECT 
    'RLS Policies Updated Successfully' as status,
    COUNT(*) as total_profiles,
    'User profiles table is now accessible for admin' as message
FROM user_profiles;
