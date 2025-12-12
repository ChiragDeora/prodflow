-- RBAC SETUP BASED ON YOUR ACTUAL DATABASE STRUCTURE
-- Built from your real table structure analysis

-- =====================================================
-- DEPARTMENT MAPPING BASED ON YOUR ACTUAL TABLES
-- =====================================================

-- 🏪 STORE DEPARTMENT TABLES:
-- - store_grn, store_grn_items (Goods Receipt Note)
-- - store_fgn, store_fgn_items (Finished Goods Note) 
-- - store_mis, store_mis_items (Material Issue Slip)
-- - store_job_work_challan, store_job_work_challan_items

-- 📦 PURCHASE DEPARTMENT TABLES:
-- - purchase_vendor_registration (VRF)
-- - purchase_material_indent_slip, purchase_material_indent_slip_items
-- - purchase_purchase_order, purchase_purchase_order_items

-- 🚚 DISPATCH DEPARTMENT TABLES:
-- - dispatch_delivery_challan, dispatch_delivery_challan_items
-- - dispatch_dispatch_memo, dispatch_dispatch_memo_items

-- 🏭 PRODUCTION DEPARTMENT TABLES:
-- - schedule_jobs
-- - daily_weight_report, daily_weight_report_summary
-- - weight_entries
-- - first_pieces_approval_report

-- ⚙️ MASTER DATA TABLES:
-- - machines
-- - molds  
-- - lines
-- - raw_materials
-- - packing_materials
-- - units, unit_management_settings

-- 🔧 MAINTENANCE DEPARTMENT TABLES:
-- - maintenance_checklists
-- - maintenance_history
-- - maintenance_schedules
-- - maintenance_tasks

-- 📋 BOM/PLANNING TABLES:
-- - fg_bom, fg_bom_versions, fg_bom_with_versions (Finished Goods BOM)
-- - sfg_bom, sfg_bom_versions, sfg_bom_with_versions (Semi-Finished Goods BOM)
-- - local_bom, local_bom_versions, local_bom_with_versions
-- - line_mold_assignments
-- - active_mold_assignments

