-- POPULATE RBAC SYSTEM WITH PROPER UUIDs
-- Fixed to use UUID format for all ID columns

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
-- 2. POPULATE RESOURCES WITH PROPER UUIDs
-- =====================================================

-- Clear existing resources first
DELETE FROM auth_resources;

-- STORE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name, created_at) VALUES
(gen_random_uuid(), 'Goods Receipt Note (GRN)', 'Inward goods receipt management', 'store_grn', NOW()),
(gen_random_uuid(), 'Finished Goods Note (FGN)', 'Finished goods management', 'store_fgn', NOW()),
(gen_random_uuid(), 'Material Issue Slip (MIS)', 'Material issue management', 'store_mis', NOW()),
(gen_random_uuid(), 'Job Work Challan', 'Job work challan management', 'store_job_work_challan', NOW());

-- PURCHASE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name, created_at) VALUES
(gen_random_uuid(), 'Vendor Registration Form (VRF)', 'Vendor registration management', 'purchase_vendor_registration', NOW()),
(gen_random_uuid(), 'Material Indent Slip', 'Material indent management', 'purchase_material_indent_slip', NOW()),
(gen_random_uuid(), 'Purchase Order (PO)', 'Purchase order management', 'purchase_purchase_order', NOW());

-- DISPATCH DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name, created_at) VALUES
(gen_random_uuid(), 'Delivery Challan', 'Delivery challan management', 'dispatch_delivery_challan', NOW()),
(gen_random_uuid(), 'Dispatch Memo', 'Dispatch memo management', 'dispatch_dispatch_memo', NOW());

-- PRODUCTION DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name, created_at) VALUES
(gen_random_uuid(), 'Production Schedule', 'Job scheduling management', 'schedule_jobs', NOW()),
(gen_random_uuid(), 'Weight Reports', 'Daily weight report management', 'daily_weight_report', NOW()),
(gen_random_uuid(), 'First Pieces Approval', 'First pieces approval management', 'first_pieces_approval_report', NOW());

-- MAINTENANCE DEPARTMENT RESOURCES
INSERT INTO auth_resources (id, name, description, table_name, created_at) VALUES
(gen_random_uuid(), 'Maintenance Checklist', 'Maintenance checklist management', 'maintenance_checklists', NOW()),
(gen_random_uuid(), 'Maintenance Tasks', 'Maintenance task management', 'maintenance_tasks', NOW()),
(gen_random_uuid(), 'Maintenance History', 'Maintenance history tracking', 'maintenance_history', NOW());

-- PLANNING DEPARTMENT RESOURCES  
INSERT INTO auth_resources (id, name, description, table_name, created_at) VALUES
(gen_random_uuid(), 'Finished Goods BOM', 'FG BOM management', 'fg_bom', NOW()),
(gen_random_uuid(), 'Semi-Finished Goods BOM', 'SFG BOM management', 'sfg_bom', NOW()),
(gen_random_uuid(), 'Local BOM', 'Local BOM management', 'local_bom', NOW()),
(gen_random_uuid(), 'Line & Mold Assignments', 'Production line assignments', 'line_mold_assignments', NOW());

-- MASTER DATA RESOURCES
INSERT INTO auth_resources (id, name, description, table_name, created_at) VALUES
(gen_random_uuid(), 'Machine Master', 'Machine master data', 'machines', NOW()),
(gen_random_uuid(), 'Mold Master', 'Mold master data', 'molds', NOW()),
(gen_random_uuid(), 'Line Master', 'Production line master data', 'lines', NOW()),
(gen_random_uuid(), 'Raw Materials Master', 'Raw materials master data', 'raw_materials', NOW()),
(gen_random_uuid(), 'Packing Materials Master', 'Packing materials master data', 'packing_materials', NOW());

-- =====================================================
-- 3. CREATE PERMISSIONS FOR EACH RESOURCE
-- =====================================================

-- Clear existing permissions first
DELETE FROM auth_permissions;

-- Create CREATE permissions
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow, created_at) 
SELECT 
    gen_random_uuid(),
    'Create ' || r.name,
    'Permission to create ' || r.description,
    'create',
    'resource',
    r.id,
    true,
    NOW()
FROM auth_resources r;

