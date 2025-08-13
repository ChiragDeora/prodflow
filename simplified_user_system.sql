-- Simplified User System for OTP-Ready Implementation
-- This removes auth.users dependency for admin-created profiles

-- Update user_profiles to be completely independent
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add authentication status to profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS login_method VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'password', 'otp'

-- Update RLS policies to work with standalone profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (
        -- Allow if user is viewing their own profile (by auth_user_id)
        auth.uid()::text = auth_user_id::text 
        -- OR if it's Yogesh (admin)
        OR auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
        -- OR if user is not authenticated yet (for profile creation)
        OR auth.uid() IS NULL
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (
        auth.uid()::text = auth_user_id::text 
        OR auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
    );

DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
CREATE POLICY "Users can create their own profile" ON user_profiles
    FOR INSERT WITH CHECK (
        -- Allow Yogesh to create any profile
        auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
        -- OR allow authenticated users to claim unclaimed profiles
        OR (auth.uid()::text = auth_user_id::text AND auth_user_id IS NOT NULL)
    );

-- Function to link profile when user authenticates (password or future OTP)
DROP FUNCTION IF EXISTS link_profile_on_auth(TEXT);
CREATE OR REPLACE FUNCTION link_profile_on_auth(user_email TEXT)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    profile_data JSON;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Link the profile to the authenticated user
    UPDATE user_profiles SET
        auth_user_id = current_user_id,
        last_login = NOW(),
        login_method = 'password', -- Will be 'otp' in the future
        updated_at = NOW()
    WHERE email = user_email
    AND auth_user_id IS NULL; -- Only link unclaimed profiles
    
    -- Return the linked profile
    SELECT to_json(up.*) INTO profile_data
    FROM user_profiles up
    WHERE up.auth_user_id = current_user_id;
    
    RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Yogesh's profile to be linked to his auth account
UPDATE user_profiles 
SET auth_user_id = '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid,
    login_method = 'password',
    last_login = NOW()
WHERE email = 'yogesh@polypacks.in';

-- Create index for auth_user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);