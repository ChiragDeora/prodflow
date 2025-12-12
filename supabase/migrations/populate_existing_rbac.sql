-- POPULATE EXISTING RBAC SYSTEM WITH YOUR ACTUAL BUSINESS DATA
-- Since auth tables already exist, we just need to populate them

-- =====================================================
-- 1. CHECK CURRENT RBAC DATA
-- =====================================================
SELECT 'Current Resources Count' as info, COUNT(*) as count FROM auth_resources;
SELECT 'Current Permissions Count' as info, COUNT(*) as count FROM auth_permissions;
SELECT 'Current Roles Count' as info, COUNT(*) as count FROM auth_roles;

-- =====================================================
-- 2. ADD DEPARTMENT TO USERS IF NOT EXISTS
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

-- Add department column to users table (check both locations)
DO $$
BEGIN
    -- Try auth_system.auth_users first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth_system' AND table_name = 'auth_users') THEN
        ALTER TABLE auth_system.auth_users ADD COLUMN IF NOT EXISTS department department_type;
        ALTER TABLE auth_system.auth_users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
        
        -- Update Yogesh as root admin
        UPDATE auth_system.auth_users 
        SET 
            department = 'admin',
            job_title = 'Chief Executive Officer & Root Administrator',
            is_root_admin = true,
            updated_at = NOW()
        WHERE email = 'yogesh@polypacks.in' OR id = '00000000-0000-0000-0000-000000000001';
        
        -- Recreate public view if it exists
        DROP VIEW IF EXISTS public.auth_users;
        CREATE VIEW public.auth_users AS SELECT * FROM auth_system.auth_users;
        
    ELSE
        -- Try public.auth_users
        ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS department department_type;
        ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
        
        -- Update Yogesh as root admin
        UPDATE public.auth_users 
        SET 
            department = 'admin',
            job_title = 'Chief Executive Officer & Root Administrator',
            is_root_admin = true,
            updated_at = NOW()
        WHERE email = 'yogesh@polypacks.in' OR id = '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;

-- =====================================================
-- 3. CLEAR AND POPULATE RESOURCES BASED ON YOUR TABLES
-- =====================================================

-- Clear existing resources (keep only if they have active permissions)
DELETE FROM auth_resources WHERE id NOT IN (
    SELECT DISTINCT resource_id FROM auth_permissions WHERE resource_id IS NOT NULL
);

-- STORE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
-- Store Module
('store-module', 'Store Operations', 'Store inventory and goods management', 'module', NULL),
('store-grn', 'Goods Receipt Note (GRN)', 'Inward goods receipt management from store_grn table', 'feature', 'store-module'),
('store-grn-create', 'Create GRN', 'Create new goods receipt note', 'action', 'store-grn'),
('store-grn-read', 'View GRN', 'View goods receipt notes', 'action', 'store-grn'),
('store-grn-update', 'Update GRN', 'Modify goods receipt notes', 'action', 'store-grn'),
('store-grn-delete', 'Delete GRN', 'Delete goods receipt notes', 'action', 'store-grn'),

('store-fgn', 'Finished Goods Note (FGN)', 'Finished goods management from store_fgn table', 'feature', 'store-module'),
('store-fgn-create', 'Create FGN', 'Create finished goods note', 'action', 'store-fgn'),
('store-fgn-read', 'View FGN', 'View finished goods notes', 'action', 'store-fgn'),
('store-fgn-update', 'Update FGN', 'Modify finished goods notes', 'action', 'store-fgn'),

('store-mis', 'Material Issue Slip (MIS)', 'Material issue management from store_mis table', 'feature', 'store-module'),
('store-mis-create', 'Create MIS', 'Create material issue slip', 'action', 'store-mis'),
('store-mis-read', 'View MIS', 'View material issue slips', 'action', 'store-mis'),
('store-mis-update', 'Update MIS', 'Modify material issue slips', 'action', 'store-mis'),

('store-jwc', 'Job Work Challan', 'Job work challan management from store_job_work_challan table', 'feature', 'store-module'),
('store-jwc-create', 'Create Job Work Challan', 'Create job work challan', 'action', 'store-jwc'),
('store-jwc-read', 'View Job Work Challan', 'View job work challans', 'action', 'store-jwc'),
('store-jwc-update', 'Update Job Work Challan', 'Modify job work challans', 'action', 'store-jwc')

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource_type = EXCLUDED.resource_type,
    parent_id = EXCLUDED.parent_id;

-- PURCHASE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('purchase-module', 'Purchase Operations', 'Purchase and vendor management', 'module', NULL),
('purchase-vrf', 'Vendor Registration Form (VRF)', 'Vendor registration from purchase_vendor_registration table', 'feature', 'purchase-module'),
('purchase-vrf-create', 'Create VRF', 'Create vendor registration', 'action', 'purchase-vrf'),
('purchase-vrf-read', 'View VRF', 'View vendor registrations', 'action', 'purchase-vrf'),
('purchase-vrf-update', 'Update VRF', 'Modify vendor registrations', 'action', 'purchase-vrf'),

