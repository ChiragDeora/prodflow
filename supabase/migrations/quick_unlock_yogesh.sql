-- Quick Unlock Yogesh Account
-- Run this in Supabase SQL Editor

-- Unlock Yogesh's account
UPDATE auth_users 
SET 
    failed_login_attempts = 0,
    account_locked_until = NULL,
    status = 'active',
    updated_at = NOW()
WHERE username = 'yogesh';

-- Show the result
SELECT 'Yogesh account status:' as info;
SELECT 
    username,
    email,
    status,
    failed_login_attempts,
    account_locked_until,
    is_root_admin
FROM auth_users 
WHERE username = 'yogesh';
