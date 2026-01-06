-- =====================================================
-- TRUNCATE DPR TABLES
-- =====================================================
-- This script truncates all data from DPR tables
-- Tables are truncated in order to respect foreign key constraints
-- =====================================================

-- Option 1: Truncate in order (recommended)
-- This is safer and more explicit

-- First, truncate child tables
TRUNCATE TABLE dpr_stoppage_entries CASCADE;
TRUNCATE TABLE dpr_machine_entries CASCADE;
TRUNCATE TABLE dpr_data CASCADE;

-- =====================================================
-- Option 2: Single command (if CASCADE works with your FK setup)
-- =====================================================
-- TRUNCATE TABLE dpr_data CASCADE;
-- This should cascade to child tables, but verify with your FK constraints

-- =====================================================
-- Option 3: If you want to reset sequences as well
-- =====================================================
-- TRUNCATE TABLE dpr_stoppage_entries RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE dpr_machine_entries RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE dpr_data RESTART IDENTITY CASCADE;

-- =====================================================
-- Verification queries (run after truncate)
-- =====================================================
-- SELECT COUNT(*) as dpr_data_count FROM dpr_data;
-- SELECT COUNT(*) as dpr_machine_entries_count FROM dpr_machine_entries;
-- SELECT COUNT(*) as dpr_stoppage_entries_count FROM dpr_stoppage_entries;

