-- Debug Tables - Check what's really in your database
-- Run this in Supabase SQL Editor to see what's happening

-- ============================================================================
-- STEP 1: Check all schemas and tables
-- ============================================================================

-- Check what schemas exist
SELECT 'Available schemas:' as info;
SELECT schema_name 
FROM information_schema.schemata 
ORDER BY schema_name;

-- Check all tables across all schemas
SELECT 'All tables across all schemas:' as info;
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- ============================================================================
-- STEP 2: Check specifically for user_profiles
-- ============================================================================

-- Check if user_profiles exists in any schema
SELECT 'Looking for user_profiles table:' as info;
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'user_profiles'
ORDER BY table_schema;

-- Check if it exists in public schema specifically
SELECT 'Checking public schema for user_profiles:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles'
        ) THEN 'user_profiles EXISTS in public schema'
        ELSE 'user_profiles DOES NOT EXIST in public schema'
    END as status;

-- ============================================================================
-- STEP 3: Check table structure if it exists
-- ============================================================================

-- If user_profiles exists, show its structure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        RAISE NOTICE 'user_profiles table exists - showing structure';
    ELSE
        RAISE NOTICE 'user_profiles table does NOT exist in public schema';
    END IF;
END $$;

-- Show structure if table exists
SELECT 'user_profiles table structure (if exists):' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 4: Check for similar table names
-- ============================================================================

-- Look for tables with similar names
SELECT 'Tables with similar names to user_profiles:' as info;
SELECT 
    table_schema,
    table_name
FROM information_schema.tables 
WHERE table_name LIKE '%user%' 
   OR table_name LIKE '%profile%'
   OR table_name LIKE '%auth%'
ORDER BY table_schema, table_name;

-- ============================================================================
-- STEP 5: Check current search path
-- ============================================================================

-- Check current search path
SELECT 'Current search path:' as info;
SHOW search_path;

-- Check current schema
SELECT 'Current schema:' as info;
SELECT current_schema();
