-- Simple Drop Authentication Tables
-- This script directly removes user authentication tables
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Show what we're about to remove
-- ============================================================================

SELECT 'Tables to be removed:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles',
    'approved_phone_numbers',
    'permissions',
    'user_permissions',
    'module_permissions'
)
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Drop tables one by one
-- ============================================================================

-- Drop user profiles table
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Drop permissions tables
DROP TABLE IF EXISTS public.module_permissions CASCADE;
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;

-- Drop phone approval table
DROP TABLE IF EXISTS public.approved_phone_numbers CASCADE;

-- ============================================================================
-- STEP 3: Remove RLS policies from core tables
-- ============================================================================

-- Remove any existing RLS policies that might cause issues
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.machines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.molds;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.schedule_jobs;

-- ============================================================================
-- STEP 4: Create open access policies
-- ============================================================================

-- Create policies that allow all access (no authentication required)
CREATE POLICY "Allow all access" ON public.machines
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON public.molds
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON public.schedule_jobs
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON public.lines
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON public.packing_materials
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON public.raw_materials
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON public.units
    FOR ALL USING (true);

CREATE POLICY "Allow all access" ON public.unit_management_settings
    FOR ALL USING (true);

-- ============================================================================
-- STEP 5: Verify what remains
-- ============================================================================

SELECT 'Tables remaining after cleanup:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT 'SUCCESS: Authentication tables removed!' as status;
SELECT 'Your production scheduler now works without login.' as message;
