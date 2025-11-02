-- Fix line descriptions to have proper "Production LINE-XXX" format
-- This will ensure all descriptions follow the correct format

-- Update descriptions to have "Production" prefix with line_id
UPDATE lines 
SET description = CONCAT('Production ', line_id)
WHERE description != CONCAT('Production ', line_id) OR description IS NULL;

-- Verify the changes
SELECT 
    line_id,
    description,
    status
FROM lines 
ORDER BY line_id;
