-- Fix user data issues
-- Run this in Supabase SQL Editor

-- Add username for Yogesh Deora
UPDATE user_profiles 
SET 
    username = 'yogeshdeora',
    updated_at = NOW()
WHERE email = 'yogesh@polypacks.in' AND username IS NULL;

-- Generate auth_user_id for IT user (since it was created by admin)
UPDATE user_profiles 
SET 
    auth_user_id = gen_random_uuid(),
    updated_at = NOW()
WHERE username = 'It' AND auth_user_id IS NULL;

-- Verify the fixes
SELECT 
    'User Data Fixed' as status,
    full_name,
    email,
    username,
    phone_number,
    auth_user_id,
    is_approved,
    is_active
FROM user_profiles 
ORDER BY full_name;
