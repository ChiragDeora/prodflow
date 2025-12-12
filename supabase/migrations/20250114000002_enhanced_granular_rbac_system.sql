-- ============================================================================
-- ENHANCED GRANULAR RBAC SYSTEM FOR PRODUCTION SCHEDULER
-- Per-User Extremely Granular Permission Management
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Enhanced Permission Structure
-- ============================================================================

-- Create department enum for consistency
DO $$ BEGIN
    CREATE TYPE department_type AS ENUM (
        'store', 
        'production', 
        'planning_procurement', 
        'quality', 
        'maintenance', 
        'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add department field to users for organizational purposes (modify the actual table in auth_system schema)
ALTER TABLE auth_system.auth_users ADD COLUMN IF NOT EXISTS department department_type;
ALTER TABLE auth_system.auth_users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- Recreate the public view to include new columns
DROP VIEW IF EXISTS public.auth_users;
CREATE VIEW public.auth_users AS SELECT * FROM auth_system.auth_users;

-- ============================================================================
-- STEP 2: Seed Resources (Modules and Features)
-- ============================================================================

-- Clear existing resources to start fresh
DELETE FROM auth_resources;

-- Insert main modules
INSERT INTO auth_resources (id, name, description, table_name) VALUES
-- Master Data Module
('master-data', 'Master Data', 'Manage master data (machines, molds, materials, etc.)', 'master_data'),
('master-data-machines', 'Master Data - Machines', 'Machine master data management', 'machines'),
('master-data-molds', 'Master Data - Molds', 'Mold master data management', 'molds'),
('master-data-materials', 'Master Data - Materials', 'Material master data management', 'materials'),
('master-data-customers', 'Master Data - Customers', 'Customer master data management', 'customers'),

-- Store & Dispatch Module
('store-dispatch', 'Store & Dispatch', 'Manage store inventory and dispatch operations', 'store_dispatch'),
('store-dispatch-purchase', 'Store & Dispatch - Purchase', 'Purchase operations', 'purchase'),
('store-dispatch-purchase-vrf', 'Store & Dispatch - VRF', 'Vendor Receipt Form management', 'vrf'),
('store-dispatch-purchase-indent', 'Store & Dispatch - Indent', 'Material indent management', 'material_indent_slips'),
('store-dispatch-purchase-po', 'Store & Dispatch - Purchase Order', 'Purchase order management', 'purchase_orders'),
('store-dispatch-purchase-open-indent', 'Store & Dispatch - Open Indent', 'Open indent tracking', 'open_indents'),
('store-dispatch-inward', 'Store & Dispatch - Inward', 'Inward operations', 'inward'),
('store-dispatch-inward-grn', 'Store & Dispatch - GRN', 'Goods Receipt Note management', 'grn'),
('store-dispatch-inward-jw-grn', 'Store & Dispatch - JW GRN', 'Job Work GRN management', 'jw_grn'),
('store-dispatch-outward', 'Store & Dispatch - Outward', 'Outward operations', 'outward'),
('store-dispatch-outward-mis', 'Store & Dispatch - MIS', 'Material Issue Slip management', 'mis'),
('store-dispatch-outward-job-work-challan', 'Store & Dispatch - Job Work Challan', 'Job work challan management', 'job_work_challan'),
('store-dispatch-outward-delivery-challan', 'Store & Dispatch - Delivery Challan', 'Delivery challan management', 'delivery_challan'),
('store-dispatch-outward-dispatch-memo', 'Store & Dispatch - Dispatch Memo', 'Dispatch memo management', 'dispatch_memo'),

-- Production Module
('production', 'Production', 'Production management and monitoring', 'production'),
('production-daily-report', 'Production - Daily Report', 'Daily production reporting', 'daily_production_reports'),
('production-schedule', 'Production - Schedule', 'Production scheduling', 'production_schedules'),
('production-analytics', 'Production - Analytics', 'Production analytics and metrics', 'production_analytics'),
('production-resources', 'Production - Resources', 'Production resource management', 'production_resources'),
('production-settings', 'Production - Settings', 'Production configuration settings', 'production_settings'),

-- Operator Panel Module
('operator-panel', 'Operator Panel', 'Production floor operations', 'operator_panel'),
('operator-panel-jobs', 'Operator Panel - Jobs', 'Job management for operators', 'operator_jobs'),
('operator-panel-completion', 'Operator Panel - Job Completion', 'Mark jobs as completed', 'job_completions'),

-- Maintenance Management Module
('maintenance', 'Maintenance Management', 'Maintenance tasks and schedules', 'maintenance'),
('maintenance-work-orders', 'Maintenance - Work Orders', 'Maintenance work order management', 'maintenance_work_orders'),
('maintenance-schedules', 'Maintenance - Schedules', 'Maintenance scheduling', 'maintenance_schedules'),
('maintenance-checklists', 'Maintenance - Checklists', 'Maintenance checklist management', 'maintenance_checklists'),
('maintenance-equipment', 'Maintenance - Equipment', 'Equipment maintenance tracking', 'maintenance_equipment'),

-- Quality Control Module
('quality', 'Quality Control', 'Quality inspections and standards', 'quality_control'),
('quality-inspections', 'Quality - Inspections', 'Quality inspection management', 'quality_inspections'),
('quality-standards', 'Quality - Standards', 'Quality standards management', 'quality_standards'),
('quality-checklists', 'Quality - Checklists', 'Quality checklist management', 'quality_checklists'),
('quality-reports', 'Quality - Reports', 'Quality reporting', 'quality_reports'),

-- Prod Planner Module
('prod-planner', 'Production Planner', 'Visual monthly production line scheduling', 'prod_planner'),
('prod-planner-schedule', 'Prod Planner - Schedule', 'Production line scheduling', 'production_line_schedules'),
('prod-planner-capacity', 'Prod Planner - Capacity', 'Production capacity planning', 'capacity_planning'),

-- Approvals Module
('approvals', 'Approvals', 'Review completed jobs and workflows', 'approvals'),
('approvals-production', 'Approvals - Production', 'Production approvals', 'production_approvals'),
('approvals-quality', 'Approvals - Quality', 'Quality approvals', 'quality_approvals'),
('approvals-maintenance', 'Approvals - Maintenance', 'Maintenance approvals', 'maintenance_approvals'),
('approvals-store', 'Approvals - Store', 'Store & dispatch approvals', 'store_approvals'),

-- Reports Module
('reports', 'Reports', 'Analytics and insights', 'reports'),
('reports-production', 'Reports - Production', 'Production reports', 'production_reports'),
('reports-quality', 'Reports - Quality', 'Quality reports', 'quality_reports'),
('reports-inventory', 'Reports - Inventory', 'Inventory reports', 'inventory_reports'),
('reports-maintenance', 'Reports - Maintenance', 'Maintenance reports', 'maintenance_reports'),
('reports-financial', 'Reports - Financial', 'Financial reports', 'financial_reports'),

-- Profile/User Management Module
('profile', 'User Profile', 'User profile and account management', 'user_profiles'),
('user-management', 'User Management', 'User administration (Admin only)', 'user_management'),
('system-config', 'System Configuration', 'System configuration (Admin only)', 'system_config');

-- ============================================================================
-- STEP 3: Create Resource Fields for Field-Level Permissions
-- ============================================================================

-- Clear existing resource fields
DELETE FROM auth_resource_fields;

-- VRF Form Fields
INSERT INTO auth_resource_fields (resource_id, field_name, field_type, is_sensitive, description) VALUES
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'job_work_party_name', 'string', false, 'Job Work Party Name'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'jw_annexure_no', 'string', false, 'JW Annexure Number'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'jw_annexure_date', 'date', false, 'JW Annexure Date'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'challan_no', 'string', false, 'Challan Number'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'challan_date', 'date', false, 'Challan Date'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'type_of_material', 'string', false, 'Type of Material'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'item_description', 'string', false, 'Item Description'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'box_bag_qty', 'number', false, 'Box/Bag Quantity'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'per_box_bag_qty', 'number', false, 'Per Box/Bag Quantity'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'total_qty', 'number', false, 'Total Quantity'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'uom', 'string', false, 'Unit of Measurement'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'remarks', 'string', false, 'Remarks'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'grn_no', 'string', true, 'GRN Number'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'received_by', 'string', true, 'Received By'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'verified_by', 'string', true, 'Verified By'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - VRF'), 'date', 'date', false, 'Date');

-- GRN Form Fields
INSERT INTO auth_resource_fields (resource_id, field_name, field_type, is_sensitive, description) VALUES
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'supplier_name', 'string', false, 'Supplier Name'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'invoice_no', 'string', false, 'Invoice Number'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'invoice_date', 'date', false, 'Invoice Date'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'po_number', 'string', false, 'Purchase Order Number'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'material_description', 'string', false, 'Material Description'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'quantity_received', 'number', false, 'Quantity Received'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'unit_price', 'number', true, 'Unit Price'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'total_amount', 'number', true, 'Total Amount'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'quality_status', 'string', false, 'Quality Status'),
((SELECT id FROM auth_resources WHERE name = 'Store & Dispatch - GRN'), 'storage_location', 'string', false, 'Storage Location');

