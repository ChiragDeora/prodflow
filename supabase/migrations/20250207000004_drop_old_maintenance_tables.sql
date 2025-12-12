-- =====================================================
-- DROP OLD MAINTENANCE TABLES
-- =====================================================
-- This migration drops the old maintenance_tasks table and related tables
-- as they are being replaced by separate breakdown and preventive maintenance tables
--
-- ⚠️  WARNING: DO NOT RUN THIS MIGRATION YET ⚠️
-- 
-- This migration is commented out because:
-- 1. Some components still use the old maintenanceTaskAPI
-- 2. The old table needs to exist until all code is migrated
-- 3. Running this will break the application
--
-- To safely drop old tables:
-- 1. Update all components to use breakdownMaintenanceAPI and preventiveMaintenanceAPI
-- 2. Migrate any existing data if needed
-- 3. Then uncomment and run this migration
--
-- Components that still need updating:
-- - src/components/modules/maintenance-management/LineChecklists.tsx
-- - src/components/modules/maintenance-management/LineMaintenance.tsx
-- - src/components/modules/welcome-dashboard/index.tsx

/*
-- Check if new tables exist before dropping old ones
DO $$
BEGIN
    -- Only proceed if new tables exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'breakdown_maintenance_tasks'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'preventive_maintenance_tasks'
    ) THEN
        RAISE EXCEPTION 'New maintenance tables do not exist. Please run migrations 20250207000001 and 20250207000002 first.';
    END IF;
END $$;

-- Drop foreign key constraints first
DO $$
BEGIN
    -- Drop foreign keys from maintenance_history if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_maintenance_history_task' 
               AND table_name = 'maintenance_history') THEN
        ALTER TABLE maintenance_history DROP CONSTRAINT fk_maintenance_history_task;
    END IF;
END $$;

-- Drop dependent tables first (in reverse order of dependencies)
-- Using IF EXISTS to prevent errors if tables don't exist
DROP TABLE IF EXISTS maintenance_history CASCADE;
DROP TABLE IF EXISTS maintenance_tasks CASCADE;
DROP TABLE IF EXISTS maintenance_schedules CASCADE;
DROP TABLE IF EXISTS maintenance_checklists CASCADE;

-- Drop related functions if they exist
DROP FUNCTION IF EXISTS get_line_maintenance_tasks(VARCHAR(50)) CASCADE;
DROP FUNCTION IF EXISTS get_machine_maintenance_tasks(VARCHAR(50)) CASCADE;
DROP FUNCTION IF EXISTS get_overdue_maintenance_tasks() CASCADE;
*/

-- Note: The new breakdown and preventive maintenance tables are created
-- in separate migration files:
-- - 20250207000001_create_breakdown_maintenance_tables.sql
-- - 20250207000002_create_preventive_maintenance_tables.sql

