-- Clean Standalone Profile System (OTP-Ready)
-- No more auth.users dependency for admin-created profiles

-- Remove foreign key constraint completely
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add auth linking column (keeps profiles independent)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'password', 'otp'
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Simple RLS policies for standalone profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Yogesh can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

-- Simplified RLS: Yogesh sees all, users see their linked profiles
CREATE POLICY "Admin can manage all profiles" ON user_profiles
    FOR ALL USING (auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

CREATE POLICY "Users can view linked profiles" ON user_profiles
    FOR SELECT USING (auth.uid()::text = auth_user_id::text);

CREATE POLICY "Users can update linked profiles" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = auth_user_id::text);

-- Simple function to link profile on authentication
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
        auth_method = 'password', -- Will be 'otp' later
        last_login = NOW(),
        updated_at = NOW()
    WHERE email = user_email 
    AND auth_user_id IS NULL -- Only link unlinked profiles
    RETURNING * INTO profile_record;
    
    IF profile_record IS NULL THEN
        RAISE EXCEPTION 'No profile found for email: %', user_email;
    END IF;
    
    RETURN to_json(profile_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Link Yogesh's existing profile
UPDATE user_profiles 
SET auth_user_id = '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid,
    auth_method = 'password',
    last_login = NOW()
WHERE email = 'yogesh@polypacks.in' AND auth_user_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_unlinked ON user_profiles(email) WHERE auth_user_id IS NULL;