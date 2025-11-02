-- Check existing tables in the database
-- Run these queries to see what tables exist and their structure

-- 1. List all tables in the public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if 'lines' table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'lines' 
ORDER BY ordinal_position;

-- 3. Check if 'molds' table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'molds' 
ORDER BY ordinal_position;



-- 6. Sample data from existing tables
-- Check lines table data
SELECT * FROM lines LIMIT 5;

-- Check molds table data
SELECT * FROM molds LIMIT 5;

-- 7. Check for any existing quality-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%quality%'
ORDER BY table_name;
