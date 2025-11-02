-- Test script to verify maintenance tables exist
-- Run this after applying migrations

-- Check if maintenance tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'maintenance_tasks',
    'maintenance_schedules', 
    'maintenance_checklists',
    'maintenance_history'
)
ORDER BY table_name;

-- Check if sample data exists
SELECT 'maintenance_checklists' as table_name, COUNT(*) as record_count FROM maintenance_checklists
UNION ALL
SELECT 'maintenance_tasks', COUNT(*) FROM maintenance_tasks
UNION ALL  
SELECT 'maintenance_schedules', COUNT(*) FROM maintenance_schedules
UNION ALL
SELECT 'maintenance_history', COUNT(*) FROM maintenance_history;

-- Check if required reference tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lines', 'machines')
ORDER BY table_name;
