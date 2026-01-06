-- ============================================================================
-- ADD STOCK STATUS TO JOB WORK CHALLAN
-- ============================================================================
-- Adds stock_status, posted_to_stock_at, and posted_to_stock_by columns
-- to store_job_work_challan table for stock ledger posting support
-- ============================================================================

-- Add stock status fields to store_job_work_challan
ALTER TABLE store_job_work_challan 
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);

-- Create index for stock status
CREATE INDEX IF NOT EXISTS idx_store_job_work_challan_stock_status ON store_job_work_challan(stock_status);

-- Add comments
COMMENT ON COLUMN store_job_work_challan.stock_status IS 'Stock posting status: DRAFT, POSTED, or CANCELLED';
COMMENT ON COLUMN store_job_work_challan.posted_to_stock_at IS 'Timestamp when the challan was posted to stock ledger';
COMMENT ON COLUMN store_job_work_challan.posted_to_stock_by IS 'Username of the user who posted the challan to stock ledger';

