-- ============================================================================
-- CLEAN AUTHENTICATION SYSTEM - No RLS Dependencies
-- ============================================================================

-- Drop everything first to start clean
DROP SCHEMA IF EXISTS auth_system CASCADE;
CREATE SCHEMA auth_system;

-- ============================================================================
-- STEP 1: Create ENUM Types
-- ============================================================================

CREATE TYPE auth_system.action_type AS ENUM (
    'read', 'create', 'update', 'delete', 'export', 'approve', 'managePermissions'
);

CREATE TYPE auth_system.scope_level AS ENUM (
    'global', 'resource', 'record', 'field'
);

CREATE TYPE auth_system.field_mode AS ENUM (
    'visible', 'editable', 'mask'
);

CREATE TYPE auth_system.mask_type AS ENUM (
    'full', 'partial', 'email', 'phone', 'number'
);

-- ============================================================================
-- STEP 2: Create Core Tables
-- ============================================================================

-- Users table
CREATE TABLE auth_system.auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'deactivated')),
    is_root_admin BOOLEAN DEFAULT FALSE,
    password_reset_required BOOLEAN DEFAULT FALSE,
    temporary_password TEXT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE auth_system.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_system.auth_users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Resources table
CREATE TABLE auth_system.auth_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    table_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource fields table
CREATE TABLE auth_system.auth_resource_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES auth_system.auth_resources(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50),
    is_sensitive BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource_id, field_name)
);

-- Roles table
CREATE TABLE auth_system.auth_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table
CREATE TABLE auth_system.auth_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_system.auth_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth_system.auth_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth_system.auth_users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_id)
);

-- Permissions table
CREATE TABLE auth_system.auth_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    action auth_system.action_type NOT NULL,
    scope_level auth_system.scope_level NOT NULL,
    resource_id UUID REFERENCES auth_system.auth_resources(id),
    field_id UUID REFERENCES auth_system.auth_resource_fields(id),
    field_mode auth_system.field_mode,
    mask_type auth_system.mask_type,
    is_allow BOOLEAN DEFAULT TRUE,
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions table
CREATE TABLE auth_system.auth_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES auth_system.auth_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth_system.auth_permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth_system.auth_users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User permissions table
CREATE TABLE auth_system.auth_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_system.auth_users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth_system.auth_permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth_system.auth_users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, permission_id)
);

-- Audit logs table
CREATE TABLE auth_system.auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_system.auth_users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id TEXT,
    details JSONB,
    outcome VARCHAR(20) DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'error')),
    ip_address INET,
    user_agent TEXT,
    is_super_admin_override BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password resets table
CREATE TABLE auth_system.auth_password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_system.auth_users(id) ON DELETE CASCADE,
    reset_by UUID NOT NULL REFERENCES auth_system.auth_users(id),
    temporary_password_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create Views in Public Schema for Easy Access
-- ============================================================================

CREATE VIEW public.auth_users AS SELECT * FROM auth_system.auth_users;
CREATE VIEW public.auth_sessions AS SELECT * FROM auth_system.auth_sessions;
CREATE VIEW public.auth_resources AS SELECT * FROM auth_system.auth_resources;
CREATE VIEW public.auth_resource_fields AS SELECT * FROM auth_system.auth_resource_fields;
CREATE VIEW public.auth_roles AS SELECT * FROM auth_system.auth_roles;
CREATE VIEW public.auth_user_roles AS SELECT * FROM auth_system.auth_user_roles;
CREATE VIEW public.auth_permissions AS SELECT * FROM auth_system.auth_permissions;
CREATE VIEW public.auth_role_permissions AS SELECT * FROM auth_system.auth_role_permissions;
CREATE VIEW public.auth_user_permissions AS SELECT * FROM auth_system.auth_user_permissions;
CREATE VIEW public.auth_audit_logs AS SELECT * FROM auth_system.auth_audit_logs;
CREATE VIEW public.auth_password_resets AS SELECT * FROM auth_system.auth_password_resets;

-- ============================================================================
-- STEP 4: Insert Root Admin (Yogesh Deora)
-- ============================================================================

INSERT INTO auth_system.auth_users (
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
    '$2a$12$placeholder.hash.will.be.updated.via.setup.page',
    'Yogesh Deora',
    '9830599005',
    'active',
    TRUE,
    NOW(),
    NOW()
);

