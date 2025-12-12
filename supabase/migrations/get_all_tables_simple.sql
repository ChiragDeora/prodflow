-- GET ALL TABLES - SIMPLE VERSION
-- Run each query separately to see all your tables

-- Query 1: Get all table names
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Query 2: Get all table names with row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    n_live_tup as current_rows
FROM pg_stat_user_tables 
ORDER BY tablename;
