-- Check Yogesh's actual ID
-- Run this in Supabase SQL Editor

SELECT 'Yogesh account details:' as info;
SELECT 
    id,
    username,
    email,
    password_hash,
    status,
    is_root_admin
FROM auth_users 
WHERE username = 'yogesh';