-- Create READ permissions
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow, created_at) 
SELECT 
    gen_random_uuid(),
    'View ' || r.name,
    'Permission to view ' || r.description,
    'read',
    'resource',
    r.id,
    true,
    NOW()
FROM auth_resources r;

-- Create UPDATE permissions
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow, created_at) 
SELECT 
    gen_random_uuid(),
    'Update ' || r.name,
    'Permission to update ' || r.description,
    'update',
    'resource',
    r.id,
    true,
    NOW()
FROM auth_resources r;

-- Create DELETE permissions
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow, created_at) 
SELECT 
    gen_random_uuid(),
    'Delete ' || r.name,
    'Permission to delete ' || r.description,
    'delete',
    'resource',
    r.id,
    true,
    NOW()
FROM auth_resources r;

-- Add special APPROVE permissions for relevant resources
INSERT INTO auth_permissions (id, name, description, action, scope_level, resource_id, is_allow, created_at) 
SELECT 
    gen_random_uuid(),
    'Approve ' || r.name,
    'Permission to approve ' || r.description,
    'approve',
    'resource',
    r.id,
    true,
    NOW()
FROM auth_resources r
WHERE r.table_name IN ('first_pieces_approval_report', 'purchase_purchase_order', 'purchase_material_indent_slip');

-- =====================================================
-- 4. CREATE DEPARTMENT-BASED ROLES
-- =====================================================
INSERT INTO auth_roles (id, name, description, is_system_role) VALUES
(gen_random_uuid(), 'Store Manager', 'Full access to store operations', true),
(gen_random_uuid(), 'Store Clerk', 'Basic store operations access', true),
(gen_random_uuid(), 'Purchase Manager', 'Full access to purchase operations', true),
(gen_random_uuid(), 'Purchase Officer', 'Basic purchase operations access', true),
(gen_random_uuid(), 'Dispatch Manager', 'Full access to dispatch operations', true),
(gen_random_uuid(), 'Dispatch Clerk', 'Basic dispatch operations access', true),
(gen_random_uuid(), 'Production Manager', 'Full access to production operations', true),
(gen_random_uuid(), 'Production Supervisor', 'Production monitoring access', true),
(gen_random_uuid(), 'Maintenance Manager', 'Full access to maintenance operations', true),
(gen_random_uuid(), 'Maintenance Technician', 'Basic maintenance operations access', true),
(gen_random_uuid(), 'Planning Manager', 'Full access to planning operations', true),
(gen_random_uuid(), 'Planning Officer', 'Basic planning operations access', true),
(gen_random_uuid(), 'System Administrator', 'Full system access', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_system_role = EXCLUDED.is_system_role;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to check user permissions (works with your schema)
CREATE OR REPLACE FUNCTION check_user_permission_simple(
    user_id_param UUID,
    table_name_param VARCHAR,
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
        AND r.table_name = table_name_param
        AND p.action = action_param
        AND COALESCE(up.is_active, true) = true
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
        r.name::VARCHAR as resource_name,
        r.table_name::VARCHAR,
        p.action::VARCHAR,
        p.name::VARCHAR as permission_name,
        u.department::VARCHAR
    FROM auth_system.auth_users u
    JOIN auth_user_permissions up ON u.id = up.user_id
    JOIN auth_permissions p ON up.permission_id = p.id
    JOIN auth_resources r ON p.resource_id = r.id
    WHERE u.id = user_id_param
    AND COALESCE(up.is_active, true) = true
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

-- Show sample permissions
SELECT 
    'SAMPLE PERMISSIONS' as info,
    r.table_name,
    p.action,
    p.name as permission_name
FROM auth_resources r
JOIN auth_permissions p ON r.id = p.resource_id
ORDER BY r.table_name, p.action
LIMIT 20;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RBAC System populated successfully with proper UUIDs!';
    RAISE NOTICE '📊 Resources created for all your business tables';
    RAISE NOTICE '🔐 Permissions created for CRUD operations';
    RAISE NOTICE '👥 Department-based roles created';
    RAISE NOTICE '👑 Yogesh Deora set as root admin';
    RAISE NOTICE '🎯 Ready for per-user permission assignment!';
END $$;
