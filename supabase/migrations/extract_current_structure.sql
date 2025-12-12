-- SQL QUERIES TO EXTRACT CURRENT APPLICATION STRUCTURE FOR RBAC SETUP
-- Run these queries to get the exact module structure from your database

-- =====================================================
-- 1. GET ALL EXISTING MODULES/RESOURCES
-- =====================================================
SELECT 
    'MODULES' as category,
    id,
    name,
    description,
    resource_type,
    parent_id,
    created_at
FROM auth_resources 
WHERE resource_type = 'module'
ORDER BY name;

-- =====================================================
-- 2. GET ALL FEATURES WITHIN MODULES
-- =====================================================
SELECT 
    'FEATURES' as category,
    f.id,
    f.name as feature_name,
    f.description as feature_description,
    m.name as module_name,
    f.resource_type,
    f.parent_id,
    f.created_at
FROM auth_resources f
LEFT JOIN auth_resources m ON f.parent_id = m.id
WHERE f.resource_type = 'feature'
ORDER BY m.name, f.name;

-- =====================================================
-- 3. GET ALL ACTIONS/PERMISSIONS
-- =====================================================
SELECT 
    'ACTIONS' as category,
    a.id,
    a.name as action_name,
    a.description as action_description,
    f.name as feature_name,
    m.name as module_name,
    a.resource_type,
    a.parent_id,
    a.created_at
FROM auth_resources a
LEFT JOIN auth_resources f ON a.parent_id = f.id
LEFT JOIN auth_resources m ON f.parent_id = m.id
WHERE a.resource_type = 'action'
ORDER BY m.name, f.name, a.name;

-- =====================================================
-- 4. GET ALL FIELD-LEVEL PERMISSIONS
-- =====================================================
SELECT 
    'FIELDS' as category,
    rf.id,
    rf.field_name,
    rf.field_type,
    rf.is_sensitive,
    rf.default_visibility,
    rf.default_editability,
    r.name as resource_name,
    r.resource_type,
    rf.created_at
FROM auth_resource_fields rf
LEFT JOIN auth_resources r ON rf.resource_id = r.id
ORDER BY r.name, rf.field_name;

-- =====================================================
-- 5. GET COMPLETE HIERARCHY (MODULES -> FEATURES -> ACTIONS)
-- =====================================================
WITH RECURSIVE resource_hierarchy AS (
    -- Base case: modules (top level)
    SELECT 
        id,
        name,
        description,
        resource_type,
        parent_id,
        0 as level,
        CAST(name AS TEXT) as path,
        CAST(id AS TEXT) as id_path
    FROM auth_resources 
    WHERE resource_type = 'module' AND parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: features and actions
    SELECT 
        r.id,
        r.name,
        r.description,
        r.resource_type,
        r.parent_id,
        rh.level + 1,
        rh.path || ' -> ' || r.name,
        rh.id_path || ' -> ' || r.id
    FROM auth_resources r
    JOIN resource_hierarchy rh ON r.parent_id = rh.id
)
SELECT 
    level,
    resource_type,
    name,
    description,
    path as full_hierarchy,
    id,
    parent_id
FROM resource_hierarchy
ORDER BY path, level;

-- =====================================================
-- 6. GET ALL EXISTING PERMISSIONS
-- =====================================================
SELECT 
    'PERMISSIONS' as category,
    p.id,
    p.name as permission_name,
    p.description,
    p.action,
    p.scope_level,
    r.name as resource_name,
    r.resource_type,
    p.created_at
FROM auth_permissions p
LEFT JOIN auth_resources r ON p.resource_id = r.id
ORDER BY r.name, p.action;

-- =====================================================
-- 7. GET ALL EXISTING ROLES
-- =====================================================
SELECT 
    'ROLES' as category,
    id,
    name as role_name,
    description,
    is_system_role,
    created_at
FROM auth_roles
ORDER BY name;

-- =====================================================
-- 8. GET CURRENT USER STRUCTURE
-- =====================================================
SELECT 
    'USERS' as category,
    id,
    email,
    full_name,
    department,
    job_title,
    is_root_admin,
    created_at
FROM auth_users
ORDER BY full_name;

-- =====================================================
-- 9. GET EXISTING USER PERMISSIONS
-- =====================================================
SELECT 
    'USER_PERMISSIONS' as category,
    up.user_id,
    u.full_name,
    u.email,
    p.name as permission_name,
    r.name as resource_name,
    up.is_allow,
    up.conditions,
    up.created_at
FROM auth_user_permissions up
LEFT JOIN auth_users u ON up.user_id = u.id
LEFT JOIN auth_permissions p ON up.permission_id = p.id
LEFT JOIN auth_resources r ON p.resource_id = r.id
ORDER BY u.full_name, r.name, p.name;

-- =====================================================
-- 10. GET TABLE STRUCTURE FOR FORMS (TO IDENTIFY FIELDS)
-- =====================================================
-- This will help identify all the form fields that need permissions

-- Check if these tables exist and get their columns
SELECT 
    'TABLE_COLUMNS' as category,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN (
    'vendor_registration_forms',
    'material_indent_slips', 
    'purchase_orders',
    'goods_receipt_notes',
    'material_issue_slips',
    'job_work_challans',
    'delivery_challans',
    'dispatch_memos',
    'production_reports',
    'maintenance_checklists',
    'quality_inspections',
    'machines',
    'molds',
    'raw_materials',
    'packing_materials',
    'production_lines'
)
ORDER BY table_name, ordinal_position;

-- =====================================================
-- 11. SUMMARY QUERY - GET COUNTS
-- =====================================================
SELECT 
    'SUMMARY' as info_type,
    (SELECT COUNT(*) FROM auth_resources WHERE resource_type = 'module') as total_modules,
    (SELECT COUNT(*) FROM auth_resources WHERE resource_type = 'feature') as total_features,
    (SELECT COUNT(*) FROM auth_resources WHERE resource_type = 'action') as total_actions,
    (SELECT COUNT(*) FROM auth_permissions) as total_permissions,
    (SELECT COUNT(*) FROM auth_resource_fields) as total_fields,
    (SELECT COUNT(*) FROM auth_roles) as total_roles,
    (SELECT COUNT(*) FROM auth_users) as total_users,
    (SELECT COUNT(*) FROM auth_user_permissions) as total_user_permissions;
