-- Diagnostic Queries to Check Database Structure
-- Run this in Supabase SQL Editor to see what we're working with

-- 1. Check user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if is_approved column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'is_approved'
            AND table_schema = 'public'
        ) THEN 'is_approved column EXISTS'
        ELSE 'is_approved column MISSING'
    END as column_status;

-- 3. Check if auth_user_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'auth_user_id'
            AND table_schema = 'public'
        ) THEN 'auth_user_id column EXISTS'
        ELSE 'auth_user_id column MISSING'
    END as column_status;

-- 4. Check if email_confirmed_at column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'email_confirmed_at'
            AND table_schema = 'public'
        ) THEN 'email_confirmed_at column EXISTS'
        ELSE 'email_confirmed_at column MISSING'
    END as column_status;

-- 5. List all tables in the database to identify redundant ones
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 6. Check current RLS policies on user_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 7. Check sample data in user_profiles
SELECT 
    id,
    full_name,
    email,
    phone_number,
    role,
    department,
    is_active,
    created_at,
    updated_at
FROM user_profiles 
LIMIT 5;

-- 8. Check if any functions exist for pending approvals
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%approval%'
ORDER BY routine_name;
