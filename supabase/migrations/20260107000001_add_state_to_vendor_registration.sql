-- ============================================================================
-- Add State and State Code columns to Vendor Registration and Customer Master Tables
-- ============================================================================

-- Add state and state_code columns to purchase_vendor_registration table
ALTER TABLE purchase_vendor_registration
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

ALTER TABLE purchase_vendor_registration
ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);

-- Add state_code column to customer_master table
ALTER TABLE customer_master
ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);

-- Add state_code column to vendor_master table  
ALTER TABLE vendor_master
ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);

-- Add comments for the new columns
COMMENT ON COLUMN purchase_vendor_registration.state IS 'State/Province of the customer or supplier';
COMMENT ON COLUMN purchase_vendor_registration.state_code IS 'State code (e.g., 26 for Daman & Diu)';
COMMENT ON COLUMN customer_master.state_code IS 'State code (e.g., 26 for Daman & Diu)';
COMMENT ON COLUMN vendor_master.state_code IS 'State code (e.g., 26 for Daman & Diu)';

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_vendor_registration_state ON purchase_vendor_registration(state);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_state_code ON purchase_vendor_registration(state_code);
CREATE INDEX IF NOT EXISTS idx_customer_master_state_code ON customer_master(state_code);
CREATE INDEX IF NOT EXISTS idx_vendor_master_state_code ON vendor_master(state_code);