('purchase-indent', 'Material Indent Slip', 'Material indent from purchase_material_indent_slip table', 'feature', 'purchase-module'),
('purchase-indent-create', 'Create Indent', 'Create material indent', 'action', 'purchase-indent'),
('purchase-indent-read', 'View Indent', 'View material indents', 'action', 'purchase-indent'),
('purchase-indent-update', 'Update Indent', 'Modify material indents', 'action', 'purchase-indent'),

('purchase-po', 'Purchase Order (PO)', 'Purchase order from purchase_purchase_order table', 'feature', 'purchase-module'),
('purchase-po-create', 'Create PO', 'Create purchase order', 'action', 'purchase-po'),
('purchase-po-read', 'View PO', 'View purchase orders', 'action', 'purchase-po'),
('purchase-po-update', 'Update PO', 'Modify purchase orders', 'action', 'purchase-po')

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource_type = EXCLUDED.resource_type,
    parent_id = EXCLUDED.parent_id;

-- DISPATCH DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('dispatch-module', 'Dispatch Operations', 'Dispatch and delivery management', 'module', NULL),
('dispatch-challan', 'Delivery Challan', 'Delivery challan from dispatch_delivery_challan table', 'feature', 'dispatch-module'),
('dispatch-challan-create', 'Create Delivery Challan', 'Create delivery challan', 'action', 'dispatch-challan'),
('dispatch-challan-read', 'View Delivery Challan', 'View delivery challans', 'action', 'dispatch-challan'),
('dispatch-challan-update', 'Update Delivery Challan', 'Modify delivery challans', 'action', 'dispatch-challan'),

('dispatch-memo', 'Dispatch Memo', 'Dispatch memo from dispatch_dispatch_memo table', 'feature', 'dispatch-module'),
('dispatch-memo-create', 'Create Dispatch Memo', 'Create dispatch memo', 'action', 'dispatch-memo'),
('dispatch-memo-read', 'View Dispatch Memo', 'View dispatch memos', 'action', 'dispatch-memo'),
('dispatch-memo-update', 'Update Dispatch Memo', 'Modify dispatch memos', 'action', 'dispatch-memo')

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource_type = EXCLUDED.resource_type,
    parent_id = EXCLUDED.parent_id;

-- PRODUCTION DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('production-module', 'Production Operations', 'Production planning and monitoring', 'module', NULL),
('production-schedule', 'Production Schedule', 'Job scheduling from schedule_jobs table', 'feature', 'production-module'),
('production-schedule-create', 'Create Schedule', 'Create production schedule', 'action', 'production-schedule'),
('production-schedule-read', 'View Schedule', 'View production schedules', 'action', 'production-schedule'),
('production-schedule-update', 'Update Schedule', 'Modify production schedules', 'action', 'production-schedule'),

('production-weight', 'Weight Reports', 'Daily weight reports from daily_weight_report table', 'feature', 'production-module'),
('production-weight-create', 'Create Weight Report', 'Create weight reports', 'action', 'production-weight'),
('production-weight-read', 'View Weight Report', 'View weight reports', 'action', 'production-weight'),
('production-weight-update', 'Update Weight Report', 'Modify weight reports', 'action', 'production-weight'),

('production-first-pieces', 'First Pieces Approval', 'First pieces from first_pieces_approval_report table', 'feature', 'production-module'),
('production-first-pieces-create', 'Create First Pieces', 'Create first pieces report', 'action', 'production-first-pieces'),
('production-first-pieces-read', 'View First Pieces', 'View first pieces reports', 'action', 'production-first-pieces'),
('production-first-pieces-approve', 'Approve First Pieces', 'Approve first pieces', 'action', 'production-first-pieces')

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource_type = EXCLUDED.resource_type,
    parent_id = EXCLUDED.parent_id;

-- MAINTENANCE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('maintenance-module', 'Maintenance Operations', 'Equipment maintenance management', 'module', NULL),
('maintenance-checklist', 'Maintenance Checklist', 'Checklists from maintenance_checklists table', 'feature', 'maintenance-module'),
('maintenance-checklist-create', 'Create Checklist', 'Create maintenance checklist', 'action', 'maintenance-checklist'),
('maintenance-checklist-read', 'View Checklist', 'View maintenance checklists', 'action', 'maintenance-checklist'),
('maintenance-checklist-update', 'Update Checklist', 'Modify maintenance checklists', 'action', 'maintenance-checklist'),

('maintenance-task', 'Maintenance Tasks', 'Tasks from maintenance_tasks table', 'feature', 'maintenance-module'),
('maintenance-task-create', 'Create Task', 'Create maintenance task', 'action', 'maintenance-task'),
('maintenance-task-read', 'View Task', 'View maintenance tasks', 'action', 'maintenance-task'),
('maintenance-task-update', 'Update Task', 'Modify maintenance tasks', 'action', 'maintenance-task')

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource_type = EXCLUDED.resource_type,
    parent_id = EXCLUDED.parent_id;

