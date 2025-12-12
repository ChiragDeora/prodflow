-- Add grinding column to lines table
-- This column indicates if grinding operations can be performed on this line

ALTER TABLE lines 
ADD COLUMN IF NOT EXISTS grinding BOOLEAN DEFAULT false;

-- Create index for better performance when filtering by grinding
CREATE INDEX IF NOT EXISTS idx_lines_grinding ON lines(grinding);

-- Set grinding = true for lines 4, 7, 14, and 16
-- Handle various line_id formats: LINE-004, LINE-4, 4, etc.
UPDATE lines 
SET grinding = true 
WHERE 
  -- Exact matches for common formats
  line_id IN ('LINE-004', 'LINE-007', 'LINE-014', 'LINE-016', '4', '7', '14', '16')
  -- LINE- prefix with numbers (handles LINE-4, LINE-004, etc.)
  OR (line_id LIKE 'LINE-%' AND (
    line_id LIKE '%-004' OR line_id LIKE '%-4' OR
    line_id LIKE '%-007' OR line_id LIKE '%-7' OR
    line_id LIKE '%-014' OR line_id LIKE '%-14' OR
    line_id LIKE '%-016' OR line_id LIKE '%-16'
  ))
  -- Ends with exactly 14 or 16
  OR line_id LIKE '%14' OR line_id LIKE '%16'
  -- Ends with exactly 4 or 7 (but not 14, 24, 34, etc.)
  OR (line_id LIKE '%4' AND line_id NOT LIKE '%14' AND line_id NOT LIKE '%24' AND line_id NOT LIKE '%34' AND line_id NOT LIKE '%44' AND line_id NOT LIKE '%54' AND line_id NOT LIKE '%64' AND line_id NOT LIKE '%74' AND line_id NOT LIKE '%84' AND line_id NOT LIKE '%94')
  OR (line_id LIKE '%7' AND line_id NOT LIKE '%17' AND line_id NOT LIKE '%27' AND line_id NOT LIKE '%37' AND line_id NOT LIKE '%47' AND line_id NOT LIKE '%57' AND line_id NOT LIKE '%67' AND line_id NOT LIKE '%77' AND line_id NOT LIKE '%87' AND line_id NOT LIKE '%97');

-- Add comment to column
COMMENT ON COLUMN lines.grinding IS 'Indicates if grinding operations can be performed on this production line';

