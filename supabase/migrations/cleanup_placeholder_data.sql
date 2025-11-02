-- Clean up placeholder data from maintenance tables
-- Run this in Supabase SQL Editor

-- Delete all placeholder maintenance checklists
DELETE FROM maintenance_checklists 
WHERE checklist_type LIKE '%checklist for injection machine%' 
   OR checklist_type LIKE '%maintenance checkli%'
   OR description LIKE '%Daily maintenance checklist%'
   OR description LIKE '%Comprehensive line maintenance%';

-- Delete all placeholder maintenance tasks
DELETE FROM maintenance_tasks 
WHERE title LIKE '%Daily Maintenance%'
   OR title LIKE '%Weekly Maintenance%'
   OR title LIKE '%Monthly Maintenance%'
   OR title LIKE '%Quarterly Maintenance%'
   OR title LIKE '%Annual Maintenance%'
   OR title LIKE '%Robot Maintenance%'
   OR title LIKE '%Line Maintenance - LINE-001%'
   OR title LIKE '%Emergency Repair - Hydraulic System%'
   OR description LIKE '%Sample machine for maintenance%';

-- Delete all placeholder maintenance schedules
DELETE FROM maintenance_schedules 
WHERE name LIKE '%Daily Machine Check%'
   OR name LIKE '%Monthly Calibration%'
   OR name LIKE '%Weekly Line Inspection%'
   OR description LIKE '%Sample machine%';

-- Show remaining records
SELECT 'maintenance_checklists' as table_name, COUNT(*) as remaining_records FROM maintenance_checklists
UNION ALL
SELECT 'maintenance_tasks' as table_name, COUNT(*) as remaining_records FROM maintenance_tasks
UNION ALL
SELECT 'maintenance_schedules' as table_name, COUNT(*) as remaining_records FROM maintenance_schedules
UNION ALL
SELECT 'maintenance_history' as table_name, COUNT(*) as remaining_records FROM maintenance_history;

-- Show what's left (if any)
SELECT 'Remaining maintenance_checklists:' as info;
SELECT id, checklist_type, machine_id, line_id FROM maintenance_checklists LIMIT 10;

SELECT 'Remaining maintenance_tasks:' as info;
SELECT id, title, task_type, machine_id, line_id FROM maintenance_tasks LIMIT 10;
