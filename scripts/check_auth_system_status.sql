-- ============================================================================
-- AUTHENTICATION SYSTEM STATUS CHECK
-- Run this script to diagnose root admin setup issues
-- ============================================================================

-- 1. Check if auth_system schema exists
SELECT 'Checking auth_system schema...' as status;
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth_system';

-- 2. Check if auth tables exist in auth_system schema
SELECT 'Checking auth_system tables...' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'auth_system' 
ORDER BY table_name;

-- 3. Check if auth tables exist in public schema (fallback)
SELECT 'Checking public auth tables...' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'auth_%'
ORDER BY table_name;

-- 4. Check auth_users table structure and data
SELECT 'Checking auth_users table...' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'auth_users' 
AND table_schema IN ('auth_system', 'public')
ORDER BY ordinal_position;

-- 5. Check if Yogesh (root admin) exists
SELECT 'Checking root admin user...' as status;
SELECT id, username, email, full_name, status, is_root_admin, 
       CASE 
         WHEN password_hash LIKE '%placeholder%' THEN 'NEEDS_SETUP'
         ELSE 'SETUP_COMPLETE'
       END as setup_status,
       created_at, updated_at
FROM auth_system.auth_users 
WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT id, username, email, full_name, status, is_root_admin,
       CASE 
         WHEN password_hash LIKE '%placeholder%' THEN 'NEEDS_SETUP'
         ELSE 'SETUP_COMPLETE'
       END as setup_status,
       created_at, updated_at
FROM public.auth_users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 6. Check auth_sessions table
SELECT 'Checking auth_sessions table...' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'auth_sessions' 
AND table_schema IN ('auth_system', 'public')
ORDER BY ordinal_position;

-- 7. Check for any active sessions
SELECT 'Checking active sessions...' as status;
SELECT COUNT(*) as active_sessions_count
FROM auth_system.auth_sessions 
WHERE is_active = true
UNION ALL
SELECT COUNT(*) as active_sessions_count
FROM public.auth_sessions 
WHERE is_active = true;

-- 8. Check auth_audit_logs table
SELECT 'Checking auth_audit_logs table...' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'auth_audit_logs' 
AND table_schema IN ('auth_system', 'public')
ORDER BY ordinal_position;

-- 9. Check recent audit logs
SELECT 'Checking recent audit logs...' as status;
SELECT action, outcome, created_at, details
FROM auth_system.auth_audit_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- 10. Check if RLS is enabled on auth tables
SELECT 'Checking RLS status...' as status;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('auth_users', 'auth_sessions', 'auth_audit_logs')
AND schemaname IN ('auth_system', 'public');

-- 11. Check for any errors in the setup
SELECT 'Checking for setup errors...' as status;
SELECT 'If you see this message, the basic queries are working. Check the results above for any issues.' as message;
