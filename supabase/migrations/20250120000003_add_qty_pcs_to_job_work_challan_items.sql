-- ============================================================================
-- ADD qty_pcs TO store_job_work_challan_items
-- ============================================================================
-- Adds qty_pcs column to store quantity in pieces (Pcs)
-- This is separate from qty which stores quantity in tons
-- ============================================================================

-- Add qty_pcs column
ALTER TABLE store_job_work_challan_items
  ADD COLUMN IF NOT EXISTS qty_pcs DECIMAL(15, 2);

-- Update comments
COMMENT ON COLUMN store_job_work_challan_items.qty_pcs IS 'Quantity in pieces (Pcs)';