-- Production Daily Report Fields
INSERT INTO auth_resource_fields (resource_id, field_name, field_type, is_sensitive, description) VALUES
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'machine_id', 'string', false, 'Machine ID'),
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'operator_name', 'string', false, 'Operator Name'),
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'shift', 'string', false, 'Shift'),
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'production_qty', 'number', false, 'Production Quantity'),
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'rejection_qty', 'number', false, 'Rejection Quantity'),
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'downtime_hours', 'number', false, 'Downtime Hours'),
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'efficiency_percentage', 'number', true, 'Efficiency Percentage'),
((SELECT id FROM auth_resources WHERE name = 'Production - Daily Report'), 'remarks', 'string', false, 'Remarks');

-- Quality Inspection Fields
INSERT INTO auth_resource_fields (resource_id, field_name, field_type, is_sensitive, description) VALUES
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'inspection_type', 'string', false, 'Inspection Type'),
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'batch_number', 'string', false, 'Batch Number'),
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'inspector_name', 'string', false, 'Inspector Name'),
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'inspection_result', 'string', false, 'Inspection Result'),
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'defect_count', 'number', false, 'Defect Count'),
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'sample_size', 'number', false, 'Sample Size'),
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'pass_fail_status', 'string', false, 'Pass/Fail Status'),
((SELECT id FROM auth_resources WHERE name = 'Quality - Inspections'), 'corrective_action', 'string', false, 'Corrective Action');

