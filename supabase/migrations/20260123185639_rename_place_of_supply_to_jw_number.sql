-- ============================================================================
-- RENAME place_of_supply TO jw_number IN store_job_work_challan
-- ============================================================================
-- Renames place_of_supply column to jw_number (Job Work Number)
-- ============================================================================

-- Rename the column
ALTER TABLE store_job_work_challan
  RENAME COLUMN place_of_supply TO jw_number;

-- Update comment
COMMENT ON COLUMN store_job_work_challan.jw_number IS 'Job Work Number';
