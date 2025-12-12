-- ============================================================================
-- SEED DEPARTMENTS AND RESOURCES FOR PERMISSION MATRIX
-- This migration populates the auth_resources table with departments and 
-- resources that will be displayed in the permission matrix
-- ============================================================================

-- Clear existing resources (optional - comment out if you want to keep existing)
-- DELETE FROM auth_system.auth_resources;

-- Ensure department column exists on the actual table
ALTER TABLE auth_system.auth_resources ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Recreate the view to include the department column
DROP VIEW IF EXISTS public.auth_resources;
CREATE VIEW public.auth_resources AS SELECT * FROM auth_system.auth_resources;

-- ============================================================================
-- STORE DEPARTMENT (with sub-departments: Purchase, Inward, Outward, Sales)
-- ============================================================================

-- Purchase Sub-Department
INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Purchase - Vendor Registration', 'Vendor registration and management', 'purchase_vendor_registration', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Purchase - Material Indent Slip', 'Material indent slip management', 'purchase_material_indent_slip', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Purchase - Purchase Order', 'Purchase order management', 'purchase_purchase_order', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Purchase - Open Indent', 'Open indent tracking and management', 'purchase_open_indent', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- Inward Sub-Department
INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Store - GRN (Goods Receipt Note)', 'Goods receipt note management', 'store_grn', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Store - FGN (Finished Goods Note)', 'Finished goods note management', 'store_fgn', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Store - JW GRN (Job Work GRN)', 'Job work goods receipt note', 'store_jw_grn', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Store - JW Annexure GRN', 'Job work annexure goods receipt note', 'store_jw_annexure_grn', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- Outward Sub-Department
INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Store - MIS (Material Issue Slip)', 'Material issue slip management', 'store_mis', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Store - Job Work Challan', 'Job work challan management', 'store_job_work_challan', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Dispatch - Delivery Challan', 'Delivery challan management', 'dispatch_delivery_challan', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- Sales Sub-Department
INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Dispatch - Dispatch Memo', 'Dispatch memo management', 'dispatch_dispatch_memo', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Order Book', 'Order book management', 'order_book', 'Store')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- PRODUCTION DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Production - Schedule', 'Production schedule management', 'schedule_jobs', 'Production')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Production - Daily Weight Report', 'Daily weight reporting', 'daily_weight_report', 'Production')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Production - First Pieces Approval', 'First pieces approval reporting', 'first_pieces_approval_report', 'Production')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Production Scheduler', 'Production scheduling system', 'scheduler', 'Production')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- COMMERCIAL MASTER DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Commercial Master - VRF', 'Vendor Receipt Form management', 'vrf', 'Commercial Master')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- MASTER DATA DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Master Data - Machines', 'Machine master data management', 'machines', 'Master Data')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Master Data - Molds', 'Mold master data management', 'molds', 'Master Data')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Master Data - Lines', 'Production lines master data', 'lines', 'Master Data')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Master Data - Raw Materials', 'Raw materials master data', 'raw_materials', 'Master Data')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Master Data - Packing Materials', 'Packing materials master data', 'packing_materials', 'Master Data')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Master Data - Customers', 'Customer master data', 'customer_master', 'Master Data')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Master Data - Vendors', 'Vendor master data', 'vendor_master', 'Master Data')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- QUALITY DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Quality Control', 'Quality control management', 'quality_control', 'Quality')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Quality - Incoming Inspection', 'Incoming quality inspection', 'incoming_inspection', 'Quality')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Quality - Container Inspection', 'Container quality inspection', 'container_inspection', 'Quality')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Quality - Corrective Action', 'Corrective action management', 'corrective_action', 'Quality')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- MAINTENANCE DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Maintenance Management', 'Maintenance operations management', 'maintenance_management', 'Maintenance')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Maintenance - Checklists', 'Maintenance checklist management', 'maintenance_checklists', 'Maintenance')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Maintenance - Tasks', 'Maintenance task management', 'maintenance_tasks', 'Maintenance')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Maintenance - History', 'Maintenance history tracking', 'maintenance_history', 'Maintenance')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- PLANNING DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Planning - Line Scheduling', 'Production line scheduling', 'line_scheduling', 'Planning')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- APPROVALS DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Approvals - Production', 'Production approvals', 'production_approvals', 'Approvals')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Approvals - Quality', 'Quality approvals', 'quality_approvals', 'Approvals')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Approvals - Store', 'Store & dispatch approvals', 'store_approvals', 'Approvals')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- REPORTS DEPARTMENT
-- ============================================================================

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Reports - Production', 'Production reports and analytics', 'production_reports', 'Reports')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Reports - Quality', 'Quality reports and analytics', 'quality_reports', 'Reports')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

INSERT INTO auth_system.auth_resources (name, description, table_name, department) VALUES
('Reports - Inventory', 'Inventory reports and analytics', 'inventory_reports', 'Reports')
ON CONFLICT (name) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    department = EXCLUDED.department;

-- ============================================================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_auth_resources_department ON auth_system.auth_resources(department);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count resources by department
SELECT 
    department,
    COUNT(*) as resource_count
FROM auth_resources
WHERE department IS NOT NULL
GROUP BY department
ORDER BY department;

-- Show all resources with their departments
SELECT 
    id,
    name,
    department,
    table_name
FROM auth_resources
WHERE department IS NOT NULL
ORDER BY department, name;