-- Maintenance Work Order Fields
INSERT INTO auth_resource_fields (resource_id, field_name, field_type, is_sensitive, description) VALUES
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'equipment_id', 'string', false, 'Equipment ID'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'maintenance_type', 'string', false, 'Maintenance Type'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'priority', 'string', false, 'Priority'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'assigned_technician', 'string', false, 'Assigned Technician'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'estimated_hours', 'number', false, 'Estimated Hours'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'actual_hours', 'number', false, 'Actual Hours'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'parts_cost', 'number', true, 'Parts Cost'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'labor_cost', 'number', true, 'Labor Cost'),
((SELECT id FROM auth_resources WHERE name = 'Maintenance - Work Orders'), 'completion_status', 'string', false, 'Completion Status');

-- ============================================================================
-- STEP 4: Create Granular Permissions
-- ============================================================================

-- Clear existing permissions to start fresh
DELETE FROM auth_permissions;

-- Function to create permissions for a resource
CREATE OR REPLACE FUNCTION create_resource_permissions(
    resource_name TEXT,
    resource_id_param UUID,
    include_approve BOOLEAN DEFAULT true,
    include_export BOOLEAN DEFAULT true
) RETURNS VOID AS $$
BEGIN
    -- Read permission
    INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, is_allow)
    VALUES (
        resource_name || '.read',
        'Read access to ' || resource_name,
        'read',
        'resource',
        resource_id_param,
        true
    );
    
    -- Create permission
    INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, is_allow)
    VALUES (
        resource_name || '.create',
        'Create access to ' || resource_name,
        'create',
        'resource',
        resource_id_param,
        true
    );
    
    -- Update permission
    INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, is_allow)
    VALUES (
        resource_name || '.update',
        'Update access to ' || resource_name,
        'update',
        'resource',
        resource_id_param,
        true
    );
    
    -- Delete permission
    INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, is_allow)
    VALUES (
        resource_name || '.delete',
        'Delete access to ' || resource_name,
        'delete',
        'resource',
        resource_id_param,
        true
    );
    
    -- Approve permission (if applicable)
    IF include_approve THEN
        INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (
            resource_name || '.approve',
            'Approve access to ' || resource_name,
            'approve',
            'resource',
            resource_id_param,
            true
        );
    END IF;
    
    -- Export permission (if applicable)
    IF include_export THEN
        INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, is_allow)
        VALUES (
            resource_name || '.export',
            'Export access to ' || resource_name,
            'export',
            'resource',
            resource_id_param,
            true
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create permissions for all resources
DO $$
DECLARE
    resource_record RECORD;
BEGIN
    FOR resource_record IN SELECT id, name FROM auth_resources LOOP
        PERFORM create_resource_permissions(
            resource_record.name,
            resource_record.id,
            true, -- include approve
            true  -- include export
        );
    END LOOP;
END $$;

-- Create field-level permissions for sensitive fields
INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, field_id, field_mode, is_allow)
SELECT 
    r.name || '.' || rf.field_name || '.visible',
    'Visibility permission for ' || rf.field_name || ' in ' || r.name,
    'read',
    'field',
    r.id,
    rf.id,
    'visible',
    true
