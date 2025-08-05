-- Fix RLS policies to allow anonymous users for development
-- This allows the anon key to perform CRUD operations

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON molds;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON schedule_jobs;

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

-- Molds table policies
CREATE POLICY "Allow anonymous read access" ON molds
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON molds
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON molds
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access" ON molds
    FOR DELETE USING (true);

-- Schedule jobs table policies
CREATE POLICY "Allow anonymous read access" ON schedule_jobs
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON schedule_jobs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON schedule_jobs
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access" ON schedule_jobs
    FOR DELETE USING (true); 