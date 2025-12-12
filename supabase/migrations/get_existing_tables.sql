-- GET ALL EXISTING TABLES AND THEIR STRUCTURE
-- This will show us what actually exists in your database

-- =====================================================
-- 1. GET ALL TABLE NAMES IN PUBLIC SCHEMA
-- =====================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 2. GET ALL COLUMNS FOR ALL TABLES
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =====================================================
-- 3. CHECK IF AUTH TABLES EXIST
-- =====================================================
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'auth_users',
    'auth_roles', 
    'auth_permissions',
    'auth_resources',
    'auth_user_permissions',
    'auth_user_roles',
    'auth_resource_fields',
    'auth_audit_logs'
)
ORDER BY table_name;

-- =====================================================
-- 4. GET ALL SCHEMAS
-- =====================================================
SELECT 
    schema_name
FROM information_schema.schemata
ORDER BY schema_name;

-- =====================================================
-- 5. CHECK AUTH_SYSTEM SCHEMA IF IT EXISTS
-- =====================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'auth_system'
ORDER BY table_name;

-- =====================================================
-- 6. GET ACTUAL USER TABLE STRUCTURE (WHEREVER IT IS)
-- =====================================================
-- Check public.auth_users
SELECT 
    'public.auth_users' as table_location,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'auth_users'
ORDER BY ordinal_position;

-- Check auth_system.auth_users  
SELECT 
    'auth_system.auth_users' as table_location,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth_system' 
AND table_name = 'auth_users'
ORDER BY ordinal_position;
