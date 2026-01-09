-- ============================================================================
-- FIX STOCK LEDGER AND REPORTS PERMISSIONS - V2
-- ============================================================================
-- This fixes permissions for Stock Ledger and Reports modules
-- ============================================================================

-- ============================================================================
-- 1. DELETE PARENT-LEVEL RESOURCES (we only need tab-level resources)
-- ============================================================================

-- First delete any user_permission assignments for parent resources
DELETE FROM auth_system.auth_user_permissions 
WHERE permission_id IN (
    SELECT id FROM auth_system.auth_permissions 
    WHERE name IN (
        'stockLedger.stockLedger.read', 'stockLedger.stockLedger.create', 
        'stockLedger.stockLedger.update', 'stockLedger.stockLedger.delete',
        'stockLedger.stockLedger.approve',
        'reports.reports.read', 'reports.reports.create',
        'reports.reports.update', 'reports.reports.delete',
        'reports.reports.approve'
    )
);

-- Delete parent permissions
DELETE FROM auth_system.auth_permissions WHERE name LIKE 'stockLedger.stockLedger.%';
DELETE FROM auth_system.auth_permissions WHERE name LIKE 'reports.reports.%';

-- Delete parent resources
DELETE FROM auth_system.auth_resources WHERE key = 'stockLedger' AND module = 'stockLedger';
DELETE FROM auth_system.auth_resources WHERE key = 'reports' AND module = 'reports';

-- ============================================================================
-- 2. UPDATE OR INSERT STOCK LEDGER TAB RESOURCES
-- ============================================================================

-- Movement Log
UPDATE auth_system.auth_resources SET 
    name = 'Movement Log', module = 'stockLedger', module_label = 'Stock Ledger',
    section = 'Movement Log', description = 'View stock movement history', 
    sort_order = 1, is_active = true
WHERE key = 'stockLedgerMovements';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'stockLedgerMovements', 'Movement Log', 'stockLedger', 'Stock Ledger', 'Movement Log', 'View stock movement history', 1, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'stockLedgerMovements');

-- Current Stock
UPDATE auth_system.auth_resources SET 
    name = 'Current Stock', module = 'stockLedger', module_label = 'Stock Ledger',
    section = 'Current Stock', description = 'View current stock balances', 
    sort_order = 2, is_active = true
WHERE key = 'stockLedgerBalances';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'stockLedgerBalances', 'Current Stock', 'stockLedger', 'Stock Ledger', 'Current Stock', 'View current stock balances', 2, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'stockLedgerBalances');

-- Analytics
UPDATE auth_system.auth_resources SET 
    name = 'Analytics', module = 'stockLedger', module_label = 'Stock Ledger',
    section = 'Stock Analytics', description = 'View stock analytics', 
    sort_order = 3, is_active = true
WHERE key = 'stockLedgerAnalytics';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'stockLedgerAnalytics', 'Analytics', 'stockLedger', 'Stock Ledger', 'Stock Analytics', 'View stock analytics', 3, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'stockLedgerAnalytics');

-- ============================================================================
-- 3. UPDATE OR INSERT REPORTS TAB RESOURCES
-- ============================================================================

-- Dashboard
UPDATE auth_system.auth_resources SET 
    name = 'Dashboard', module = 'reports', module_label = 'Reports',
    section = 'Reports Dashboard', description = 'View reports dashboard', 
    sort_order = 1, is_active = true
WHERE key = 'reportsDashboard';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'reportsDashboard', 'Dashboard', 'reports', 'Reports', 'Reports Dashboard', 'View reports dashboard', 1, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'reportsDashboard');

-- Report Builder
UPDATE auth_system.auth_resources SET 
    name = 'Report Builder', module = 'reports', module_label = 'Reports',
    section = 'Report Builder', description = 'Build custom reports', 
    sort_order = 2, is_active = true
WHERE key = 'reportBuilder';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'reportBuilder', 'Report Builder', 'reports', 'Reports', 'Report Builder', 'Build custom reports', 2, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'reportBuilder');

