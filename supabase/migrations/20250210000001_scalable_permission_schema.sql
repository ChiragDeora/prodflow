-- ============================================================================
-- SCALABLE PERMISSION SYSTEM SCHEMA
-- This migration updates auth_resources with proper module structure
-- for a scalable permission system that doesn't require React changes
-- ============================================================================

-- ============================================================================
-- STEP 1: Add required columns to auth_resources if they don't exist
-- ============================================================================

-- Add 'key' column - unique identifier for the resource (e.g., "machineMaster", "materialIndent")
ALTER TABLE auth_system.auth_resources ADD COLUMN IF NOT EXISTS key VARCHAR(100);

-- Add 'module' column - one of the 9 main modules
ALTER TABLE auth_system.auth_resources ADD COLUMN IF NOT EXISTS module VARCHAR(100);

-- Add 'module_label' column - human-readable module name
ALTER TABLE auth_system.auth_resources ADD COLUMN IF NOT EXISTS module_label VARCHAR(200);

-- Add 'section' column - human-readable resource label (e.g., "Machine Master", "Material Indent")
ALTER TABLE auth_system.auth_resources ADD COLUMN IF NOT EXISTS section VARCHAR(200);

-- Add 'sort_order' column - for ordering within module
ALTER TABLE auth_system.auth_resources ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add 'is_active' column - to enable/disable resources
ALTER TABLE auth_system.auth_resources ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_auth_resources_key ON auth_system.auth_resources(key);
CREATE INDEX IF NOT EXISTS idx_auth_resources_module ON auth_system.auth_resources(module);
CREATE INDEX IF NOT EXISTS idx_auth_resources_sort_order ON auth_system.auth_resources(sort_order);
CREATE INDEX IF NOT EXISTS idx_auth_resources_is_active ON auth_system.auth_resources(is_active);

-- ============================================================================
-- STEP 3: Clear existing data and insert fresh module/resource structure
-- ============================================================================

-- First, we need to handle permissions that reference these resources
-- Delete existing user permissions (they will be re-assigned through UI)
-- Comment out if you want to preserve existing permissions
DELETE FROM auth_system.auth_user_permissions;
DELETE FROM auth_system.auth_role_permissions;
DELETE FROM auth_system.auth_permissions;
DELETE FROM auth_system.auth_resources WHERE key IS NULL OR module IS NULL;

-- Deactivate/remove resources that are no longer separate items:
-- Party Master and Color Label Master are now part of Others Master
-- Vendor Registration is removed from Store Purchase
UPDATE auth_system.auth_resources SET is_active = FALSE WHERE key IN ('partyMaster', 'colorLabelMaster', 'vendorRegistration');
DELETE FROM auth_system.auth_resources WHERE key IN ('partyMaster', 'colorLabelMaster', 'vendorRegistration');

-- ============================================================================
-- STEP 4: Insert the 9 modules with all their resources
-- ============================================================================