FROM auth_resources r
JOIN auth_resource_fields rf ON r.id = rf.resource_id
WHERE rf.is_sensitive = true;

INSERT INTO auth_permissions (name, description, action, scope_level, resource_id, field_id, field_mode, is_allow)
SELECT 
    r.name || '.' || rf.field_name || '.editable',
    'Edit permission for ' || rf.field_name || ' in ' || r.name,
    'update',
    'field',
    r.id,
    rf.id,
    'editable',
    true
FROM auth_resources r
JOIN auth_resource_fields rf ON r.id = rf.resource_id;

-- ============================================================================
-- STEP 5: Create Department-Based Role Templates
-- ============================================================================

-- Clear existing roles except system roles
DELETE FROM auth_roles WHERE is_system_role = false;

-- Insert department-based role templates
INSERT INTO auth_roles (name, description, is_system_role) VALUES
-- Store Department Roles
('store_maker', 'Store Department - Maker (Can create/edit store documents)', false),
('store_checker', 'Store Department - Checker (Can approve store documents)', false),
('store_viewer', 'Store Department - Viewer (Read-only store access)', false),

-- Production Department Roles
('production_maker', 'Production Department - Maker (Can create/edit production data)', false),
('production_checker', 'Production Department - Checker (Can approve production data)', false),
('production_viewer', 'Production Department - Viewer (Read-only production access)', false),

-- Planning/Procurement Department Roles
('planning_maker', 'Planning Department - Maker (Can create/edit plans and procurement)', false),
('planning_checker', 'Planning Department - Checker (Can approve plans and procurement)', false),
('planning_viewer', 'Planning Department - Viewer (Read-only planning access)', false),

-- Quality Department Roles
('quality_maker', 'Quality Department - Maker (Can create/edit quality data)', false),
('quality_checker', 'Quality Department - Checker (Can approve quality data)', false),
('quality_viewer', 'Quality Department - Viewer (Read-only quality access)', false),

-- Maintenance Department Roles
('maintenance_maker', 'Maintenance Department - Maker (Can create/edit maintenance data)', false),
('maintenance_checker', 'Maintenance Department - Checker (Can approve maintenance data)', false),
('maintenance_viewer', 'Maintenance Department - Viewer (Read-only maintenance access)', false),

-- Admin Department Roles
('admin_full', 'Admin Department - Full Access (Complete system access)', false),
('admin_manager', 'Admin Department - Manager (Administrative oversight)', false),
('admin_viewer', 'Admin Department - Viewer (Read-only admin access)', false);

-- ============================================================================
-- STEP 6: Create Permission Templates
-- ============================================================================

-- Create permission templates table
CREATE TABLE IF NOT EXISTS auth_permission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    department department_type,
    role_type VARCHAR(50), -- 'maker', 'checker', 'viewer'
    permissions JSONB NOT NULL, -- Array of permission IDs
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 7: Create User Permission History for Audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_user_permission_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth_permissions(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('granted', 'revoked', 'modified')),
    granted_by UUID REFERENCES auth_users(id),
    previous_value JSONB, -- For modifications
    new_value JSONB, -- For modifications
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 8: Create Indexes for Performance
-- ============================================================================

-- Indexes for permission lookups
CREATE INDEX IF NOT EXISTS idx_auth_permissions_resource_action ON auth_permissions(resource_id, action);
CREATE INDEX IF NOT EXISTS idx_auth_permissions_field_mode ON auth_permissions(field_id, field_mode);
CREATE INDEX IF NOT EXISTS idx_auth_user_permissions_user_active ON auth_user_permissions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_auth_user_permission_history_user_date ON auth_user_permission_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_users_department ON auth_system.auth_users(department);

-- ============================================================================
-- STEP 9: Update Yogesh's Profile
-- ============================================================================

-- Update Yogesh Deora's profile with admin department (update the actual table in auth_system schema)
UPDATE auth_system.auth_users 
SET 
    department = 'admin',
    job_title = 'Chief Executive Officer & Root Administrator',
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- STEP 10: Create Helper Functions
-- ============================================================================