-- PLANNING DEPARTMENT RESOURCES  
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('planning-module', 'Planning Operations', 'BOM and production planning', 'module', NULL),
('planning-bom-fg', 'Finished Goods BOM', 'FG BOM from fg_bom table', 'feature', 'planning-module'),
('planning-bom-fg-create', 'Create FG BOM', 'Create finished goods BOM', 'action', 'planning-bom-fg'),
('planning-bom-fg-read', 'View FG BOM', 'View finished goods BOM', 'action', 'planning-bom-fg'),
('planning-bom-fg-update', 'Update FG BOM', 'Modify finished goods BOM', 'action', 'planning-bom-fg'),

('planning-bom-sfg', 'Semi-Finished Goods BOM', 'SFG BOM from sfg_bom table', 'feature', 'planning-module'),
('planning-bom-sfg-create', 'Create SFG BOM', 'Create semi-finished goods BOM', 'action', 'planning-bom-sfg'),
('planning-bom-sfg-read', 'View SFG BOM', 'View semi-finished goods BOM', 'action', 'planning-bom-sfg'),
('planning-bom-sfg-update', 'Update SFG BOM', 'Modify semi-finished goods BOM', 'action', 'planning-bom-sfg'),

('planning-assignments', 'Line & Mold Assignments', 'Assignments from line_mold_assignments table', 'feature', 'planning-module'),
('planning-assignments-create', 'Create Assignment', 'Create line/mold assignment', 'action', 'planning-assignments'),
('planning-assignments-read', 'View Assignment', 'View line/mold assignments', 'action', 'planning-assignments'),
('planning-assignments-update', 'Update Assignment', 'Modify line/mold assignments', 'action', 'planning-assignments')

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource_type = EXCLUDED.resource_type,
    parent_id = EXCLUDED.parent_id;

-- MASTER DATA RESOURCES
INSERT INTO auth_resources (id, name, description, resource_type, parent_id) VALUES
('master-module', 'Master Data', 'Master data management', 'module', NULL),
('master-machines', 'Machine Master', 'Machine data from machines table', 'feature', 'master-module'),
('master-machines-create', 'Create Machine', 'Create machine master', 'action', 'master-machines'),
('master-machines-read', 'View Machine', 'View machine master', 'action', 'master-machines'),
('master-machines-update', 'Update Machine', 'Modify machine master', 'action', 'master-machines'),

('master-molds', 'Mold Master', 'Mold data from molds table', 'feature', 'master-module'),
('master-molds-create', 'Create Mold', 'Create mold master', 'action', 'master-molds'),
('master-molds-read', 'View Mold', 'View mold master', 'action', 'master-molds'),
('master-molds-update', 'Update Mold', 'Modify mold master', 'action', 'master-molds'),

('master-materials', 'Materials Master', 'Raw and packing materials from raw_materials/packing_materials tables', 'feature', 'master-module'),
('master-materials-create', 'Create Material', 'Create material master', 'action', 'master-materials'),
('master-materials-read', 'View Material', 'View material master', 'action', 'master-materials'),
('master-materials-update', 'Update Material', 'Modify material master', 'action', 'master-materials')

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource_type = EXCLUDED.resource_type,
    parent_id = EXCLUDED.parent_id;

-- =====================================================
-- 4. CREATE PERMISSIONS FOR ALL ACTIONS
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
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    action = EXCLUDED.action,
    scope_level = EXCLUDED.scope_level,
    resource_id = EXCLUDED.resource_id;

-- =====================================================
-- 5. CREATE DEPARTMENT-BASED ROLES
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
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system_role = EXCLUDED.is_system_role;

-- =====================================================
-- 6. FINAL VERIFICATION
-- =====================================================
SELECT 'FINAL COUNTS' as info;
SELECT 'Resources Created' as type, COUNT(*) as count FROM auth_resources;
SELECT 'Permissions Created' as type, COUNT(*) as count FROM auth_permissions;
SELECT 'Roles Created' as type, COUNT(*) as count FROM auth_roles;

-- Show department structure
SELECT 
    'DEPARTMENT STRUCTURE' as info,
    r1.name as module,
    r2.name as feature,
    r3.name as action
FROM auth_resources r1
LEFT JOIN auth_resources r2 ON r2.parent_id = r1.id AND r2.resource_type = 'feature'
LEFT JOIN auth_resources r3 ON r3.parent_id = r2.id AND r3.resource_type = 'action'
WHERE r1.resource_type = 'module'
ORDER BY r1.name, r2.name, r3.name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RBAC System populated with your actual database structure!';
    RAISE NOTICE '📊 Departments: store, purchase, dispatch, production, maintenance, planning, admin';
    RAISE NOTICE '🏗️ Resources created for all your existing tables';
    RAISE NOTICE '👑 Yogesh Deora set as root admin';
    RAISE NOTICE '🎯 Ready for per-user permission assignment in Admin Dashboard!';
END $$;
