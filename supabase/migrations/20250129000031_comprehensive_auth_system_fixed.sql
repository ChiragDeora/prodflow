-- ============================================================================
-- COMPREHENSIVE AUTHENTICATION & AUTHORIZATION SYSTEM (FIXED)
-- With Yogesh Deora as Protected Root Admin
-- ============================================================================

-- ============================================================================
-- STEP 1: Create ENUM Types First
-- ============================================================================

-- Actions that can be performed
DO $$ BEGIN
    CREATE TYPE action_type AS ENUM (
        'read', 'create', 'update', 'delete', 'export', 'approve', 'managePermissions'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Scope levels for permissions
DO $$ BEGIN
    CREATE TYPE scope_level AS ENUM (
        'global', 'resource', 'record', 'field'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Field visibility modes
DO $$ BEGIN
    CREATE TYPE field_mode AS ENUM (
        'visible', 'editable', 'mask'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Mask types for sensitive data
DO $$ BEGIN
    CREATE TYPE mask_type AS ENUM (
        'full', 'partial', 'email', 'phone', 'number'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Create Users Table with Enhanced Security
-- ============================================================================

-- Main users table for authentication
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt/argon2 hash
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'deactivated')),
    is_root_admin BOOLEAN DEFAULT FALSE,
    password_reset_required BOOLEAN DEFAULT FALSE,
    temporary_password TEXT NULL, -- For admin-generated temporary passwords
    last_login TIMESTAMP WITH TIME ZONE,
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create Sessions Table for Persistent Login
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- STEP 4: Create Resources and Permissions Tables
-- ============================================================================

-- Resources in the system
CREATE TABLE IF NOT EXISTS auth_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'machines', 'molds', 'schedule_jobs'
    description TEXT,
    table_name VARCHAR(100), -- Actual database table name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource fields for field-level permissions
CREATE TABLE IF NOT EXISTS auth_resource_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES auth_resources(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL, -- e.g., 'machine_id', 'capacity_tons'
    field_type VARCHAR(50), -- 'string', 'number', 'boolean', 'date', etc.
    is_sensitive BOOLEAN DEFAULT FALSE, -- Whether field contains sensitive data
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource_id, field_name)
);

-- Roles system
CREATE TABLE IF NOT EXISTS auth_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User role assignments
CREATE TABLE IF NOT EXISTS auth_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth_users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_id)
);

-- Granular permissions
CREATE TABLE IF NOT EXISTS auth_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Permission scope
    action action_type NOT NULL,
    scope_level scope_level NOT NULL,
    resource_id UUID REFERENCES auth_resources(id),
    field_id UUID REFERENCES auth_resource_fields(id),
    
    -- Field-specific settings
    field_mode field_mode,
    mask_type mask_type,
    
    -- Permission type
    is_allow BOOLEAN DEFAULT TRUE, -- TRUE for allow, FALSE for deny
    
    -- Conditions (JSON for ABAC - Attribute-Based Access Control)
    conditions JSONB, -- e.g., {"plant": "unit1", "line": "LINE-001"}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions
CREATE TABLE IF NOT EXISTS auth_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES auth_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth_permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth_users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Direct user permissions (overrides role permissions)
CREATE TABLE IF NOT EXISTS auth_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth_permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth_users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, permission_id)
);

-- ============================================================================
-- STEP 5: Create Audit Logging System
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_users(id),
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'create_user', 'grant_permission', etc.
    resource_type VARCHAR(100), -- 'auth_users', 'machines', 'molds', etc.
    resource_id TEXT, -- ID of the affected resource
    details JSONB, -- Additional details about the action
    outcome VARCHAR(20) DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'error')),
    ip_address INET,
    user_agent TEXT,
    is_super_admin_override BOOLEAN DEFAULT FALSE, -- Flag for Yogesh's actions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: Create Password Reset System
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    reset_by UUID NOT NULL REFERENCES auth_users(id), -- Only admins can reset
    temporary_password_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 7: Insert Root Admin (Yogesh Deora)
-- ============================================================================

