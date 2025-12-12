-- Test script to verify RBAC migration works correctly
-- Run this after the migration to check if everything is set up properly

-- Check if department enum was created
SELECT unnest(enum_range(NULL::department_type)) AS department_values;

-- Check if new columns were added to auth_users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auth_users' 
AND table_schema = 'auth_system'
AND column_name IN ('department', 'job_title');

-- Check if Yogesh's profile was updated
SELECT id, username, full_name, department, job_title, is_root_admin
FROM auth_system.auth_users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check if resources were created
SELECT COUNT(*) as resource_count FROM auth_resources;

-- Check if permissions were created
SELECT COUNT(*) as permission_count FROM auth_permissions;

-- Check if field permissions were created
SELECT COUNT(*) as field_permission_count 
FROM auth_permissions 
WHERE scope_level = 'field';

-- Check if permission templates were created
SELECT COUNT(*) as template_count FROM auth_permission_templates;

-- Check if helper functions exist
SELECT proname, prosrc IS NOT NULL as has_body
FROM pg_proc 
WHERE proname IN (
    'get_user_permissions_detailed',
    'check_user_permission_detailed',
    'get_permission_audit_stats',
    'get_user_permission_summary',
    'apply_permission_template_to_user'
);

-- Test permission checking function for Yogesh (should always return true)
SELECT check_user_permission_detailed(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'any_permission_name'
) as yogesh_has_all_permissions;
