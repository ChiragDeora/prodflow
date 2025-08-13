-- Test script to verify the new RPC function exists
-- Run this in Supabase SQL Editor to test

-- Test if the function exists
SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'create_profile_for_authenticated_user'
) as function_exists;

-- If the function exists, you can test it (but only when authenticated)
-- SELECT create_profile_for_authenticated_user();