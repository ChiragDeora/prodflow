-- ============================================================================
-- Add Bank Details to Vendor Registration (VRF) Table
-- ============================================================================

-- Add bank details columns to purchase_vendor_registration table
ALTER TABLE purchase_vendor_registration
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(11),
ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) CHECK (account_type IN ('Savings', 'Current', 'Other'));

-- Add index for bank account number for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_registration_bank_account ON purchase_vendor_registration(bank_account_number);

-- Add comment for documentation
COMMENT ON COLUMN purchase_vendor_registration.bank_name IS 'Name of the bank';
COMMENT ON COLUMN purchase_vendor_registration.bank_account_number IS 'Bank account number';
COMMENT ON COLUMN purchase_vendor_registration.ifsc_code IS 'IFSC code of the bank branch';
COMMENT ON COLUMN purchase_vendor_registration.bank_branch IS 'Bank branch name';
COMMENT ON COLUMN purchase_vendor_registration.account_holder_name IS 'Name of the account holder';
COMMENT ON COLUMN purchase_vendor_registration.account_type IS 'Type of account: Savings, Current, or Other';

