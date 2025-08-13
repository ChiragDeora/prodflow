--- Complete purge of lines table and related constraints
-- WARNING: This will permanently delete all line data

-- Drop foreign key constraints first (if they exist)
ALTER TABLE IF EXISTS lines DROP CONSTRAINT IF EXISTS fk_lines_im_machine;
ALTER TABLE IF EXISTS lines DROP CONSTRAINT IF EXISTS fk_lines_robot_machine;
ALTER TABLE IF EXISTS lines DROP CONSTRAINT IF EXISTS fk_lines_conveyor_machine;
ALTER TABLE IF EXISTS lines DROP CONSTRAINT IF EXISTS fk_lines_hoist_machine;

-- Drop indexes (if they exist)
DROP INDEX IF EXISTS idx_lines_im_machine_id;
DROP INDEX IF EXISTS idx_lines_robot_machine_id;
DROP INDEX IF EXISTS idx_lines_conveyor_machine_id;
DROP INDEX IF EXISTS idx_lines_hoist_machine_id;
DROP INDEX IF EXISTS idx_lines_status;
DROP INDEX IF EXISTS idx_lines_unit;

-- Drop RLS policies (if they exist)
DROP POLICY IF EXISTS "Users can view lines based on unit access" ON lines;
DROP POLICY IF EXISTS "Users can insert lines based on unit access" ON lines;
DROP POLICY IF EXISTS "Users can update lines based on unit access" ON lines;
DROP POLICY IF EXISTS "Users can delete lines based on unit access" ON lines;

-- Drop triggers (if they exist)
DROP TRIGGER IF EXISTS set_updated_at ON lines;

-- Finally, drop the table itself
DROP TABLE IF EXISTS lines;

-- Verify table is gone
SELECT 'Lines table successfully dropped' as status;
