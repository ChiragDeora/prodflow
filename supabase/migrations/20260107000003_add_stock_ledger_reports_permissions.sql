-- ============================================================================
-- Migration: Add Stock Ledger and Reports to Permission Schema
-- Date: 2026-01-07
-- Description: Adds Stock Ledger and Reports modules with all their tabs
--              to the permission system for granular access control
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Stock Ledger Module Resources
-- ============================================================================

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('stockLedger', 'Stock Ledger', 'stockLedger', 'Stock Ledger', 'Stock Ledger', 'Stock ledger main module access', 'stock_ledger', 1, TRUE),
('stockLedgerMovements', 'Movement Log', 'stockLedger', 'Stock Ledger', 'Movement Log', 'View stock movement history and transactions', 'stock_ledger', 2, TRUE),
('stockLedgerBalances', 'Current Stock', 'stockLedger', 'Stock Ledger', 'Current Stock', 'View current stock balances by location', 'stock_balances', 3, TRUE),
('stockLedgerAnalytics', 'Analytics', 'stockLedger', 'Stock Ledger', 'Analytics', 'Stock analytics and reports', 'stock_ledger', 4, TRUE)
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
-- STEP 2: Add Reports Module Resources
-- ============================================================================

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('reports', 'Reports', 'reports', 'Reports', 'Reports', 'Reports main module access', 'saved_reports', 1, TRUE),
('reportsDashboard', 'Reports Dashboard', 'reports', 'Reports', 'Dashboard', 'Reports overview and dashboard', 'saved_reports', 2, TRUE),
('reportBuilder', 'Report Builder', 'reports', 'Reports', 'Report Builder', 'Create custom reports', 'saved_reports', 3, TRUE),
('reportTemplates', 'Report Templates', 'reports', 'Reports', 'Templates', 'Pre-built report templates', 'saved_reports', 4, TRUE),
('savedReports', 'Saved Reports', 'reports', 'Reports', 'Saved Reports', 'User saved reports', 'saved_reports', 5, TRUE),
('smartQuery', 'Smart Query', 'reports', 'Reports', 'Smart Query', 'AI-powered query builder', 'saved_reports', 6, TRUE),
('aiInsights', 'AI Insights', 'reports', 'Reports', 'AI Insights', 'AI-generated insights and recommendations', 'saved_reports', 7, TRUE)
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
-- STEP 3: Add Spare Parts Master Resource (if not exists)
-- ============================================================================

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('sparePartsMaster', 'Spare Parts Master', 'masterData', 'Master Data', 'Spare Parts', 'Spare parts inventory management', 'spare_parts', 8, TRUE)
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
-- STEP 4: Create Permissions for Stock Ledger Resources
-- ============================================================================

-- Helper function to create permissions for a resource
DO $$
DECLARE
    resource_record RECORD;
    permission_name TEXT;
    action_type TEXT;
BEGIN
    -- Create permissions for Stock Ledger resources
    FOR resource_record IN 
        SELECT id, key, name, module FROM auth_system.auth_resources 
        WHERE module = 'stockLedger' AND is_active = TRUE
    LOOP
        -- Create approve permission
        permission_name := resource_record.module || '.' || resource_record.key || '.approve';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Approve ' || resource_record.name, 'approve', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create read permission
        permission_name := resource_record.module || '.' || resource_record.key || '.read';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'View ' || resource_record.name, 'read', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create create permission
        permission_name := resource_record.module || '.' || resource_record.key || '.create';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Create ' || resource_record.name, 'create', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create update permission
        permission_name := resource_record.module || '.' || resource_record.key || '.update';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Update ' || resource_record.name, 'update', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create delete permission
        permission_name := resource_record.module || '.' || resource_record.key || '.delete';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Delete ' || resource_record.name, 'delete', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
    END LOOP;
    
    -- Create permissions for Reports resources
    FOR resource_record IN 
        SELECT id, key, name, module FROM auth_system.auth_resources 
        WHERE module = 'reports' AND is_active = TRUE
    LOOP
        -- Create approve permission
        permission_name := resource_record.module || '.' || resource_record.key || '.approve';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Approve ' || resource_record.name, 'approve', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create read permission
        permission_name := resource_record.module || '.' || resource_record.key || '.read';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'View ' || resource_record.name, 'read', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create create permission
        permission_name := resource_record.module || '.' || resource_record.key || '.create';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Create ' || resource_record.name, 'create', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create update permission
        permission_name := resource_record.module || '.' || resource_record.key || '.update';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Update ' || resource_record.name, 'update', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create delete permission
        permission_name := resource_record.module || '.' || resource_record.key || '.delete';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Delete ' || resource_record.name, 'delete', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
    END LOOP;
    
    -- Create permissions for Spare Parts Master
    FOR resource_record IN 
        SELECT id, key, name, module FROM auth_system.auth_resources 
        WHERE key = 'sparePartsMaster' AND is_active = TRUE
    LOOP
        -- Create approve permission
        permission_name := resource_record.module || '.' || resource_record.key || '.approve';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Approve ' || resource_record.name, 'approve', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create read permission
        permission_name := resource_record.module || '.' || resource_record.key || '.read';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'View ' || resource_record.name, 'read', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create create permission
        permission_name := resource_record.module || '.' || resource_record.key || '.create';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Create ' || resource_record.name, 'create', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create update permission
        permission_name := resource_record.module || '.' || resource_record.key || '.update';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Update ' || resource_record.name, 'update', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
        
        -- Create delete permission
        permission_name := resource_record.module || '.' || resource_record.key || '.delete';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (permission_name, 'Delete ' || resource_record.name, 'delete', 'resource', resource_record.id, TRUE)
        ON CONFLICT (name) DO NOTHING;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Update Module Sort Order for Schema
-- ============================================================================

-- Update sort order for new modules in permission schema route
-- Stock Ledger comes after Maintenance (9), Reports comes after Stock Ledger (10)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Stock Ledger resources added:' as info;
SELECT key, name, module, section, sort_order 
FROM auth_system.auth_resources 
WHERE module = 'stockLedger' AND is_active = TRUE
ORDER BY sort_order;

SELECT 'Reports resources added:' as info;
SELECT key, name, module, section, sort_order 
FROM auth_system.auth_resources 
WHERE module = 'reports' AND is_active = TRUE
ORDER BY sort_order;

SELECT 'Spare Parts Master resource:' as info;
SELECT key, name, module, section, sort_order 
FROM auth_system.auth_resources 
WHERE key = 'sparePartsMaster' AND is_active = TRUE;

SELECT 'Total new permissions created:' as info;
SELECT COUNT(*) as total_permissions 
FROM auth_system.auth_permissions 
WHERE name LIKE 'stockLedger.%' OR name LIKE 'reports.%' OR name LIKE 'masterData.sparePartsMaster.%';

