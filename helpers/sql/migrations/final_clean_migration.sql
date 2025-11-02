-- Final Clean Migration: Standalone Profiles with Auth Linking
-- This fixes all 406 errors and prepares for OTP authentication

-- Step 1: Add new columns for auth linking
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'pending';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Step 2: Remove problematic foreign key constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Step 3: Update RLS policies for new auth model
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Yogesh can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view linked profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update linked profiles" ON user_profiles;

-- Simple, clean RLS policies
CREATE POLICY "Admin can manage all profiles" ON user_profiles
    FOR ALL USING (auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

CREATE POLICY "Users can view linked profiles" ON user_profiles
    FOR SELECT USING (auth.uid()::text = auth_user_id::text);

CREATE POLICY "Users can update linked profiles" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = auth_user_id::text);

-- Step 4: Link Yogesh's existing profile to his auth account
UPDATE user_profiles 
SET auth_user_id = '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid,
    auth_method = 'password',
    last_login = NOW(),
    updated_at = NOW()
WHERE email = 'yogesh@polypacks.in' AND auth_user_id IS NULL;

-- Step 5: Simple function to link profiles during authentication
DROP FUNCTION IF EXISTS link_user_profile(TEXT);
CREATE OR REPLACE FUNCTION link_user_profile(user_email TEXT)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    profile_record RECORD;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Find and link the profile
    UPDATE user_profiles 
    SET auth_user_id = current_user_id,
        auth_method = 'password', -- Will be 'otp' in the future
        last_login = NOW(),
        updated_at = NOW()
    WHERE email = user_email 
    AND auth_user_id IS NULL -- Only link unlinked profiles
    RETURNING * INTO profile_record;
    
    IF profile_record IS NULL THEN
        RAISE EXCEPTION 'No unlinked profile found for email: %', user_email;
    END IF;
    
    RETURN to_json(profile_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_unlinked ON user_profiles(email) WHERE auth_user_id IS NULL;

-- Step 7: Keep phone approval system (for future OTP)
-- (approved_phone_numbers table and functions remain unchanged)

-- Migration complete!
-- Now admin creates standalone profiles, users authenticate and link to them
-- Perfect foundation for future OTP implementation