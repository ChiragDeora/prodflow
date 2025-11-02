-- Remove Custom Authentication System
-- This script removes the custom auth_users system completely
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Show what custom auth tables exist
-- ============================================================================

SELECT 'Custom auth tables to be removed:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'auth_%'
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Drop custom auth tables
-- ============================================================================

-- Drop custom auth tables
DROP TABLE IF EXISTS public.auth_audit_logs CASCADE;
DROP TABLE IF EXISTS public.auth_sessions CASCADE;
DROP TABLE IF EXISTS public.auth_users CASCADE;
DROP TABLE IF EXISTS public.auth_resources CASCADE;
DROP TABLE IF EXISTS public.auth_resource_fields CASCADE;
DROP TABLE IF EXISTS public.auth_roles CASCADE;
DROP TABLE IF EXISTS public.auth_user_roles CASCADE;
DROP TABLE IF EXISTS public.auth_permissions CASCADE;
DROP TABLE IF EXISTS public.auth_role_permissions CASCADE;
DROP TABLE IF EXISTS public.auth_user_permissions CASCADE;
DROP TABLE IF EXISTS public.auth_password_resets CASCADE;

-- ============================================================================
-- STEP 3: Drop auth_system schema if it exists
-- ============================================================================

DROP SCHEMA IF EXISTS auth_system CASCADE;

-- ============================================================================
-- STEP 4: Verify cleanup
-- ============================================================================

SELECT 'Tables remaining after auth cleanup:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT 'SUCCESS: Custom authentication system removed!' as status;
SELECT 'Your app will now work without any authentication.' as message;
