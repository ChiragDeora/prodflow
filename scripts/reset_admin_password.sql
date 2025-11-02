-- ============================================================================
-- RESET ADMIN PASSWORD - Quick Fix
-- Run this in your Supabase SQL Editor to reset Yogesh's password
-- ============================================================================

-- Option 1: Reset to a simple password "admin123"
-- This is the easiest option - just run this and use "admin123" to login
UPDATE auth_system.auth_users 
SET 
    password_hash = '$2b$12$gti7gQdCluu4wPuQq5GDyeHwDa2XrVOlnN9OuaU4zjDNmcMsPMKsq', -- This is "admin123"
    password_reset_required = false,
    temporary_password = null,
    failed_login_attempts = 0,
    account_locked_until = null,
    last_password_change = NOW(),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Option 2: Reset to placeholder (allows setup page to work again)
-- Uncomment the lines below if you want to use the setup page instead
-- UPDATE auth_system.auth_users 
-- SET 
--     password_hash = '$2a$12$placeholder.hash.will.be.updated.via.setup.page',
--     password_reset_required = false,
--     temporary_password = null,
--     failed_login_attempts = 0,
--     account_locked_until = null,
--     updated_at = NOW()
-- WHERE id = '00000000-0000-0000-0000-000000000001';

-- Clear any existing sessions for security
UPDATE auth_system.auth_sessions 
SET is_active = false 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Verify the reset
SELECT 'Password reset completed!' as status;
SELECT 
    username,
    email,
    full_name,
    status,
    is_root_admin,
    CASE 
        WHEN password_hash LIKE '%placeholder%' THEN 'NEEDS_SETUP'
        ELSE 'PASSWORD_SET'
    END as password_status
FROM auth_system.auth_users 
WHERE id = '00000000-0000-0000-0000-000000000001';
