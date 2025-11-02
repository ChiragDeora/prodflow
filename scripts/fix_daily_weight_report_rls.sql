-- =====================================================
-- FIX DAILY WEIGHT REPORT RLS (Row Level Security)
-- =====================================================
-- Run this in Supabase SQL Editor to allow inserts
-- =====================================================

-- Check current RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'daily_weight_report';

-- Disable RLS to allow all operations
ALTER TABLE public.daily_weight_report DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, add permissive policies:
-- ALTER TABLE public.daily_weight_report ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations" ON public.daily_weight_report;

-- Create permissive policy for all users
CREATE POLICY "Allow all operations for all users" 
  ON public.daily_weight_report
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Verify the fix
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'daily_weight_report';

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'daily_weight_report';

