-- ============================================================================
-- Migration: Add Data Explorer Permission to Reports Module
-- Date: 2026-01-08
-- Description: Adds Data Explorer resource and permissions for flexible querying
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Data Explorer Resource to Reports Module
-- ============================================================================

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('dataExplorer', 'Data Explorer', 'reports', 'Reports', 'Data Explorer', 'Flexible data query explorer - query any data source with custom aggregations and filters', 'saved_reports', 2, TRUE)
ON CONFLICT (name) DO UPDATE SET
    key = EXCLUDED.key,
    module = EXCLUDED.module,
    module_label = EXCLUDED.module_label,
    section = EXCLUDED.section,
    description = EXCLUDED.description,
    table_name = EXCLUDED.table_name,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- STEP 2: Create Permissions for Data Explorer
-- ============================================================================

DO $$
DECLARE
    resource_id UUID;
    permission_name TEXT;
BEGIN
    -- Get the resource ID for Data Explorer
    SELECT id INTO resource_id 
    FROM auth_system.auth_resources 
    WHERE key = 'dataExplorer' AND module = 'reports';
    
    IF resource_id IS NOT NULL THEN
        -- Read permission (view Data Explorer)
        permission_name := 'reports.dataExplorer.read';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Access Data Explorer - query data from any source', 'read', 'resource', resource_id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create permission (save queries)
        permission_name := 'reports.dataExplorer.create';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Save queries in Data Explorer', 'create', 'resource', resource_id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Export permission (export query results)
        permission_name := 'reports.dataExplorer.export';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Export query results from Data Explorer', 'export', 'resource', resource_id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        RAISE NOTICE 'Data Explorer permissions created successfully';
    ELSE
        RAISE NOTICE 'Could not find Data Explorer resource';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Grant Data Explorer permissions to Admin role
-- ============================================================================

DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Get admin role ID
    SELECT id INTO admin_role_id 
    FROM auth_system.auth_roles 
    WHERE name = 'admin' OR name = 'Admin'
    LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Grant all Data Explorer permissions to admin
        FOR perm_id IN 
            SELECT id FROM auth_system.auth_permissions 
            WHERE name LIKE 'reports.dataExplorer.%'
        LOOP
            INSERT INTO auth_system.auth_role_permissions (role_id, permission_id)
            VALUES (admin_role_id, perm_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Data Explorer permissions granted to Admin role';
    ELSE
        RAISE NOTICE 'Admin role not found - permissions not auto-granted';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Grant Data Explorer read permission to User role (optional)
-- ============================================================================

DO $$
DECLARE
    user_role_id UUID;
    read_perm_id UUID;
BEGIN
    -- Get user role ID
    SELECT id INTO user_role_id 
    FROM auth_system.auth_roles 
    WHERE name = 'user' OR name = 'User'
    LIMIT 1;
    
    -- Get read permission ID
    SELECT id INTO read_perm_id 
    FROM auth_system.auth_permissions 
    WHERE name = 'reports.dataExplorer.read'
    LIMIT 1;
    
    IF user_role_id IS NOT NULL AND read_perm_id IS NOT NULL THEN
        INSERT INTO auth_system.auth_role_permissions (role_id, permission_id)
        VALUES (user_role_id, read_perm_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        RAISE NOTICE 'Data Explorer read permission granted to User role';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show created resources
SELECT key, name, module, section, description 
FROM auth_system.auth_resources 
WHERE key = 'dataExplorer';

-- Show created permissions
SELECT name, description, action 
FROM auth_system.auth_permissions 
WHERE name LIKE '%dataExplorer%';

-- ============================================================================
-- DONE
-- ============================================================================