-- =====================================================
-- 1. CREATE DEPARTMENT ENUM BASED ON YOUR STRUCTURE
-- =====================================================
DO $$ BEGIN
    CREATE TYPE department_type AS ENUM (
        'store',           -- Store operations (GRN, FGN, MIS, Job Work Challan)
        'purchase',        -- Purchase operations (VRF, Indent, PO)
        'dispatch',        -- Dispatch operations (Delivery Challan, Dispatch Memo)
        'production',      -- Production (Schedule, Weight Reports, First Pieces)
        'maintenance',     -- Maintenance (Checklists, Tasks, History)
        'planning',        -- BOM Management & Planning
        'admin'            -- System administration
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. ADD DEPARTMENT TO USERS (IF NOT EXISTS)
-- =====================================================
ALTER TABLE auth_system.auth_users ADD COLUMN IF NOT EXISTS department department_type;
ALTER TABLE auth_system.auth_users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- Recreate public view
DROP VIEW IF EXISTS public.auth_users;
CREATE VIEW public.auth_users AS SELECT * FROM auth_system.auth_users;

-- =====================================================
-- 3. SEED RESOURCES BASED ON YOUR ACTUAL TABLES
-- =====================================================

-- Clear existing resources first
DELETE FROM auth_resources WHERE id NOT IN (
    SELECT DISTINCT resource_id FROM auth_permissions WHERE resource_id IS NOT NULL
);

-- STORE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
-- Store Module
('store-module', 'Store Operations', 'Store inventory and goods management', 'module', NULL),
('store-grn', 'Goods Receipt Note (GRN)', 'Inward goods receipt management', 'feature', 'store-module'),
('store-grn-create', 'Create GRN', 'Create new goods receipt note', 'action', 'store-grn'),
('store-grn-read', 'View GRN', 'View goods receipt notes', 'action', 'store-grn'),
('store-grn-update', 'Update GRN', 'Modify goods receipt notes', 'action', 'store-grn'),
('store-grn-delete', 'Delete GRN', 'Delete goods receipt notes', 'action', 'store-grn'),

('store-fgn', 'Finished Goods Note (FGN)', 'Finished goods management', 'feature', 'store-module'),
('store-fgn-create', 'Create FGN', 'Create finished goods note', 'action', 'store-fgn'),
('store-fgn-read', 'View FGN', 'View finished goods notes', 'action', 'store-fgn'),
('store-fgn-update', 'Update FGN', 'Modify finished goods notes', 'action', 'store-fgn'),

('store-mis', 'Material Issue Slip (MIS)', 'Material issue management', 'feature', 'store-module'),
('store-mis-create', 'Create MIS', 'Create material issue slip', 'action', 'store-mis'),
('store-mis-read', 'View MIS', 'View material issue slips', 'action', 'store-mis'),
('store-mis-update', 'Update MIS', 'Modify material issue slips', 'action', 'store-mis'),

('store-jwc', 'Job Work Challan', 'Job work challan management', 'feature', 'store-module'),
('store-jwc-create', 'Create Job Work Challan', 'Create job work challan', 'action', 'store-jwc'),
('store-jwc-read', 'View Job Work Challan', 'View job work challans', 'action', 'store-jwc'),
('store-jwc-update', 'Update Job Work Challan', 'Modify job work challans', 'action', 'store-jwc');

-- PURCHASE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('purchase-module', 'Purchase Operations', 'Purchase and vendor management', 'module', NULL),
('purchase-vrf', 'Vendor Registration Form (VRF)', 'Vendor registration management', 'feature', 'purchase-module'),
('purchase-vrf-create', 'Create VRF', 'Create vendor registration', 'action', 'purchase-vrf'),
('purchase-vrf-read', 'View VRF', 'View vendor registrations', 'action', 'purchase-vrf'),
('purchase-vrf-update', 'Update VRF', 'Modify vendor registrations', 'action', 'purchase-vrf'),

('purchase-indent', 'Material Indent Slip', 'Material indent management', 'feature', 'purchase-module'),
('purchase-indent-create', 'Create Indent', 'Create material indent', 'action', 'purchase-indent'),
('purchase-indent-read', 'View Indent', 'View material indents', 'action', 'purchase-indent'),
('purchase-indent-update', 'Update Indent', 'Modify material indents', 'action', 'purchase-indent'),

('purchase-po', 'Purchase Order (PO)', 'Purchase order management', 'feature', 'purchase-module'),
('purchase-po-create', 'Create PO', 'Create purchase order', 'action', 'purchase-po'),
('purchase-po-read', 'View PO', 'View purchase orders', 'action', 'purchase-po'),
('purchase-po-update', 'Update PO', 'Modify purchase orders', 'action', 'purchase-po');

-- DISPATCH DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('dispatch-module', 'Dispatch Operations', 'Dispatch and delivery management', 'module', NULL),
('dispatch-challan', 'Delivery Challan', 'Delivery challan management', 'feature', 'dispatch-module'),
('dispatch-challan-create', 'Create Delivery Challan', 'Create delivery challan', 'action', 'dispatch-challan'),
('dispatch-challan-read', 'View Delivery Challan', 'View delivery challans', 'action', 'dispatch-challan'),
('dispatch-challan-update', 'Update Delivery Challan', 'Modify delivery challans', 'action', 'dispatch-challan'),

('dispatch-memo', 'Dispatch Memo', 'Dispatch memo management', 'feature', 'dispatch-module'),
('dispatch-memo-create', 'Create Dispatch Memo', 'Create dispatch memo', 'action', 'dispatch-memo'),
('dispatch-memo-read', 'View Dispatch Memo', 'View dispatch memos', 'action', 'dispatch-memo'),
('dispatch-memo-update', 'Update Dispatch Memo', 'Modify dispatch memos', 'action', 'dispatch-memo');

-- PRODUCTION DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('production-module', 'Production Operations', 'Production planning and monitoring', 'module', NULL),
('production-schedule', 'Production Schedule', 'Job scheduling management', 'feature', 'production-module'),
('production-schedule-create', 'Create Schedule', 'Create production schedule', 'action', 'production-schedule'),
('production-schedule-read', 'View Schedule', 'View production schedules', 'action', 'production-schedule'),
('production-schedule-update', 'Update Schedule', 'Modify production schedules', 'action', 'production-schedule'),

('production-weight', 'Weight Reports', 'Daily weight report management', 'feature', 'production-module'),
('production-weight-create', 'Create Weight Report', 'Create weight reports', 'action', 'production-weight'),
('production-weight-read', 'View Weight Report', 'View weight reports', 'action', 'production-weight'),
('production-weight-update', 'Update Weight Report', 'Modify weight reports', 'action', 'production-weight'),

('production-first-pieces', 'First Pieces Approval', 'First pieces approval management', 'feature', 'production-module'),
('production-first-pieces-create', 'Create First Pieces', 'Create first pieces report', 'action', 'production-first-pieces'),
('production-first-pieces-read', 'View First Pieces', 'View first pieces reports', 'action', 'production-first-pieces'),
('production-first-pieces-approve', 'Approve First Pieces', 'Approve first pieces', 'action', 'production-first-pieces');

-- MAINTENANCE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('maintenance-module', 'Maintenance Operations', 'Equipment maintenance management', 'module', NULL),
('maintenance-checklist', 'Maintenance Checklist', 'Maintenance checklist management', 'feature', 'maintenance-module'),
('maintenance-checklist-create', 'Create Checklist', 'Create maintenance checklist', 'action', 'maintenance-checklist'),
('maintenance-checklist-read', 'View Checklist', 'View maintenance checklists', 'action', 'maintenance-checklist'),
('maintenance-checklist-update', 'Update Checklist', 'Modify maintenance checklists', 'action', 'maintenance-checklist'),

('maintenance-task', 'Maintenance Tasks', 'Maintenance task management', 'feature', 'maintenance-module'),
('maintenance-task-create', 'Create Task', 'Create maintenance task', 'action', 'maintenance-task'),
('maintenance-task-read', 'View Task', 'View maintenance tasks', 'action', 'maintenance-task'),
('maintenance-task-update', 'Update Task', 'Modify maintenance tasks', 'action', 'maintenance-task');

-- PLANNING DEPARTMENT RESOURCES  
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('planning-module', 'Planning Operations', 'BOM and production planning', 'module', NULL),
('planning-bom-fg', 'Finished Goods BOM', 'FG BOM management', 'feature', 'planning-module'),
('planning-bom-fg-create', 'Create FG BOM', 'Create finished goods BOM', 'action', 'planning-bom-fg'),
('planning-bom-fg-read', 'View FG BOM', 'View finished goods BOM', 'action', 'planning-bom-fg'),
('planning-bom-fg-update', 'Update FG BOM', 'Modify finished goods BOM', 'action', 'planning-bom-fg'),

('planning-bom-sfg', 'Semi-Finished Goods BOM', 'SFG BOM management', 'feature', 'planning-module'),
('planning-bom-sfg-create', 'Create SFG BOM', 'Create semi-finished goods BOM', 'action', 'planning-bom-sfg'),
('planning-bom-sfg-read', 'View SFG BOM', 'View semi-finished goods BOM', 'action', 'planning-bom-sfg'),
('planning-bom-sfg-update', 'Update SFG BOM', 'Modify semi-finished goods BOM', 'action', 'planning-bom-sfg'),

('planning-assignments', 'Line & Mold Assignments', 'Production line assignments', 'feature', 'planning-module'),
('planning-assignments-create', 'Create Assignment', 'Create line/mold assignment', 'action', 'planning-assignments'),
('planning-assignments-read', 'View Assignment', 'View line/mold assignments', 'action', 'planning-assignments'),
('planning-assignments-update', 'Update Assignment', 'Modify line/mold assignments', 'action', 'planning-assignments');

-- MASTER DATA RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('master-module', 'Master Data', 'Master data management', 'module', NULL),
('master-machines', 'Machine Master', 'Machine master data', 'feature', 'master-module'),
('master-machines-create', 'Create Machine', 'Create machine master', 'action', 'master-machines'),
('master-machines-read', 'View Machine', 'View machine master', 'action', 'master-machines'),
('master-machines-update', 'Update Machine', 'Modify machine master', 'action', 'master-machines'),

('master-molds', 'Mold Master', 'Mold master data', 'feature', 'master-module'),
('master-molds-create', 'Create Mold', 'Create mold master', 'action', 'master-molds'),
('master-molds-read', 'View Mold', 'View mold master', 'action', 'master-molds'),
('master-molds-update', 'Update Mold', 'Modify mold master', 'action', 'master-molds'),

('master-materials', 'Materials Master', 'Raw and packing materials', 'feature', 'master-module'),
('master-materials-create', 'Create Material', 'Create material master', 'action', 'master-materials'),
('master-materials-read', 'View Material', 'View material master', 'action', 'master-materials'),
('master-materials-update', 'Update Material', 'Modify material master', 'action', 'master-materials');

-- =====================================================
-- 4. CREATE PERMISSIONS BASED ON RESOURCES
-- =====================================================
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id)
SELECT 
    r.id || '-permission',
    r.name || ' Permission',
    'Permission to ' || r.description,
    CASE 
        WHEN r.name LIKE '%Create%' THEN 'create'
        WHEN r.name LIKE '%View%' OR r.name LIKE '%Read%' THEN 'read'
        WHEN r.name LIKE '%Update%' OR r.name LIKE '%Modify%' THEN 'update'
        WHEN r.name LIKE '%Delete%' THEN 'delete'
        WHEN r.name LIKE '%Approve%' THEN 'approve'
        ELSE 'read'
    END,
    'resource',
    r.id
