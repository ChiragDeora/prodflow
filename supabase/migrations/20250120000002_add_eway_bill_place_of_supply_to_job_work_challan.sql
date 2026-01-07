-- ============================================================================
-- ADD E-WAY BILL NO AND PLACE OF SUPPLY TO store_job_work_challan
-- ============================================================================
-- Adds e_way_bill_no and place_of_supply columns for Job Work Challan
-- ============================================================================

-- Add e_way_bill_no column
ALTER TABLE store_job_work_challan
  ADD COLUMN IF NOT EXISTS e_way_bill_no VARCHAR(100);

-- Add place_of_supply column
ALTER TABLE store_job_work_challan
  ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(255);

-- Create index on e_way_bill_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_work_challan_eway_bill_no 
  ON store_job_work_challan(e_way_bill_no);

-- Update comments
COMMENT ON COLUMN store_job_work_challan.e_way_bill_no IS 'E-Way Bill Number for GST compliance';
COMMENT ON COLUMN store_job_work_challan.place_of_supply IS 'Place of Supply for GST purposes';

