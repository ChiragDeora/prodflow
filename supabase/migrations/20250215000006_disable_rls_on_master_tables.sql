-- =====================================================
-- DISABLE RLS ON ALL MASTER TABLES
-- =====================================================
-- This migration disables Row Level Security (RLS) on all master data tables
-- to simplify data management and avoid permission issues during updates
-- =====================================================

-- Machine Master
ALTER TABLE IF EXISTS machines DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON machines;

-- Mold Master
ALTER TABLE IF EXISTS molds DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON molds;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON molds;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON molds;

-- Raw Materials Master
ALTER TABLE IF EXISTS raw_materials DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON raw_materials;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON raw_materials;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON raw_materials;

-- Packing Materials Master
ALTER TABLE IF EXISTS packing_materials DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON packing_materials;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON packing_materials;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON packing_materials;

-- Line Master
ALTER TABLE IF EXISTS lines DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON lines;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON lines;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON lines;

-- Customer Master
ALTER TABLE IF EXISTS customer_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customer_master;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON customer_master;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON customer_master;

-- Vendor Master
ALTER TABLE IF EXISTS vendor_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON vendor_master;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON vendor_master;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON vendor_master;

-- Vendor Registration (VRF)
ALTER TABLE IF EXISTS purchase_vendor_registration DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON purchase_vendor_registration;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON purchase_vendor_registration;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on vendor_registration" ON purchase_vendor_registration;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON purchase_vendor_registration;

-- Others Master (Party Names, Color Labels, etc.)
ALTER TABLE IF EXISTS party_name_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON party_name_master;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON party_name_master;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON party_name_master;

ALTER TABLE IF EXISTS color_labels DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON color_labels;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON color_labels;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON color_labels;

-- Units table (if it exists)
ALTER TABLE IF EXISTS units DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON units;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON units;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON units;

-- Grant full permissions to authenticated and anon users
GRANT ALL ON TABLE machines TO authenticated;
GRANT ALL ON TABLE machines TO anon;

GRANT ALL ON TABLE molds TO authenticated;
GRANT ALL ON TABLE molds TO anon;

GRANT ALL ON TABLE raw_materials TO authenticated;
GRANT ALL ON TABLE raw_materials TO anon;

GRANT ALL ON TABLE packing_materials TO authenticated;
GRANT ALL ON TABLE packing_materials TO anon;

GRANT ALL ON TABLE lines TO authenticated;
GRANT ALL ON TABLE lines TO anon;

GRANT ALL ON TABLE customer_master TO authenticated;
GRANT ALL ON TABLE customer_master TO anon;

GRANT ALL ON TABLE vendor_master TO authenticated;
GRANT ALL ON TABLE vendor_master TO anon;

GRANT ALL ON TABLE purchase_vendor_registration TO authenticated;
GRANT ALL ON TABLE purchase_vendor_registration TO anon;

GRANT ALL ON TABLE party_name_master TO authenticated;
GRANT ALL ON TABLE party_name_master TO anon;

GRANT ALL ON TABLE color_labels TO authenticated;
GRANT ALL ON TABLE color_labels TO anon;

GRANT ALL ON TABLE units TO authenticated;
GRANT ALL ON TABLE units TO anon;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'RLS disabled on all master tables';
END $$;
