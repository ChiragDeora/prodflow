-- Reset Yogesh's Password to a known value
-- Run this in Supabase SQL Editor

-- Set password to "admin123" (you can change this)
-- This will generate a hash for "admin123"
UPDATE auth_users 
SET 
    password_hash = '$2b$12$gti7gQdCluu4wPuQq5GDyeHwDa2XrVOlnN9OuaU4zjDNmcMsPMKsq', -- This is "admin123"
    password_reset_required = false,
    updated_at = NOW()
WHERE username = 'yogesh';

-- Verify the update
SELECT 'Yogesh password reset to: admin123' as info;
SELECT 
    username,
    email,
    status,
    is_root_admin
FROM auth_users 
WHERE username = 'yogesh';
