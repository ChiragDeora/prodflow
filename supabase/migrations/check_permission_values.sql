-- Check the actual values in the permissions table
SELECT 
    name,
    action,
    is_allow,
    resource_id,
    created_at
FROM auth_permissions 
ORDER BY name
LIMIT 10;

-- Check if there are any permissions with is_allow = false
SELECT 
    COUNT(*) as total_permissions,
    COUNT(CASE WHEN is_allow = true THEN 1 END) as allow_permissions,
    COUNT(CASE WHEN is_allow = false THEN 1 END) as deny_permissions,
    COUNT(CASE WHEN is_allow IS NULL THEN 1 END) as null_permissions
FROM auth_permissions;
