-- ============================================================================
-- DIAGNOSTIC: Check Stock Ledger and Reports Permissions Setup
-- Run this in Supabase SQL Editor to diagnose permission issues
-- ============================================================================

-- 1. Check if Stock Ledger resources exist
SELECT '1. STOCK LEDGER RESOURCES:' as check_type;
SELECT key, name, module, section, is_active 
FROM auth_system.auth_resources 
WHERE module = 'stockLedger' OR key LIKE 'stockLedger%';

-- 2. Check if Reports resources exist
SELECT '2. REPORTS RESOURCES:' as check_type;
SELECT key, name, module, section, is_active 
FROM auth_system.auth_resources 
WHERE module = 'reports' OR key LIKE 'report%';

-- 3. Check if Stock Ledger permissions exist
SELECT '3. STOCK LEDGER PERMISSIONS:' as check_type;
SELECT id, name, action, resource_id 
FROM auth_system.auth_permissions 
WHERE name LIKE 'stockLedger.%'
ORDER BY name;

-- 4. Check if Reports permissions exist
SELECT '4. REPORTS PERMISSIONS:' as check_type;
SELECT id, name, action, resource_id 
FROM auth_system.auth_permissions 
WHERE name LIKE 'reports.%'
ORDER BY name;

-- 5. Check which users have Stock Ledger permissions assigned
SELECT '5. USERS WITH STOCK LEDGER PERMISSIONS:' as check_type;
SELECT 
    u.full_name,
    u.email,
    p.name as permission_name,
    up.is_active,
    up.granted_at
FROM auth_system.auth_user_permissions up
JOIN auth_system.auth_users u ON up.user_id = u.id
JOIN auth_system.auth_permissions p ON up.permission_id = p.id
WHERE p.name LIKE 'stockLedger.%' OR p.name LIKE 'reports.%'
ORDER BY u.full_name, p.name;

-- 6. Check if Admin role has Stock Ledger permissions
SELECT '6. ADMIN ROLE STOCK LEDGER PERMISSIONS:' as check_type;
SELECT 
    r.name as role_name,
    p.name as permission_name
FROM auth_system.auth_role_permissions rp
JOIN auth_system.auth_roles r ON rp.role_id = r.id
JOIN auth_system.auth_permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'stockLedger.%' OR p.name LIKE 'reports.%'
ORDER BY r.name, p.name;

-- 7. Summary counts
SELECT '7. SUMMARY:' as check_type;
SELECT 
    'Stock Ledger Resources' as item,
    COUNT(*) as count 
FROM auth_system.auth_resources WHERE module = 'stockLedger'
UNION ALL
SELECT 
    'Reports Resources' as item,
    COUNT(*) as count 
FROM auth_system.auth_resources WHERE module = 'reports'
UNION ALL
SELECT 
    'Stock Ledger Permissions' as item,
    COUNT(*) as count 
FROM auth_system.auth_permissions WHERE name LIKE 'stockLedger.%'
UNION ALL
SELECT 
    'Reports Permissions' as item,
    COUNT(*) as count 
FROM auth_system.auth_permissions WHERE name LIKE 'reports.%'
UNION ALL
SELECT 
    'User Stock Ledger Assignments' as item,
    COUNT(*) as count 
FROM auth_system.auth_user_permissions up
JOIN auth_system.auth_permissions p ON up.permission_id = p.id
WHERE p.name LIKE 'stockLedger.%'
UNION ALL
SELECT 
    'Role Stock Ledger Assignments' as item,
    COUNT(*) as count 
FROM auth_system.auth_role_permissions rp
JOIN auth_system.auth_permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'stockLedger.%';

-- ============================================================================
-- IF COUNTS ARE 0: Run the fix migration!
-- supabase/migrations/20260109000001_fix_stock_ledger_reports_permissions.sql
-- ============================================================================
