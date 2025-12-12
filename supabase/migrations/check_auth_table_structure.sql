-- CHECK ACTUAL STRUCTURE OF EXISTING AUTH TABLES

-- Check auth_resources table structure
SELECT 
    'auth_resources' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'auth_resources'
ORDER BY ordinal_position;

-- Check auth_permissions table structure
SELECT 
    'auth_permissions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'auth_permissions'
ORDER BY ordinal_position;

-- Check auth_roles table structure
SELECT 
    'auth_roles' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'auth_roles'
ORDER BY ordinal_position;

-- Check auth_user_permissions table structure
SELECT 
    'auth_user_permissions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'auth_user_permissions'
ORDER BY ordinal_position;
