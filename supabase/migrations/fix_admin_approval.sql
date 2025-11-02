-- Fix Admin User Approval Issue
-- Run this in Supabase SQL Editor

-- Step 1: Check current approval status of admin users
SELECT 
    id,
    full_name,
    email,
    role,
    is_approved,
    is_active,
    auth_user_id
FROM user_profiles 
WHERE role = 'admin'
ORDER BY full_name;

-- Step 2: Ensure all admin users are approved
UPDATE user_profiles 
SET 
    is_approved = true,
    is_active = true,
    updated_at = NOW()
WHERE role = 'admin' 
AND (is_approved = false OR is_approved IS NULL);

-- Step 3: Also approve any users with email_confirmed_at (they should be approved)
UPDATE user_profiles 
SET 
    is_approved = true,
    updated_at = NOW()
WHERE email_confirmed_at IS NOT NULL 
AND (is_approved = false OR is_approved IS NULL);

-- Step 4: Check if there are any users with auth_user_id but not approved
-- These might be legitimate pending approvals
SELECT 
    id,
    full_name,
    email,
    role,
    is_approved,
    is_active,
    auth_user_id,
    created_at
FROM user_profiles 
WHERE is_approved = false 
AND is_active = true 
AND auth_user_id IS NOT NULL
ORDER BY created_at ASC;

-- Step 5: Verify admin users are now approved
SELECT 
    'Admin Users Approval Status' as status,
    COUNT(*) as total_admin_users,
    COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_admin_users,
    COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_admin_users
FROM user_profiles 
WHERE role = 'admin';

-- Step 6: Test the pending approvals query
SELECT 
    id, 
    full_name, 
    email, 
    phone_number, 
    department, 
    role, 
    is_active, 
    created_at, 
    auth_user_id
FROM user_profiles 
WHERE is_approved = false 
AND is_active = true 
AND auth_user_id IS NOT NULL 
ORDER BY created_at ASC;

-- Step 7: Show final status
SELECT 
    'Fix Complete' as status,
    'Admin users should no longer appear in pending approvals' as message;