-- Templates
UPDATE auth_system.auth_resources SET 
    name = 'Templates', module = 'reports', module_label = 'Reports',
    section = 'Report Templates', description = 'View report templates', 
    sort_order = 3, is_active = true
WHERE key = 'reportTemplates';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'reportTemplates', 'Templates', 'reports', 'Reports', 'Report Templates', 'View report templates', 3, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'reportTemplates');

-- Saved Reports
UPDATE auth_system.auth_resources SET 
    name = 'Saved Reports', module = 'reports', module_label = 'Reports',
    section = 'Saved Reports', description = 'Manage saved reports', 
    sort_order = 4, is_active = true
WHERE key = 'savedReports';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'savedReports', 'Saved Reports', 'reports', 'Reports', 'Saved Reports', 'Manage saved reports', 4, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'savedReports');

-- Smart Query
UPDATE auth_system.auth_resources SET 
    name = 'Smart Query', module = 'reports', module_label = 'Reports',
    section = 'Smart Query', description = 'AI-powered queries', 
    sort_order = 5, is_active = true
WHERE key = 'smartQuery';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'smartQuery', 'Smart Query', 'reports', 'Reports', 'Smart Query', 'AI-powered queries', 5, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'smartQuery');

-- AI Insights
UPDATE auth_system.auth_resources SET 
    name = 'AI Insights', module = 'reports', module_label = 'Reports',
    section = 'AI Insights', description = 'AI insights', 
    sort_order = 6, is_active = true
WHERE key = 'aiInsights';

INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, sort_order, is_active)
SELECT 'aiInsights', 'AI Insights', 'reports', 'Reports', 'AI Insights', 'AI insights', 6, true
WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_resources WHERE key = 'aiInsights');

-- ============================================================================
-- 4. CREATE STOCK LEDGER PERMISSIONS (using UPDATE + INSERT pattern)
-- ============================================================================

DO $$
DECLARE
    res_id UUID;
BEGIN
    -- Movement Log permissions
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'stockLedgerMovements';
    IF res_id IS NOT NULL THEN
        -- Update existing
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerMovements.read';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerMovements.create';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerMovements.update';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerMovements.delete';
        -- Insert if not exists
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerMovements.read', 'Can view Movement Log', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerMovements.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerMovements.create', 'Can create in Movement Log', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerMovements.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerMovements.update', 'Can update Movement Log', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerMovements.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerMovements.delete', 'Can delete from Movement Log', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerMovements.delete');
        RAISE NOTICE 'Movement Log permissions ready';
    END IF;

    -- Current Stock permissions
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'stockLedgerBalances';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerBalances.read';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerBalances.create';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerBalances.update';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerBalances.delete';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerBalances.read', 'Can view Current Stock', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerBalances.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerBalances.create', 'Can create in Current Stock', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerBalances.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerBalances.update', 'Can update Current Stock', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerBalances.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerBalances.delete', 'Can delete from Current Stock', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerBalances.delete');
        RAISE NOTICE 'Current Stock permissions ready';
    END IF;

    -- Analytics permissions
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'stockLedgerAnalytics';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerAnalytics.read';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerAnalytics.create';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerAnalytics.update';
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name = 'stockLedger.stockLedgerAnalytics.delete';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerAnalytics.read', 'Can view Analytics', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerAnalytics.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerAnalytics.create', 'Can create in Analytics', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerAnalytics.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerAnalytics.update', 'Can update Analytics', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerAnalytics.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'stockLedger.stockLedgerAnalytics.delete', 'Can delete from Analytics', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'stockLedger.stockLedgerAnalytics.delete');
        RAISE NOTICE 'Analytics permissions ready';
    END IF;
END $$;

-- ============================================================================
-- 5. CREATE REPORTS PERMISSIONS
-- ============================================================================

DO $$
DECLARE
    res_id UUID;