-- Insert Yogesh Deora as the root admin
INSERT INTO auth_users (
    id,
    username,
    email,
    password_hash,
    full_name,
    phone,
    status,
    is_root_admin,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'yogesh',
    'yogesh@polypacks.in',
    '$2a$12$placeholder.hash.will.be.updated.via.setup.page', -- Placeholder, Yogesh will set via /setup
    'Yogesh Deora',
    '9830599005',
    'active',
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    status = 'active',
    is_root_admin = TRUE,
    updated_at = NOW();

-- ============================================================================
-- STEP 8: Create Protection Triggers for Root Admin
-- ============================================================================

-- Create trigger to prevent deletion of root admin
CREATE OR REPLACE FUNCTION protect_root_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_root_admin = TRUE THEN
        RAISE EXCEPTION 'Root admin account cannot be deleted';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_root_admin_deletion
    BEFORE DELETE ON auth_users
    FOR EACH ROW
    EXECUTE FUNCTION protect_root_admin();

-- Create trigger to prevent status changes on root admin
CREATE OR REPLACE FUNCTION protect_root_admin_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_root_admin = TRUE AND NEW.status != 'active' THEN
        RAISE EXCEPTION 'Root admin status cannot be changed from active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_root_admin_status_change
    BEFORE UPDATE ON auth_users
    FOR EACH ROW
    EXECUTE FUNCTION protect_root_admin_status();

-- ============================================================================
-- STEP 9: Insert Default Resources and Fields
-- ============================================================================

-- Insert system resources
INSERT INTO auth_resources (name, description, table_name) VALUES
    ('machines', 'Production Machines', 'machines'),
    ('molds', 'Production Molds', 'molds'),
    ('schedule_jobs', 'Production Schedule', 'schedule_jobs'),
    ('raw_materials', 'Raw Materials Inventory', 'raw_materials'),
    ('packing_materials', 'Packing Materials Inventory', 'packing_materials'),
    ('lines', 'Production Lines', 'lines'),
    ('units', 'Factory Units', 'units'),
    ('users', 'User Management', 'auth_users'),
    ('permissions', 'Permission Management', 'auth_permissions')
ON CONFLICT (name) DO NOTHING;

-- Insert common resource fields for machines
WITH machine_resource AS (SELECT id FROM auth_resources WHERE name = 'machines')
INSERT INTO auth_resource_fields (resource_id, field_name, field_type, is_sensitive, description) 
SELECT machine_resource.id, field_name, field_type, is_sensitive, description FROM machine_resource, (VALUES
    ('machine_id', 'string', FALSE, 'Machine identifier'),
    ('make', 'string', FALSE, 'Machine manufacturer'),
    ('model', 'string', FALSE, 'Machine model'),
    ('capacity_tons', 'number', FALSE, 'Machine capacity'),
    ('serial_no', 'string', TRUE, 'Serial number'),
    ('purchase_date', 'date', TRUE, 'Purchase date'),
    ('status', 'string', FALSE, 'Machine status')
) AS fields(field_name, field_type, is_sensitive, description)
ON CONFLICT (resource_id, field_name) DO NOTHING;

-- Insert default roles
INSERT INTO auth_roles (name, description, is_system_role) VALUES
    ('super_admin', 'Root administrator with all permissions', TRUE),
    ('admin', 'Administrator with most permissions', TRUE),
    ('manager', 'Manager with limited admin permissions', TRUE),
    ('operator', 'Production operator with read/write access', TRUE),
    ('viewer', 'Read-only access to most resources', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Assign super_admin role to Yogesh
INSERT INTO auth_user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    r.id,
    '00000000-0000-0000-0000-000000000001'::uuid,
    NOW()
FROM auth_roles r 
WHERE r.name = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================================================
-- STEP 10: Create Permission Check Functions
-- ============================================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_action action_type,
    p_resource_name TEXT,
    p_field_name TEXT DEFAULT NULL,
    p_record_conditions JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_root_admin BOOLEAN := FALSE;
    v_has_permission BOOLEAN := FALSE;
    v_resource_id UUID;
    v_field_id UUID;
BEGIN
    -- Check if user is root admin (always has access)
    SELECT is_root_admin INTO v_is_root_admin
    FROM auth_users
    WHERE id = p_user_id AND status = 'active';
    
    IF v_is_root_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Get resource ID
    SELECT id INTO v_resource_id
    FROM auth_resources
    WHERE name = p_resource_name;
    
    IF v_resource_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get field ID if field specified
    IF p_field_name IS NOT NULL THEN
        SELECT id INTO v_field_id
        FROM auth_resource_fields
        WHERE resource_id = v_resource_id AND field_name = p_field_name;
    END IF;
    
    -- Check deny permissions first (deny overrides allow)
    SELECT TRUE INTO v_has_permission
    FROM auth_permissions p
    JOIN auth_role_permissions rp ON p.id = rp.permission_id
    JOIN auth_user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
        AND ur.is_active = TRUE
        AND p.action = p_action
        AND p.resource_id = v_resource_id
        AND (p.field_id = v_field_id OR p.field_id IS NULL)
        AND p.is_allow = FALSE
        AND (p.conditions IS NULL OR p.conditions @> COALESCE(p_record_conditions, '{}'::jsonb))
    LIMIT 1;
    
    IF FOUND THEN
        RETURN FALSE; -- Deny permission found
    END IF;
    
    -- Check direct user deny permissions
    SELECT TRUE INTO v_has_permission
    FROM auth_permissions p
    JOIN auth_user_permissions up ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
        AND up.is_active = TRUE
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
        AND p.action = p_action
        AND p.resource_id = v_resource_id
        AND (p.field_id = v_field_id OR p.field_id IS NULL)
        AND p.is_allow = FALSE
        AND (p.conditions IS NULL OR p.conditions @> COALESCE(p_record_conditions, '{}'::jsonb))
    LIMIT 1;
    
    IF FOUND THEN
        RETURN FALSE; -- Direct deny permission found
    END IF;
    
    -- Check allow permissions from roles
    SELECT TRUE INTO v_has_permission
    FROM auth_permissions p
    JOIN auth_role_permissions rp ON p.id = rp.permission_id
    JOIN auth_user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND p.action = p_action
        AND p.resource_id = v_resource_id
        AND (p.field_id = v_field_id OR p.field_id IS NULL)
        AND p.is_allow = TRUE
        AND (p.conditions IS NULL OR p.conditions @> COALESCE(p_record_conditions, '{}'::jsonb))
    LIMIT 1;
    
    IF FOUND THEN
        RETURN TRUE;
    END IF;
    
    -- Check direct user allow permissions
    SELECT TRUE INTO v_has_permission
    FROM auth_permissions p
    JOIN auth_user_permissions up ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
        AND up.is_active = TRUE
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
        AND p.action = p_action
        AND p.resource_id = v_resource_id
        AND (p.field_id = v_field_id OR p.field_id IS NULL)
        AND p.is_allow = TRUE
        AND (p.conditions IS NULL OR p.conditions @> COALESCE(p_record_conditions, '{}'::jsonb))
    LIMIT 1;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit actions
CREATE OR REPLACE FUNCTION log_audit_action(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(100) DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_outcome VARCHAR(20) DEFAULT 'success',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_is_root_admin BOOLEAN := FALSE;
BEGIN
    -- Check if this is a root admin action
    SELECT is_root_admin INTO v_is_root_admin
    FROM auth_users
    WHERE id = p_user_id;
    
    INSERT INTO auth_audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        outcome,
        ip_address,
        user_agent,
        is_super_admin_override
    ) VALUES (
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_outcome,
        p_ip_address,
        p_user_agent,
        COALESCE(v_is_root_admin, FALSE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 11: Create RLS Policies
-- ============================================================================

-- Enable RLS on all auth tables
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_resource_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_password_resets ENABLE ROW LEVEL SECURITY;

-- RLS Policy for auth_users
CREATE POLICY "Root admin can manage all users" ON auth_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users root
            WHERE root.id = auth.uid()::uuid
                AND root.is_root_admin = TRUE
                AND root.status = 'active'
        )
    );

CREATE POLICY "Users can view their own profile" ON auth_users
    FOR SELECT USING (id = auth.uid()::uuid);

CREATE POLICY "Users can update their own profile" ON auth_users
    FOR UPDATE USING (id = auth.uid()::uuid)
    WITH CHECK (
        -- Users cannot change their own admin status or critical fields
        (OLD.is_root_admin = NEW.is_root_admin) AND
        (OLD.status = NEW.status OR NEW.status = 'active') AND
        (OLD.username = NEW.username) AND
        (OLD.email = NEW.email)
    );

-- RLS Policy for auth_sessions
CREATE POLICY "Users can manage their own sessions" ON auth_sessions
    FOR ALL USING (user_id = auth.uid()::uuid);

CREATE POLICY "Root admin can view all sessions" ON auth_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

-- RLS Policy for auth_audit_logs
CREATE POLICY "Root admin can view all audit logs" ON auth_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Users can view their own audit logs" ON auth_audit_logs
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Other tables default to admin-only access for now
CREATE POLICY "Admin only access" ON auth_resources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Admin only access" ON auth_resource_fields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Admin only access" ON auth_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Admin only access" ON auth_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Admin only access" ON auth_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Admin only access" ON auth_role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Admin only access" ON auth_user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

CREATE POLICY "Admin only access" ON auth_password_resets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users
            WHERE id = auth.uid()::uuid
                AND is_root_admin = TRUE
                AND status = 'active'
        )
    );

