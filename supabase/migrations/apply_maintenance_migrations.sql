-- =====================================================
-- APPLY MAINTENANCE MIGRATIONS IN CORRECT ORDER
-- =====================================================
-- This script applies the maintenance migrations in the correct order

-- Step 1: Apply the main maintenance tables migration
-- This creates all the maintenance tables
\i supabase/migrations/20250129000035_create_maintenance_tables.sql

-- Step 2: Apply the foreign key fixes migration
-- This ensures proper foreign key relationships
\i supabase/migrations/20250129000036_fix_maintenance_foreign_keys.sql

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'maintenance_%'
ORDER BY table_name;
