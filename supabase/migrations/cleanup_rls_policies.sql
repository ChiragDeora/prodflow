-- Clean up duplicate and conflicting RLS policies
-- Run this in Supabase SQL Editor

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Allow login queries" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update access for users based on id" ON user_profiles;

-- Create clean, simple policies
-- Allow login queries (username + phone number lookup) - MOST IMPORTANT
CREATE POLICY "Allow login queries" ON user_profiles
    FOR SELECT USING (
        -- Allow anonymous users to query for login (approved and active users only)
        (auth.role() = 'anon' AND is_approved = true AND is_active = true)
        -- OR allow authenticated users to view their own profile
        OR (auth.uid()::text = auth_user_id::text OR auth.uid()::text = id::text)
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
    'RLS Policies Cleaned' as status,
    COUNT(*) as total_profiles,
    'Login queries should now work' as message
FROM user_profiles 
WHERE username = 'It' 
AND phone_number = '8591451099'
AND is_approved = true
AND is_active = true;

-- Verify final policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