-- ============================================================================
-- STEP 12: Create Indexes for Performance
-- ============================================================================

-- Indexes for auth_users
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_auth_users_status ON auth_users(status);
CREATE INDEX IF NOT EXISTS idx_auth_users_is_root_admin ON auth_users(is_root_admin);

-- Indexes for auth_sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_is_active ON auth_sessions(is_active);

-- Indexes for permissions
CREATE INDEX IF NOT EXISTS idx_auth_permissions_action ON auth_permissions(action);
CREATE INDEX IF NOT EXISTS idx_auth_permissions_resource_id ON auth_permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_auth_permissions_field_id ON auth_permissions(field_id);
CREATE INDEX IF NOT EXISTS idx_auth_permissions_is_allow ON auth_permissions(is_allow);

-- Indexes for role and user permissions
CREATE INDEX IF NOT EXISTS idx_auth_user_roles_user_id ON auth_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_roles_role_id ON auth_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_roles_is_active ON auth_user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_auth_user_permissions_user_id ON auth_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_permissions_permission_id ON auth_user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_permissions_is_active ON auth_user_permissions(is_active);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_action ON auth_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON auth_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_resource_type ON auth_audit_logs(resource_type);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Comprehensive authentication system created!' as status;
SELECT 'Root admin Yogesh Deora has been set up with UUID: 00000000-0000-0000-0000-000000000001' as message;
SELECT 'Next steps: Set up API endpoints and update password hash for Yogesh' as next_steps;
