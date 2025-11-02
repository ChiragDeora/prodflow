-- Set Yogesh's Password
-- Run this in Supabase SQL Editor
-- Replace 'YourNewPassword123!' with your desired password

-- Generate password hash (you'll need to replace this with actual hash)
-- Use this command to generate hash: node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourNewPassword123!', 12).then(hash => console.log('Hash:', hash));"

-- Update Yogesh's password (replace the hash below with your generated hash)
UPDATE auth_users 
SET 
    password_hash = '$2b$12$YOUR_GENERATED_HASH_HERE',
    password_reset_required = false,
    updated_at = NOW()
WHERE username = 'yogesh';

-- Verify the update
SELECT 'Yogesh account updated:' as info;
SELECT 
    username,
    email,
    status,
    password_reset_required,
    is_root_admin
FROM auth_users 
WHERE username = 'yogesh';
