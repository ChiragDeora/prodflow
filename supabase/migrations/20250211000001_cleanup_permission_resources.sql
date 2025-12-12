-- ============================================================================
-- CLEANUP: Remove Party Master, Color Label Master, and Vendor Registration
-- These resources are now managed differently:
-- - Party Master & Color Label Master are part of Others Master
-- - Vendor Registration is removed from Store Purchase
-- ============================================================================

-- Step 1: Delete user permissions linked to these resources
DELETE FROM auth_system.auth_user_permissions 
WHERE permission_id IN (
    SELECT id FROM auth_system.auth_permissions 
    WHERE resource_id IN (
        SELECT id FROM auth_system.auth_resources 
        WHERE key IN ('partyMaster', 'colorLabelMaster', 'vendorRegistration')
    )
);

-- Step 2: Delete role permissions linked to these resources
DELETE FROM auth_system.auth_role_permissions 
WHERE permission_id IN (
    SELECT id FROM auth_system.auth_permissions 
    WHERE resource_id IN (
        SELECT id FROM auth_system.auth_resources 
        WHERE key IN ('partyMaster', 'colorLabelMaster', 'vendorRegistration')
    )
);

-- Step 3: Delete permissions for these resources
DELETE FROM auth_system.auth_permissions 
WHERE resource_id IN (
    SELECT id FROM auth_system.auth_resources 
    WHERE key IN ('partyMaster', 'colorLabelMaster', 'vendorRegistration')
);

-- Step 4: Delete the resources themselves
DELETE FROM auth_system.auth_resources 
WHERE key IN ('partyMaster', 'colorLabelMaster', 'vendorRegistration');

-- Step 5: Update Others Master description to clarify it includes Party & Color Label
UPDATE auth_system.auth_resources 
SET description = 'Other master data (Party Master, Color Label Master)'
WHERE key = 'othersMaster';

-- Step 6: Re-order Store Purchase resources (since Vendor Registration is removed)
UPDATE auth_system.auth_resources SET sort_order = 1 WHERE key = 'materialIndent' AND module = 'storePurchase';
UPDATE auth_system.auth_resources SET sort_order = 2 WHERE key = 'purchaseOrder' AND module = 'storePurchase';
UPDATE auth_system.auth_resources SET sort_order = 3 WHERE key = 'openIndent' AND module = 'storePurchase';
UPDATE auth_system.auth_resources SET sort_order = 4 WHERE key = 'purchaseHistory' AND module = 'storePurchase';

-- Step 7: Re-order Master Data resources
UPDATE auth_system.auth_resources SET sort_order = 8 WHERE key = 'othersMaster' AND module = 'masterData';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Remaining resources by module:' as info;
SELECT module, module_label, COUNT(*) as resource_count 
FROM auth_system.auth_resources 
WHERE is_active = TRUE AND key IS NOT NULL
GROUP BY module, module_label 
ORDER BY module;

SELECT 'Total permissions after cleanup:' as info;
SELECT COUNT(*) as total_permissions FROM auth_system.auth_permissions;

SELECT 'Removed resources (should be 0):' as info;
SELECT COUNT(*) as removed_count FROM auth_system.auth_resources 
WHERE key IN ('partyMaster', 'colorLabelMaster', 'vendorRegistration');
