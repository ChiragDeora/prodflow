-- ============================================================================
-- FIX MASTER TABLES RLS - DISABLE RLS FOR ALL MASTER DATA TABLES
-- ============================================================================
-- This migration ensures RLS is DISABLED on all master data tables
-- The application uses custom authentication, not Supabase Auth
-- So RLS would block all data access when using the anon key
-- ============================================================================

-- Disable RLS on machines table
ALTER TABLE IF EXISTS machines DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON machines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON machines;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON machines;

-- Disable RLS on molds table
ALTER TABLE IF EXISTS molds DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON molds;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON molds;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON molds;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON molds;

-- Disable RLS on raw_materials table
ALTER TABLE IF EXISTS raw_materials DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON raw_materials;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON raw_materials;

-- Disable RLS on packing_materials table
ALTER TABLE IF EXISTS packing_materials DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON packing_materials;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON packing_materials;

-- Disable RLS on lines table
ALTER TABLE IF EXISTS lines DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON lines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON lines;

-- Disable RLS on customer_master table
ALTER TABLE IF EXISTS customer_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON customer_master;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customer_master;

-- Disable RLS on vendor_master table
ALTER TABLE IF EXISTS vendor_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON vendor_master;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON vendor_master;

-- Disable RLS on party_name_master table
ALTER TABLE IF EXISTS party_name_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON party_name_master;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON party_name_master;

-- Disable RLS on color_labels table  
ALTER TABLE IF EXISTS color_labels DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON color_labels;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON color_labels;

-- Disable RLS on units table
ALTER TABLE IF EXISTS units DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON units;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON units;

-- Disable RLS on unit_management_settings table
ALTER TABLE IF EXISTS unit_management_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON unit_management_settings;

-- Disable RLS on bom_master table
ALTER TABLE IF EXISTS sfg_bom_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON sfg_bom_master;

-- Disable RLS on bom_versions table
ALTER TABLE IF EXISTS sfg_bom_versions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON sfg_bom_versions;

-- Disable RLS on bom_components table
ALTER TABLE IF EXISTS sfg_bom_components DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON sfg_bom_components;

-- Disable RLS on commercial master tables
ALTER TABLE IF EXISTS commercial_master DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON commercial_master;

-- Disable RLS on stock-related tables
ALTER TABLE IF EXISTS stock_items DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON stock_items;

ALTER TABLE IF EXISTS stock_balances DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON stock_balances;

ALTER TABLE IF EXISTS stock_ledger DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON stock_ledger;

-- Disable RLS on store/dispatch tables
ALTER TABLE IF EXISTS material_indent_slip DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS goods_receipt_note DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS material_issue_slip DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_work_challan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_challan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dispatch_memo DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_book DISABLE ROW LEVEL SECURITY;

-- Grant full access to both authenticated and anon roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify RLS status
DO $$
DECLARE
    tbl RECORD;
    rls_count INT := 0;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('machines', 'molds', 'raw_materials', 'packing_materials', 'lines', 'units')
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM pg_policies WHERE tablename = %L', tbl.tablename) INTO rls_count;
        IF rls_count > 0 THEN
            RAISE WARNING 'Table % still has % RLS policies', tbl.tablename, rls_count;
        ELSE
            RAISE NOTICE 'Table % has RLS disabled successfully', tbl.tablename;
        END IF;
    END LOOP;
END $$;

SELECT 'RLS DISABLED ON ALL MASTER TABLES - Users should now be able to see data' as status;