FROM auth_resources r
WHERE r.resource_type = 'action'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. UPDATE YOGESH AS ROOT ADMIN
-- =====================================================
UPDATE auth_system.auth_users 
SET 
    department = 'admin',
    job_title = 'Chief Executive Officer & Root Administrator',
    is_root_admin = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- 6. CREATE DEPARTMENT-BASED ROLES
-- =====================================================
INSERT INTO auth_roles (id, name, description, is_system_role) VALUES
('store-manager', 'Store Manager', 'Full access to store operations', true),
('store-clerk', 'Store Clerk', 'Basic store operations access', true),
('purchase-manager', 'Purchase Manager', 'Full access to purchase operations', true),
('purchase-officer', 'Purchase Officer', 'Basic purchase operations access', true),
('dispatch-manager', 'Dispatch Manager', 'Full access to dispatch operations', true),
('dispatch-clerk', 'Dispatch Clerk', 'Basic dispatch operations access', true),
('production-manager', 'Production Manager', 'Full access to production operations', true),
('production-supervisor', 'Production Supervisor', 'Production monitoring access', true),
('maintenance-manager', 'Maintenance Manager', 'Full access to maintenance operations', true),
('maintenance-technician', 'Maintenance Technician', 'Basic maintenance operations access', true),
('planning-manager', 'Planning Manager', 'Full access to planning operations', true),
('planning-officer', 'Planning Officer', 'Basic planning operations access', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission_detailed(
    user_id_param UUID,
    permission_name_param VARCHAR,
    resource_name_param VARCHAR DEFAULT NULL,
    field_name_param VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    is_root_admin BOOLEAN := FALSE;
BEGIN
    -- Check if user is root admin
    SELECT COALESCE(is_root_admin, false) INTO is_root_admin
    FROM auth_system.auth_users
    WHERE id = user_id_param;
    
    -- Root admin always has all permissions
    IF is_root_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Check direct user permissions
    SELECT EXISTS(
        SELECT 1 
        FROM auth_user_permissions up
        JOIN auth_permissions p ON up.permission_id = p.id
        WHERE up.user_id = user_id_param 
        AND p.name = permission_name_param
        AND up.is_allow = true
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's department-based permissions
CREATE OR REPLACE FUNCTION get_user_department_permissions(user_id_param UUID)
RETURNS TABLE(
    permission_name VARCHAR,
    resource_name VARCHAR,
    action VARCHAR,
    department VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as permission_name,
        r.name as resource_name,
        p.action,
        u.department::VARCHAR as department
    FROM auth_system.auth_users u
    JOIN auth_user_permissions up ON u.id = up.user_id
    JOIN auth_permissions p ON up.permission_id = p.id
    JOIN auth_resources r ON p.resource_id = r.id
    WHERE u.id = user_id_param
    AND up.is_allow = true
    ORDER BY r.name, p.action;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RBAC System setup complete based on your actual database structure!';
    RAISE NOTICE '📊 Departments: store, purchase, dispatch, production, maintenance, planning, admin';
    RAISE NOTICE '🏗️ Resources created based on your actual tables';
    RAISE NOTICE '👑 Yogesh Deora set as root admin with full access';
    RAISE NOTICE '🎯 Ready for per-user permission assignment!';
END $$;