BEGIN
    -- Dashboard
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'reportsDashboard';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name LIKE 'reports.reportsDashboard.%';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportsDashboard.read', 'Can view Dashboard', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportsDashboard.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportsDashboard.create', 'Can create in Dashboard', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportsDashboard.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportsDashboard.update', 'Can update Dashboard', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportsDashboard.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportsDashboard.delete', 'Can delete from Dashboard', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportsDashboard.delete');
    END IF;

    -- Report Builder
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'reportBuilder';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name LIKE 'reports.reportBuilder.%';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportBuilder.read', 'Can view Report Builder', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportBuilder.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportBuilder.create', 'Can create reports', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportBuilder.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportBuilder.update', 'Can update reports', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportBuilder.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportBuilder.delete', 'Can delete reports', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportBuilder.delete');
    END IF;

    -- Templates
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'reportTemplates';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name LIKE 'reports.reportTemplates.%';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportTemplates.read', 'Can view Templates', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportTemplates.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportTemplates.create', 'Can create templates', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportTemplates.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportTemplates.update', 'Can update templates', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportTemplates.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.reportTemplates.delete', 'Can delete templates', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.reportTemplates.delete');
    END IF;

    -- Saved Reports
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'savedReports';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name LIKE 'reports.savedReports.%';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.savedReports.read', 'Can view Saved Reports', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.savedReports.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.savedReports.create', 'Can save reports', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.savedReports.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.savedReports.update', 'Can update saved reports', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.savedReports.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.savedReports.delete', 'Can delete saved reports', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.savedReports.delete');
    END IF;

    -- Smart Query
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'smartQuery';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name LIKE 'reports.smartQuery.%';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.smartQuery.read', 'Can view Smart Query', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.smartQuery.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.smartQuery.create', 'Can create queries', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.smartQuery.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.smartQuery.update', 'Can update queries', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.smartQuery.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.smartQuery.delete', 'Can delete queries', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.smartQuery.delete');
    END IF;

    -- AI Insights
    SELECT id INTO res_id FROM auth_system.auth_resources WHERE key = 'aiInsights';
    IF res_id IS NOT NULL THEN
        UPDATE auth_system.auth_permissions SET resource_id = res_id WHERE name LIKE 'reports.aiInsights.%';
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.aiInsights.read', 'Can view AI Insights', 'read', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.aiInsights.read');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.aiInsights.create', 'Can create insights', 'create', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.aiInsights.create');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.aiInsights.update', 'Can update insights', 'update', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.aiInsights.update');
        INSERT INTO auth_system.auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        SELECT 'reports.aiInsights.delete', 'Can delete insights', 'delete', 'resource', res_id, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM auth_system.auth_permissions WHERE name = 'reports.aiInsights.delete');
    END IF;
    
    RAISE NOTICE 'All permissions created/updated';
END $$;

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

SELECT '=== STOCK LEDGER RESOURCES (should be 3) ===' as section;
SELECT key, name, section FROM auth_system.auth_resources WHERE module = 'stockLedger' ORDER BY sort_order;

SELECT '=== REPORTS RESOURCES (should be 6) ===' as section;
SELECT key, name, section FROM auth_system.auth_resources WHERE module = 'reports' ORDER BY sort_order;

SELECT '=== STOCK LEDGER PERMISSIONS ===' as section;
SELECT name FROM auth_system.auth_permissions WHERE name LIKE 'stockLedger.%' ORDER BY name;

SELECT '=== REPORTS PERMISSIONS ===' as section;
SELECT name FROM auth_system.auth_permissions WHERE name LIKE 'reports.%' ORDER BY name;

SELECT '=== SUMMARY ===' as section;
SELECT 'Stock Ledger Resources' as item, COUNT(*) as count FROM auth_system.auth_resources WHERE module = 'stockLedger'
UNION ALL SELECT 'Reports Resources', COUNT(*) FROM auth_system.auth_resources WHERE module = 'reports'
UNION ALL SELECT 'Stock Ledger Permissions', COUNT(*) FROM auth_system.auth_permissions WHERE name LIKE 'stockLedger.%'
UNION ALL SELECT 'Reports Permissions', COUNT(*) FROM auth_system.auth_permissions WHERE name LIKE 'reports.%';

SELECT '✅ Migration V2 completed! Now re-assign permissions to users.' as status;
