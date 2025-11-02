-- Fix username length issue
-- Run this in Supabase SQL Editor

-- Update IT user's username to be at least 3 characters
UPDATE user_profiles 
SET 
    username = 'ITUser',
    updated_at = NOW()
WHERE username = 'It' AND email = 'it@polypacks.in';

-- Verify the change
SELECT 
    'Username Updated' as status,
    full_name,
    username,
    phone_number,
    email,
    is_approved,
    is_active
FROM user_profiles 
WHERE email = 'it@polypacks.in';

-- Test the login query with new username
SELECT 
    'Login Test with New Username' as check_type,
    id,
    full_name,
    username,
    phone_number,
    is_approved,
    is_active
FROM user_profiles 
WHERE username = 'ITUser' 
AND phone_number = '8591451099'
AND is_approved = true
AND is_active = true;