-- ============================================================================
-- STEP 5: Create Protection Functions and Triggers
-- ============================================================================

-- Function to prevent root admin deletion
CREATE OR REPLACE FUNCTION auth_system.protect_root_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_root_admin = TRUE THEN
        RAISE EXCEPTION 'Root admin account cannot be deleted';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent root admin status changes
CREATE OR REPLACE FUNCTION auth_system.protect_root_admin_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_root_admin = TRUE AND NEW.status != 'active' THEN
        RAISE EXCEPTION 'Root admin status cannot be changed from active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER prevent_root_admin_deletion
    BEFORE DELETE ON auth_system.auth_users
    FOR EACH ROW
    EXECUTE FUNCTION auth_system.protect_root_admin();

CREATE TRIGGER prevent_root_admin_status_change
    BEFORE UPDATE ON auth_system.auth_users
    FOR EACH ROW
    EXECUTE FUNCTION auth_system.protect_root_admin_status();

-- ============================================================================
-- STEP 6: Insert Default Data
-- ============================================================================

-- Insert system resources
INSERT INTO auth_system.auth_resources (name, description, table_name) VALUES
    ('machines', 'Production Machines', 'machines'),
    ('molds', 'Production Molds', 'molds'),
    ('schedule_jobs', 'Production Schedule', 'schedule_jobs'),
    ('raw_materials', 'Raw Materials Inventory', 'raw_materials'),
    ('packing_materials', 'Packing Materials Inventory', 'packing_materials'),
    ('lines', 'Production Lines', 'lines'),
    ('units', 'Factory Units', 'units'),
    ('users', 'User Management', 'auth_users'),
    ('permissions', 'Permission Management', 'auth_permissions');

-- Insert default roles
INSERT INTO auth_system.auth_roles (name, description, is_system_role) VALUES
    ('super_admin', 'Root administrator with all permissions', TRUE),
    ('admin', 'Administrator with most permissions', TRUE),
    ('manager', 'Manager with limited admin permissions', TRUE),
    ('operator', 'Production operator with read/write access', TRUE),
    ('viewer', 'Read-only access to most resources', TRUE);

-- Assign super_admin role to Yogesh
INSERT INTO auth_system.auth_user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    r.id,
    '00000000-0000-0000-0000-000000000001'::uuid,
    NOW()
FROM auth_system.auth_roles r 
WHERE r.name = 'super_admin';

-- ============================================================================
-- STEP 7: Create Helper Functions
-- ============================================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.check_user_permission(
    p_user_id UUID,
    p_action TEXT,
    p_resource_name TEXT,
    p_field_name TEXT DEFAULT NULL,
    p_record_conditions JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_root_admin BOOLEAN := FALSE;
BEGIN
    -- Check if user is root admin (always has access)
    SELECT is_root_admin INTO v_is_root_admin
    FROM auth_system.auth_users
    WHERE id = p_user_id AND status = 'active';
    
    IF v_is_root_admin THEN
        RETURN TRUE;
    END IF;
    
    -- For now, return false for non-root admins
    -- This can be expanded later with full permission logic
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit actions
CREATE OR REPLACE FUNCTION public.log_audit_action(
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
    FROM auth_system.auth_users
    WHERE id = p_user_id;
    
    INSERT INTO auth_system.auth_audit_logs (
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
-- STEP 8: Create Indexes for Performance
-- ============================================================================

CREATE INDEX idx_auth_users_email ON auth_system.auth_users(email);
CREATE INDEX idx_auth_users_username ON auth_system.auth_users(username);
CREATE INDEX idx_auth_users_status ON auth_system.auth_users(status);
CREATE INDEX idx_auth_users_is_root_admin ON auth_system.auth_users(is_root_admin);

CREATE INDEX idx_auth_sessions_user_id ON auth_system.auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_token ON auth_system.auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires_at ON auth_system.auth_sessions(expires_at);
CREATE INDEX idx_auth_sessions_is_active ON auth_system.auth_sessions(is_active);

CREATE INDEX idx_auth_audit_logs_user_id ON auth_system.auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_action ON auth_system.auth_audit_logs(action);
CREATE INDEX idx_auth_audit_logs_created_at ON auth_system.auth_audit_logs(created_at);

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT 'SUCCESS: Clean authentication system created!' as status;
SELECT 'Root admin Yogesh Deora ready for setup at /setup' as message;
SELECT 'All tables created in auth_system schema with public views' as details;