-- ============================================================================
-- MODULE 1: MASTER DATA
-- ============================================================================
-- Note: Party Master and Color Label Master are managed under Others Master
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('machineMaster', 'Machine Master', 'masterData', 'Master Data', 'Machine Master', 'Production machines management', 'machines', 1, TRUE),
('moldMaster', 'Mold Master', 'masterData', 'Master Data', 'Mold Master', 'Production molds management', 'molds', 2, TRUE),
('rawMaterialsMaster', 'Raw Materials Master', 'masterData', 'Master Data', 'Raw Materials Master', 'Raw materials inventory management', 'raw_materials', 3, TRUE),
('packingMaterialsMaster', 'Packing Materials Master', 'masterData', 'Master Data', 'Packing Materials Master', 'Packing materials management', 'packing_materials', 4, TRUE),
('lineMaster', 'Line Master', 'masterData', 'Master Data', 'Line Master', 'Production lines management', 'lines', 5, TRUE),
('bomMaster', 'BOM Master', 'masterData', 'Master Data', 'BOM Master', 'Bill of materials management', 'bom_master', 6, TRUE),
('commercialMaster', 'Commercial Master', 'masterData', 'Master Data', 'Commercial Master', 'Commercial data management', 'commercial_master', 7, TRUE),
('othersMaster', 'Others Master', 'masterData', 'Master Data', 'Others', 'Other master data (Party Master, Color Label Master)', 'others_master', 8, TRUE)
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
-- MODULE 2: STORE PURCHASE
-- ============================================================================
-- Note: Vendor Registration is not part of Store Purchase (managed separately)
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('materialIndent', 'Material Indent', 'storePurchase', 'Store Purchase', 'Material Indent', 'Material indent slip management', 'material_indent_slips', 1, TRUE),
('purchaseOrder', 'Purchase Order', 'storePurchase', 'Store Purchase', 'Purchase Order', 'Purchase order management', 'purchase_orders', 2, TRUE),
('openIndent', 'Open Indent', 'storePurchase', 'Store Purchase', 'Open Indent', 'Open indent tracking', 'open_indents', 3, TRUE),
('purchaseHistory', 'Purchase History', 'storePurchase', 'Store Purchase', 'History', 'Purchase history records', 'purchase_history', 4, TRUE)
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
-- MODULE 3: STORE INWARD
-- ============================================================================
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('normalGrn', 'Normal GRN', 'storeInward', 'Store Inward', 'Normal GRN', 'Normal goods receipt note management', 'grn', 1, TRUE),
('jwAnnexureGrn', 'JW Annexure GRN', 'storeInward', 'Store Inward', 'JW Annexure GRN', 'Job work annexure GRN management', 'jw_annexure_grn', 2, TRUE),
('inwardHistory', 'Inward History', 'storeInward', 'Store Inward', 'History', 'Inward history records', 'inward_history', 3, TRUE)
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
-- MODULE 4: STORE OUTWARD
-- ============================================================================
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('mis', 'MIS', 'storeOutward', 'Store Outward', 'MIS', 'Material issue slip management', 'mis', 1, TRUE),
('jobWorkChallan', 'Job Work Challan', 'storeOutward', 'Store Outward', 'Job Work Challan', 'Job work challan management', 'job_work_challan', 2, TRUE),
('deliveryChallan', 'Delivery Challan', 'storeOutward', 'Store Outward', 'Delivery Challan', 'Delivery challan management', 'delivery_challan', 3, TRUE),
('outwardHistory', 'Outward History', 'storeOutward', 'Store Outward', 'History', 'Outward history records', 'outward_history', 4, TRUE)
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
-- MODULE 5: STORE SALES
-- ============================================================================
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('dispatchMemo', 'Dispatch Memo', 'storeSales', 'Store Sales', 'Dispatch Memo', 'Dispatch memo management', 'dispatch_memo', 1, TRUE),
('orderBook', 'Order Book', 'storeSales', 'Store Sales', 'Order Book', 'Order book management', 'order_book', 2, TRUE),
('salesHistory', 'Sales History', 'storeSales', 'Store Sales', 'History', 'Sales history records', 'sales_history', 3, TRUE)
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
-- MODULE 6: PRODUCTION PLANNER
-- ============================================================================
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('productionPlanner', 'Production Planner', 'productionPlanner', 'Production Planner', 'Production Planner', 'Production planning and scheduling', 'production_planner', 1, TRUE),
('lineScheduling', 'Line Scheduling', 'productionPlanner', 'Production Planner', 'Line Scheduling', 'Production line scheduling', 'line_scheduling', 2, TRUE)
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
-- MODULE 7: PRODUCTION
-- ============================================================================
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('dpr', 'Daily Production Report', 'production', 'Production', 'Daily Production Report (DPR)', 'Daily production report management', 'dpr', 1, TRUE),
('moldLoadingUnloading', 'Mold Loading & Unloading', 'production', 'Production', 'Mold Loading & Unloading', 'Mold loading and unloading operations', 'mold_loading_unloading', 2, TRUE),
('siloManagement', 'Silo Management', 'production', 'Production', 'Silo Management / Grinding Records', 'Silo and grinding records management', 'silo_grinding_records', 3, TRUE),
('fgTransferNote', 'FG Transfer Note', 'production', 'Production', 'FG Transfer Note', 'Finished goods transfer note', 'fg_transfer_note', 4, TRUE)
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
-- MODULE 8: QUALITY
-- ============================================================================
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('qualityInspections', 'Quality Inspections', 'quality', 'Quality', 'Quality Inspections', 'Quality inspection management', 'quality_inspections', 1, TRUE),
('qualityStandards', 'Quality Standards', 'quality', 'Quality', 'Quality Standards', 'Quality standards management', 'quality_standards', 2, TRUE),
('qualityAnalytics', 'Quality Analytics', 'quality', 'Quality', 'Quality Analytics', 'Quality analytics and reports', 'quality_analytics', 3, TRUE),
('dailyWeightReport', 'Daily Weight Report', 'quality', 'Quality', 'Daily Weight Report', 'Daily weight report management', 'daily_weight_report', 4, TRUE),
('firstPiecesApproval', 'First Pieces Approval Report', 'quality', 'Quality', 'First Pieces Approval Report', 'First pieces approval management', 'first_pieces_approval_report', 5, TRUE),
('correctiveActionPlan', 'Corrective Action Plan', 'quality', 'Quality', 'Corrective Action Plan', 'Corrective action plan management', 'corrective_action_plan', 6, TRUE),
('rnd', 'R&D', 'quality', 'Quality', 'R&D', 'Research and development', 'rnd', 7, TRUE)
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
-- MODULE 9: MAINTENANCE
-- ============================================================================
INSERT INTO auth_system.auth_resources (key, name, module, module_label, section, description, table_name, sort_order, is_active) VALUES
('preventiveMaintenance', 'Preventive Maintenance', 'maintenance', 'Maintenance', 'Preventive Maintenance', 'Preventive maintenance scheduling', 'preventive_maintenance', 1, TRUE),
('machineBreakdown', 'Machine Breakdown', 'maintenance', 'Maintenance', 'Machine Breakdown', 'Machine breakdown tracking', 'machine_breakdown', 2, TRUE),
('moldBreakdown', 'Mold Breakdown', 'maintenance', 'Maintenance', 'Mold Breakdown', 'Mold breakdown tracking', 'mold_breakdown', 3, TRUE),
('maintenanceHistory', 'Maintenance History', 'maintenance', 'Maintenance', 'History', 'Maintenance history records', 'maintenance_history', 4, TRUE),
('dailyReadings', 'Daily Readings', 'maintenance', 'Maintenance', 'Daily Readings', 'Daily equipment readings', 'daily_readings', 5, TRUE),
('maintenanceReport', 'Maintenance Report', 'maintenance', 'Maintenance', 'Report', 'Maintenance reports', 'maintenance_report', 6, TRUE)
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
-- STEP 5: Generate permissions for each resource × action combination
-- Actions: view, create, update, delete, approve
-- ============================================================================

