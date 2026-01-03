-- ============================================================================
-- DISABLE RLS - Remove policies and disable RLS (user has custom permissions)
-- ============================================================================
-- This disables RLS on all tables since the application uses custom authentication
-- Similar to party_name_master, color_label_master, and other tables in the system
-- ============================================================================

-- ============================================================================
-- PURCHASE TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users on vendor_registration" ON purchase_vendor_registration;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on material_indent_slip" ON purchase_material_indent_slip;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on material_indent_slip_items" ON purchase_material_indent_slip_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on purchase_order" ON purchase_purchase_order;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on purchase_order_items" ON purchase_purchase_order_items;

-- ============================================================================
-- STORE TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_grn" ON store_grn;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_grn_items" ON store_grn_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_mis" ON store_mis;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_mis_items" ON store_mis_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_fgn" ON store_fgn;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_fgn_items" ON store_fgn_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_job_work_challan" ON store_job_work_challan;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on store_job_work_challan_items" ON store_job_work_challan_items;

-- ============================================================================
-- JW ANNEXURE GRN TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users on jw_annexure_grn" ON store_jw_annexure_grn;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on jw_annexure_grn_items" ON store_jw_annexure_grn_items;

-- ============================================================================
-- DISPATCH TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users on dispatch_memo" ON dispatch_dispatch_memo;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on dispatch_memo_items" ON dispatch_dispatch_memo_items;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on delivery_challan" ON dispatch_delivery_challan;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on delivery_challan_items" ON dispatch_delivery_challan_items;

-- ============================================================================
-- DISABLE RLS ON ALL TABLES
-- ============================================================================

-- Purchase tables
ALTER TABLE purchase_vendor_registration DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_material_indent_slip DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_material_indent_slip_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_purchase_order DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_purchase_order_items DISABLE ROW LEVEL SECURITY;

-- Store tables
ALTER TABLE store_grn DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_grn_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_mis DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_mis_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_fgn DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_fgn_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_job_work_challan DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_job_work_challan_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_jw_annexure_grn DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_jw_annexure_grn_items DISABLE ROW LEVEL SECURITY;

-- Dispatch tables
ALTER TABLE dispatch_dispatch_memo DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_dispatch_memo_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_delivery_challan DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_delivery_challan_items DISABLE ROW LEVEL SECURITY;

