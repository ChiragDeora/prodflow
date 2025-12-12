-- POPULATE RBAC SYSTEM WITH CORRECT SCHEMA
-- Based on your actual table structure

-- =====================================================
-- 1. ADD DEPARTMENT TO USERS
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

-- Add department column to users table
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
-- 2. POPULATE RESOURCES (using actual schema: id, name, description, table_name)
-- =====================================================

-- Clear existing resources first
DELETE FROM auth_resources;

-- STORE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name) VALUES
-- Store Module Resources
('store-grn-resource', 'Goods Receipt Note (GRN)', 'Inward goods receipt management', 'store_grn'),
('store-fgn-resource', 'Finished Goods Note (FGN)', 'Finished goods management', 'store_fgn'),
('store-mis-resource', 'Material Issue Slip (MIS)', 'Material issue management', 'store_mis'),
('store-jwc-resource', 'Job Work Challan', 'Job work challan management', 'store_job_work_challan');

-- PURCHASE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name) VALUES
('purchase-vrf-resource', 'Vendor Registration Form (VRF)', 'Vendor registration management', 'purchase_vendor_registration'),
('purchase-indent-resource', 'Material Indent Slip', 'Material indent management', 'purchase_material_indent_slip'),
('purchase-po-resource', 'Purchase Order (PO)', 'Purchase order management', 'purchase_purchase_order');

-- DISPATCH DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name) VALUES
('dispatch-challan-resource', 'Delivery Challan', 'Delivery challan management', 'dispatch_delivery_challan'),
('dispatch-memo-resource', 'Dispatch Memo', 'Dispatch memo management', 'dispatch_dispatch_memo');

-- PRODUCTION DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name) VALUES
('production-schedule-resource', 'Production Schedule', 'Job scheduling management', 'schedule_jobs'),
('production-weight-resource', 'Weight Reports', 'Daily weight report management', 'daily_weight_report'),
('production-first-pieces-resource', 'First Pieces Approval', 'First pieces approval management', 'first_pieces_approval_report');

-- MAINTENANCE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name) VALUES
('maintenance-checklist-resource', 'Maintenance Checklist', 'Maintenance checklist management', 'maintenance_checklists'),
('maintenance-task-resource', 'Maintenance Tasks', 'Maintenance task management', 'maintenance_tasks'),
('maintenance-history-resource', 'Maintenance History', 'Maintenance history tracking', 'maintenance_history');

-- PLANNING DEPARTMENT RESOURCES  
INSERT INTO auth_resources (id, name, description, table_name) VALUES
('planning-bom-fg-resource', 'Finished Goods BOM', 'FG BOM management', 'fg_bom'),
('planning-bom-sfg-resource', 'Semi-Finished Goods BOM', 'SFG BOM management', 'sfg_bom'),
('planning-bom-local-resource', 'Local BOM', 'Local BOM management', 'local_bom'),
('planning-assignments-resource', 'Line & Mold Assignments', 'Production line assignments', 'line_mold_assignments');

-- MASTER DATA RESOURCES
INSERT INTO auth_resources (id, name, description, table_name) VALUES
('master-machines-resource', 'Machine Master', 'Machine master data', 'machines'),
('master-molds-resource', 'Mold Master', 'Mold master data', 'molds'),
('master-lines-resource', 'Line Master', 'Production line master data', 'lines'),
('master-raw-materials-resource', 'Raw Materials Master', 'Raw materials master data', 'raw_materials'),
('master-packing-materials-resource', 'Packing Materials Master', 'Packing materials master data', 'packing_materials');

-- =====================================================
-- 3. CREATE PERMISSIONS FOR EACH RESOURCE
-- =====================================================

-- Clear existing permissions first
DELETE FROM auth_permissions;

-- Create permissions for each resource with all CRUD operations
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow) 
SELECT 
    r.id || '-create',
    'Create ' || r.name,
    'Permission to create ' || r.description,
    'create',
    'resource',
    r.id,
    true
FROM auth_resources r;

INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow) 
SELECT 
    r.id || '-read',
    'View ' || r.name,
    'Permission to view ' || r.description,
    'read',
    'resource',
    r.id,
    true
FROM auth_resources r;

INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow) 
SELECT 
    r.id || '-update',
    'Update ' || r.name,
    'Permission to update ' || r.description,
    'update',
    'resource',
    r.id,
    true
FROM auth_resources r;

INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow) 
SELECT 
    r.id || '-delete',
    'Delete ' || r.name,
    'Permission to delete ' || r.description,
    'delete',
    'resource',
    r.id,
    true
FROM auth_resources r;

-- Add special approve permissions for relevant resources
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow) VALUES
('production-first-pieces-resource-approve', 'Approve First Pieces', 'Permission to approve first pieces', 'approve', 'resource', 'production-first-pieces-resource', true),
('purchase-po-resource-approve', 'Approve Purchase Order', 'Permission to approve purchase orders', 'approve', 'resource', 'purchase-po-resource', true),
('purchase-indent-resource-approve', 'Approve Material Indent', 'Permission to approve material indents', 'approve', 'resource', 'purchase-indent-resource', true);

-- =====================================================
-- 4. CREATE DEPARTMENT-BASED ROLES
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
('planning-officer', 'Planning Officer', 'Basic planning operations access', true),
('admin', 'System Administrator', 'Full system access', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system_role = EXCLUDED.is_system_role;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to check user permissions (works with your schema)
CREATE OR REPLACE FUNCTION check_user_permission_simple(
    user_id_param UUID,
    resource_name_param VARCHAR,
    action_param VARCHAR
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
        JOIN auth_resources r ON p.resource_id = r.id
        WHERE up.user_id = user_id_param 
        AND r.name = resource_name_param
        AND p.action = action_param
        AND up.is_active = true
        AND COALESCE(p.is_allow, true) = true
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_all_permissions(user_id_param UUID)
RETURNS TABLE(
    resource_name VARCHAR,
    table_name VARCHAR,
    action VARCHAR,
    permission_name VARCHAR,
    department VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.name as resource_name,
        r.table_name,
        p.action::VARCHAR,
        p.name as permission_name,
        u.department::VARCHAR
    FROM auth_system.auth_users u
    JOIN auth_user_permissions up ON u.id = up.user_id
    JOIN auth_permissions p ON up.permission_id = p.id
    JOIN auth_resources r ON p.resource_id = r.id
    WHERE u.id = user_id_param
    AND up.is_active = true
    AND COALESCE(p.is_allow, true) = true
    ORDER BY r.name, p.action;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================
SELECT 'VERIFICATION RESULTS' as info;

SELECT 'Resources Created' as type, COUNT(*) as count FROM auth_resources;
SELECT 'Permissions Created' as type, COUNT(*) as count FROM auth_permissions;
SELECT 'Roles Created' as type, COUNT(*) as count FROM auth_roles;

-- Show department structure
SELECT 
    'DEPARTMENT MAPPING' as info,
    r.name as resource_name,
    r.table_name,
    COUNT(p.id) as permission_count
FROM auth_resources r
LEFT JOIN auth_permissions p ON r.id = p.resource_id
GROUP BY r.name, r.table_name
ORDER BY r.name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RBAC System populated successfully with your actual table schema!';
    RAISE NOTICE '📊 Resources created for all your business tables';
    RAISE NOTICE '🔐 Permissions created for CRUD operations';
    RAISE NOTICE '👥 Department-based roles created';
    RAISE NOTICE '👑 Yogesh Deora set as root admin';
    RAISE NOTICE '🎯 Ready for per-user permission assignment!';
END $$;
