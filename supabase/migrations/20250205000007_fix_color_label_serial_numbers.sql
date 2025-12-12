-- ============================================================================
-- FIX COLOR/LABEL MASTER SERIAL NUMBERS
-- Renumbers all serial numbers to start from 1 sequentially
-- ============================================================================

-- Create a temporary table with the correct serial numbers
WITH numbered_rows AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY sr_no, created_at) AS new_sr_no,
    color_label
  FROM color_label_master
)
-- Update all rows with sequential serial numbers starting from 1
UPDATE color_label_master clm
SET sr_no = nr.new_sr_no
FROM numbered_rows nr
WHERE clm.id = nr.id;

-- Verify the update
SELECT 
  MIN(sr_no) as min_sr_no,
  MAX(sr_no) as max_sr_no,
  COUNT(*) as total_count,
  COUNT(DISTINCT sr_no) as unique_sr_nos
FROM color_label_master;

