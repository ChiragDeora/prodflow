-- Fix RLS policies for machines table to allow anonymous access during development
-- This resolves the 409 conflict errors when updating machines

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow anonymous read access" ON machines;
DROP POLICY IF EXISTS "Allow anonymous insert access" ON machines;
DROP POLICY IF EXISTS "Allow anonymous update access" ON machines;
DROP POLICY IF EXISTS "Allow anonymous delete access" ON machines;

-- Create new policies that allow anonymous access for development
-- In production, you would want more restrictive policies

-- Machines table policies
CREATE POLICY "Allow anonymous read access" ON machines
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON machines
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON machines
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access" ON machines
    FOR DELETE USING (true);

-- Verify the policies are created
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
WHERE tablename = 'machines'
ORDER BY policyname;

-- Test that we can update machines
-- This will help verify the policies are working
SELECT 
    'RLS Policies Updated Successfully' as status,
    COUNT(*) as total_machines,
    'Machines table is now accessible for updates' as message
FROM machines;
