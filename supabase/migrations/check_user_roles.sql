-- Check and Fix User Role Assignments
-- Run this in Supabase SQL Editor

-- Step 1: Check all users and their current roles
SELECT 
    id,
    full_name,
    email,
    phone_number,
    role,
    is_approved,
    is_active,
    auth_user_id,
    created_at
FROM user_profiles 
ORDER BY full_name;

-- Step 2: Check if there are multiple admin users (should only be Yogesh)
SELECT 
    'Admin Users Count' as check_type,
    COUNT(*) as total_admin_users,
    STRING_AGG(full_name, ', ') as admin_user_names
FROM user_profiles 
WHERE role = 'admin';

-- Step 3: Check Chirag Deora's current role
SELECT 
    'Chirag Deora Details' as check_type,
    id,
    full_name,
    email,
    phone_number,
    role,
    is_approved,
    is_active,
    auth_user_id,
    created_at
FROM user_profiles 
WHERE email = 'it@polypacks.in' OR full_name LIKE '%Chirag%';

-- Step 4: Check Yogesh Deora's current role
SELECT 
    'Yogesh Deora Details' as check_type,
    id,
    full_name,
    email,
    phone_number,
    role,
    is_approved,
    is_active,
    auth_user_id,
    created_at
FROM user_profiles 
WHERE email = 'yogesh@polypacks.in' OR full_name LIKE '%Yogesh%';

-- Step 5: Fix role assignments - only Yogesh should be admin
UPDATE user_profiles 
SET 
    role = 'user',
    updated_at = NOW()
WHERE email = 'it@polypacks.in' 
AND role = 'admin';

-- Step 6: Ensure Yogesh is admin
UPDATE user_profiles 
SET 
    role = 'admin',
    is_approved = true,
    is_active = true,
    updated_at = NOW()
WHERE email = 'yogesh@polypacks.in';

-- Step 7: Verify the fix
SELECT 
    'Final Role Check' as check_type,
    full_name,
    email,
    role,
    is_approved,
    is_active
FROM user_profiles 
ORDER BY full_name;

-- Step 8: Show final admin count
SELECT 
    'Final Admin Count' as check_type,
    COUNT(*) as total_admin_users,
    STRING_AGG(full_name, ', ') as admin_user_names
FROM user_profiles 
WHERE role = 'admin';
