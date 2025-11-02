-- =====================================================
-- DELETE LINES TABLE ONLY (NO RECREATION)
-- =====================================================

-- Drop the lines table completely (this will also drop all foreign key constraints)
DROP TABLE IF EXISTS lines CASCADE;

-- Verify the table is gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'lines';