-- Create enum types if they don't exist (in auth_system schema)
DO $$
BEGIN
    -- Create action_type enum if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'action_type' AND n.nspname = 'auth_system') THEN
        CREATE TYPE auth_system.action_type AS ENUM ('read', 'create', 'update', 'delete', 'export', 'approve', 'managePermissions');
    END IF;
    
    -- Create scope_level enum if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'scope_level' AND n.nspname = 'auth_system') THEN
        CREATE TYPE auth_system.scope_level AS ENUM ('global', 'resource', 'record', 'field');
    END IF;
END $$;

-- Add unique constraint on auth_permissions.name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'auth_permissions_name_key' 
        AND conrelid = 'auth_system.auth_permissions'::regclass
    ) THEN
        ALTER TABLE auth_system.auth_permissions ADD CONSTRAINT auth_permissions_name_key UNIQUE (name);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        -- Constraint already exists, ignore
        NULL;
    WHEN others THEN
        -- Try creating index instead if constraint fails
        CREATE UNIQUE INDEX IF NOT EXISTS auth_permissions_name_idx ON auth_system.auth_permissions(name);
END $$;

-- Create a function to generate permissions for all resources
DO $$
DECLARE
    r RECORD;
    action_name TEXT;
    actions TEXT[] := ARRAY['read', 'create', 'update', 'delete', 'approve'];
    perm_name TEXT;
    perm_desc TEXT;
    existing_perm_id UUID;
BEGIN
    -- Loop through all active resources
    FOR r IN SELECT id, key, module, section FROM auth_system.auth_resources WHERE is_active = TRUE AND key IS NOT NULL
    LOOP
        -- Loop through all actions
        FOREACH action_name IN ARRAY actions
        LOOP
            -- Create permission name: module.resourceKey.action
            perm_name := r.module || '.' || r.key || '.' || action_name;
            perm_desc := INITCAP(action_name) || ' access for ' || r.section;
            
            -- Check if permission already exists
            SELECT id INTO existing_perm_id FROM auth_system.auth_permissions WHERE name = perm_name;
            
            IF existing_perm_id IS NULL THEN
                -- Insert new permission
                INSERT INTO auth_system.auth_permissions (
                    name,
                    description,
                    action,
                    scope_level,
                    resource_id,
                    is_allow,
                    created_at,
                    updated_at
                ) VALUES (
                    perm_name,
                    perm_desc,
                    action_name::auth_system.action_type,
                    'resource'::auth_system.scope_level,
                    r.id,
                    TRUE,
                    NOW(),
                    NOW()
                );
            ELSE
                -- Update existing permission
                UPDATE auth_system.auth_permissions
                SET description = perm_desc,
                    resource_id = r.id,
                    updated_at = NOW()
                WHERE id = existing_perm_id;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 6: Update the public view
-- ============================================================================
DROP VIEW IF EXISTS public.auth_resources;
CREATE VIEW public.auth_resources AS SELECT * FROM auth_system.auth_resources;

DROP VIEW IF EXISTS public.auth_permissions;
CREATE VIEW public.auth_permissions AS SELECT * FROM auth_system.auth_permissions;

-- ============================================================================
-- STEP 7: Add unique constraint on name (if not exists)
-- ============================================================================
-- Note: The unique constraint on name might already exist from the original schema

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Resources by module:' as info;
SELECT module, module_label, COUNT(*) as resource_count 
FROM auth_system.auth_resources 
WHERE is_active = TRUE AND key IS NOT NULL
GROUP BY module, module_label 
ORDER BY module;

SELECT 'Total permissions generated:' as info;
SELECT COUNT(*) as total_permissions FROM auth_system.auth_permissions;

SELECT 'Sample permissions:' as info;
SELECT name, description, action, resource_id 
FROM auth_system.auth_permissions 
LIMIT 10;
