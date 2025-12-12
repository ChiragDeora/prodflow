-- ============================================================================
-- RBAC SETUP VERIFICATION SCRIPT
-- Run this after the fixed_rbac_setup.sql to verify everything works
-- ============================================================================

-- Check if department enum was created in the correct schema
SELECT 
    'Department enum exists' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type t 
            JOIN pg_namespace n ON t.typnamespace = n.oid 
            WHERE n.nspname = 'auth_system' AND t.typname = 'department_type'
        ) THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- Check if new columns were added to auth_users
SELECT 
    'New columns added' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'auth_system' 
            AND table_name = 'auth_users' 
            AND column_name IN ('department', 'job_title')
        ) THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- Check if Yogesh's profile was updated
SELECT 
    'Yogesh profile updated' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth_system.auth_users 
            WHERE id = '00000000-0000-0000-0000-000000000001' 
            AND department = 'admin' 
            AND job_title IS NOT NULL
        ) THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- Check resource count
SELECT 
    'Resources created' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_system.auth_resources) >= 30 THEN '✅ PASS (' || (SELECT COUNT(*) FROM auth_system.auth_resources) || ' resources)'
        ELSE '❌ FAIL (' || (SELECT COUNT(*) FROM auth_system.auth_resources) || ' resources)' 
    END as status;

-- Check permission count
SELECT 
    'Permissions created' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_system.auth_permissions) >= 100 THEN '✅ PASS (' || (SELECT COUNT(*) FROM auth_system.auth_permissions) || ' permissions)'
        ELSE '❌ FAIL (' || (SELECT COUNT(*) FROM auth_system.auth_permissions) || ' permissions)' 
    END as status;

-- Check field permissions
SELECT 
    'Field permissions created' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_system.auth_permissions WHERE scope_level = 'field') >= 10 THEN '✅ PASS (' || (SELECT COUNT(*) FROM auth_system.auth_permissions WHERE scope_level = 'field') || ' field permissions)'
        ELSE '❌ FAIL (' || (SELECT COUNT(*) FROM auth_system.auth_permissions WHERE scope_level = 'field') || ' field permissions)' 
    END as status;

-- Check permission templates
SELECT 
    'Permission templates created' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_permission_templates) >= 3 THEN '✅ PASS (' || (SELECT COUNT(*) FROM auth_permission_templates) || ' templates)'
        ELSE '❌ FAIL (' || (SELECT COUNT(*) FROM auth_permission_templates) || ' templates)' 
    END as status;

-- Check helper functions
SELECT 
    'Helper functions created' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname IN ('get_user_permissions_detailed', 'check_user_permission_detailed')
        ) THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- Test permission checking function for Yogesh (should always return true)
SELECT 
    'Yogesh permission check' as check_name,
    CASE 
        WHEN check_user_permission_detailed(
            '00000000-0000-0000-0000-000000000001'::UUID,
            'any_permission_name'
        ) = true THEN '✅ PASS (Root admin has all permissions)' 
        ELSE '❌ FAIL (Root admin check failed)' 
    END as status;

-- Show Yogesh's updated profile
SELECT 
    '--- YOGESH PROFILE ---' as section,
    '' as spacer;

SELECT 
    username,
    full_name,
    department::text as department,
    job_title,
    is_root_admin,
    status
FROM auth_system.auth_users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Show summary statistics
SELECT 
    '--- SUMMARY STATISTICS ---' as section,
    '' as spacer;

SELECT 
    'Total Resources' as metric,
    COUNT(*)::text as value
FROM auth_system.auth_resources
UNION ALL
SELECT 
    'Total Permissions' as metric,
    COUNT(*)::text as value
FROM auth_system.auth_permissions
UNION ALL
SELECT 
    'Field-Level Permissions' as metric,
    COUNT(*)::text as value
FROM auth_system.auth_permissions 
WHERE scope_level = 'field'
UNION ALL
SELECT 
    'Permission Templates' as metric,
    COUNT(*)::text as value
FROM auth_permission_templates
UNION ALL
SELECT 
    'Resource Fields Defined' as metric,
    COUNT(*)::text as value
FROM auth_system.auth_resource_fields;

-- Show sample permissions for verification
SELECT 
    '--- SAMPLE PERMISSIONS ---' as section,
    '' as spacer;

SELECT 
    name as permission_name,
    action::text as action,
    scope_level::text as scope,
    CASE WHEN is_allow THEN 'Allow' ELSE 'Deny' END as type
FROM auth_system.auth_permissions 
WHERE name LIKE 'Store & Dispatch%'
ORDER BY name
LIMIT 10;
