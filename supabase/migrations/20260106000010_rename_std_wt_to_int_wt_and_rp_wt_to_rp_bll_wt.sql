-- =====================================================
-- RENAME std_wt TO int_wt AND rp_wt TO rp_bill_wt
-- =====================================================
-- This migration renames:
-- - std_wt (Standard Weight) -> int_wt (Internal Weight)
-- - rp_wt (RP Weight) -> rp_bill_wt (RP Bill Weight)

-- Rename columns in molds table
ALTER TABLE molds 
  RENAME COLUMN std_wt TO int_wt;

ALTER TABLE molds 
  RENAME COLUMN rp_wt TO rp_bill_wt;

-- Update column comments
COMMENT ON COLUMN molds.int_wt IS 'Internal weight';
COMMENT ON COLUMN molds.rp_bill_wt IS 'RP Bill weight';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Renamed columns in molds table:';
    RAISE NOTICE '- std_wt -> int_wt (Internal Weight)';
    RAISE NOTICE '- rp_wt -> rp_bill_wt (RP Bill Weight)';
    RAISE NOTICE 'Column rename completed successfully!';
END $$;