-- Function to get user permissions with field-level details
CREATE OR REPLACE FUNCTION get_user_permissions_detailed(user_id_param UUID)
RETURNS TABLE (
    permission_id UUID,
    permission_name VARCHAR,
    description TEXT,
    action action_type,
    scope_level scope_level,
    resource_name VARCHAR,
    field_name VARCHAR,
    field_mode field_mode,
    is_allow BOOLEAN,
    conditions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as permission_id,
        p.name as permission_name,
        p.description,
        p.action,
        p.scope_level,
        r.name as resource_name,
        rf.field_name,
        p.field_mode,
        p.is_allow,
        p.conditions
    FROM auth_permissions p
    LEFT JOIN auth_resources r ON p.resource_id = r.id
    LEFT JOIN auth_resource_fields rf ON p.field_id = rf.id
    WHERE p.id IN (
        -- Direct user permissions
        SELECT up.permission_id 
        FROM auth_user_permissions up 
        WHERE up.user_id = user_id_param 
        AND up.is_active = true
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
        
        UNION
        
        -- Role-based permissions
        SELECT rp.permission_id
        FROM auth_role_permissions rp
        JOIN auth_user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = user_id_param
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION check_user_permission_detailed(
    user_id_param UUID,
    permission_name_param VARCHAR,
    resource_name_param VARCHAR DEFAULT NULL,
    field_name_param VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    is_root_admin BOOLEAN := FALSE;
BEGIN
    -- Check if user is root admin (Yogesh)
    SELECT is_root_admin INTO is_root_admin
    FROM auth_system.auth_users
    WHERE id = user_id_param;
    
    -- Root admin always has all permissions
    IF is_root_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Check for deny permissions first (deny always wins)
    SELECT TRUE INTO has_permission
    FROM auth_permissions p
    LEFT JOIN auth_resources r ON p.resource_id = r.id
    LEFT JOIN auth_resource_fields rf ON p.field_id = rf.id
    WHERE p.name = permission_name_param
    AND (resource_name_param IS NULL OR r.name = resource_name_param)
    AND (field_name_param IS NULL OR rf.field_name = field_name_param)
    AND p.is_allow = FALSE
    AND p.id IN (
        SELECT up.permission_id FROM auth_user_permissions up 
        WHERE up.user_id = user_id_param AND up.is_active = true
        UNION
        SELECT rp.permission_id FROM auth_role_permissions rp
        JOIN auth_user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = user_id_param AND ur.is_active = true
    );
    
    -- If deny permission found, return false
    IF has_permission THEN
        RETURN FALSE;
    END IF;
    
    -- Check for allow permissions
    SELECT TRUE INTO has_permission
    FROM auth_permissions p
    LEFT JOIN auth_resources r ON p.resource_id = r.id
    LEFT JOIN auth_resource_fields rf ON p.field_id = rf.id
    WHERE p.name = permission_name_param
    AND (resource_name_param IS NULL OR r.name = resource_name_param)
    AND (field_name_param IS NULL OR rf.field_name = field_name_param)
    AND p.is_allow = TRUE
    AND p.id IN (
        SELECT up.permission_id FROM auth_user_permissions up 
        WHERE up.user_id = user_id_param AND up.is_active = true
        UNION
        SELECT rp.permission_id FROM auth_role_permissions rp
        JOIN auth_user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = user_id_param AND ur.is_active = true
    );
    
    RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS create_resource_permissions(TEXT, UUID, BOOLEAN, BOOLEAN);

-- ============================================================================
-- STEP 11: Create Sample Permission Templates
-- ============================================================================

-- Store Department Templates
INSERT INTO auth_permission_templates (name, description, department, role_type, permissions, created_by) VALUES
(
    'Store Maker Template',
    'Standard permissions for Store Department Makers',
    'store',
    'maker',
    (SELECT jsonb_agg(id) FROM auth_permissions WHERE name LIKE 'Store & Dispatch%' AND action IN ('read', 'create', 'update')),
    '00000000-0000-0000-0000-000000000001'
),
(
    'Store Checker Template',
    'Standard permissions for Store Department Checkers',
    'store',
    'checker',
    (SELECT jsonb_agg(id) FROM auth_permissions WHERE name LIKE 'Store & Dispatch%' AND action IN ('read', 'approve')),
    '00000000-0000-0000-0000-000000000001'
),
(
    'Store Viewer Template',
    'Standard permissions for Store Department Viewers',
    'store',
    'viewer',
    (SELECT jsonb_agg(id) FROM auth_permissions WHERE name LIKE 'Store & Dispatch%' AND action = 'read'),
    '00000000-0000-0000-0000-000000000001'
);

COMMIT;
