-- Fix RLS policies to allow login queries
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

-- Create new policies that allow login queries
-- Allow login queries (username + phone number lookup)
CREATE POLICY "Allow login queries" ON user_profiles
    FOR SELECT USING (
        -- Allow if user is authenticated and viewing their own profile
        (auth.uid()::text = auth_user_id::text OR auth.uid()::text = id::text)
        -- OR allow login queries (username + phone number lookup)
        OR (auth.role() = 'anon' AND is_approved = true AND is_active = true)
        -- OR allow admin access
        OR auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
    );

-- Admin can manage all profiles
CREATE POLICY "Admin can manage all profiles" ON user_profiles
    FOR ALL USING (auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (
        auth.uid()::text = auth_user_id::text 
        OR auth.uid()::text = id::text
        OR auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
    );

-- Allow profile creation
CREATE POLICY "Allow profile creation" ON user_profiles
    FOR INSERT WITH CHECK (
        auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
        OR auth.uid()::text = auth_user_id::text
        OR auth.uid() IS NULL
    );

-- Test the login query
SELECT 
    'RLS Policies Fixed' as status,
    COUNT(*) as total_profiles,
    'Login queries should now work' as message
FROM user_profiles 
WHERE username = 'It' 
AND phone_number = '8591451099'
AND is_approved = true
AND is_active = true;

-- Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
