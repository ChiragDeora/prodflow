-- Unlock Admin Account
-- This script unlocks the admin account and resets failed login attempts
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check current admin account status
-- ============================================================================

SELECT 'Current admin account status:' as info;
SELECT 
    username,
    email,
    status,
    failed_login_attempts,
    account_locked_until,
    is_root_admin,
    created_at
FROM auth_users 
WHERE username = 'yogesh' OR is_root_admin = true
ORDER BY created_at;

-- ============================================================================
-- STEP 2: Unlock the admin account
-- ============================================================================

-- Reset failed login attempts and unlock account
UPDATE auth_users 
SET 
    failed_login_attempts = 0,
    account_locked_until = NULL,
    status = 'active',
    updated_at = NOW()
WHERE username = 'yogesh' OR is_root_admin = true;

-- ============================================================================
-- STEP 3: Verify the unlock
-- ============================================================================

SELECT 'Admin account after unlock:' as info;
SELECT 
    username,
    email,
    status,
    failed_login_attempts,
    account_locked_until,
    is_root_admin
FROM auth_users 
WHERE username = 'yogesh' OR is_root_admin = true;

-- ============================================================================
-- STEP 4: Show all auth tables that exist
-- ============================================================================

SELECT 'Auth tables that still exist:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'auth_%'
ORDER BY table_name;

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT 'SUCCESS: Admin account unlocked!' as status;
SELECT 'You can now try logging in again.' as message;
