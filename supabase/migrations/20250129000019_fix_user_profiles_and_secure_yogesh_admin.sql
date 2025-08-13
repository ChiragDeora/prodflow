-- Fix user_profiles table and secure Yogesh Deora as permanent admin
-- This migration adds the missing phone_number column and ensures Yogesh Deora is always admin

-- Add phone_number column to existing user_profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone_number VARCHAR(20);
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add unique constraints if they don't exist
DO $$ 
BEGIN
    -- Add unique constraint on email if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_email_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
    END IF;
    
    -- Add unique constraint on phone_number if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_phone_number_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_phone_number_key UNIQUE (phone_number);
    END IF;
END $$;

-- Ensure Yogesh Deora exists and is admin
INSERT INTO user_profiles (id, full_name, email, phone_number, role, department, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Yogesh Deora',
    'yogesh@polypacks.in',
    '+919830599005',
    'admin',
    'Management',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    phone_number = '+919830599005',
    is_active = true,
    updated_at = NOW();

-- Create approved phone numbers table if it doesn't exist
CREATE TABLE IF NOT EXISTS approved_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    access_level VARCHAR(20) CHECK (access_level IN ('read', 'write', 'admin')) DEFAULT 'read',
    granted_by UUID REFERENCES user_profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- Create module_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS module_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    module_name VARCHAR(50) NOT NULL,
    access_level VARCHAR(20) CHECK (access_level IN ('blocked', 'read', 'write', 'admin')) DEFAULT 'read',
    granted_by UUID REFERENCES user_profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_name)
);

-- Insert default permissions for all modules
INSERT INTO permissions (name, description, module, action, resource) VALUES
-- Machine Master permissions
('machines.view', 'View machine master data', 'master-data', 'view', 'machines'),
('machines.create', 'Create new machines', 'master-data', 'create', 'machines'),
('machines.edit', 'Edit machine data', 'master-data', 'edit', 'machines'),
('machines.delete', 'Delete machines', 'master-data', 'delete', 'machines'),

-- Mold Master permissions
('molds.view', 'View mold master data', 'master-data', 'view', 'molds'),
('molds.create', 'Create new molds', 'master-data', 'create', 'molds'),
('molds.edit', 'Edit mold data', 'master-data', 'edit', 'molds'),
('molds.delete', 'Delete molds', 'master-data', 'delete', 'molds'),

-- Raw Materials permissions
('raw_materials.view', 'View raw materials data', 'master-data', 'view', 'raw_materials'),
('raw_materials.create', 'Create new raw materials', 'master-data', 'create', 'raw_materials'),
('raw_materials.edit', 'Edit raw materials data', 'master-data', 'edit', 'raw_materials'),
('raw_materials.delete', 'Delete raw materials', 'master-data', 'delete', 'raw_materials'),

-- Packing Materials permissions
('packing_materials.view', 'View packing materials data', 'master-data', 'view', 'packing_materials'),
('packing_materials.create', 'Create new packing materials', 'master-data', 'create', 'packing_materials'),
('packing_materials.edit', 'Edit packing materials data', 'master-data', 'edit', 'packing_materials'),
('packing_materials.delete', 'Delete packing materials', 'master-data', 'delete', 'packing_materials'),

-- Production Schedule permissions
('schedule.view', 'View production schedule', 'production-schedule', 'view', 'schedule'),
('schedule.create', 'Create new schedule entries', 'production-schedule', 'create', 'schedule'),
('schedule.edit', 'Edit schedule entries', 'production-schedule', 'edit', 'schedule'),
('schedule.delete', 'Delete schedule entries', 'production-schedule', 'delete', 'schedule'),
('schedule.approve', 'Approve schedule entries', 'production-schedule', 'approve', 'schedule'),

-- Operator Panel permissions
('operator.view', 'View operator panel', 'operator-panel', 'view', 'operator'),
('operator.update', 'Update production status', 'operator-panel', 'update', 'operator'),

-- Reports permissions
('reports.view', 'View reports', 'reports', 'view', 'reports'),
('reports.export', 'Export reports', 'reports', 'export', 'reports'),

-- Approvals permissions
('approvals.view', 'View approval requests', 'approvals', 'view', 'approvals'),
('approvals.approve', 'Approve requests', 'approvals', 'approve', 'approvals'),
('approvals.reject', 'Reject requests', 'approvals', 'reject', 'approvals'),

-- User Management permissions (admin only)
('users.view', 'View user management', 'admin', 'view', 'users'),
('users.create', 'Create new users', 'admin', 'create', 'users'),
('users.edit', 'Edit user data', 'admin', 'edit', 'users'),
('users.delete', 'Delete users', 'admin', 'delete', 'users'),
('users.permissions', 'Manage user permissions', 'admin', 'permissions', 'users'),

-- Profile permissions
('profile.view', 'View own profile', 'profile', 'view', 'profile'),
('profile.edit', 'Edit own profile', 'profile', 'edit', 'profile')
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to Yogesh Deora
INSERT INTO user_permissions (user_id, permission_id, access_level, granted_by)
SELECT 
    '00000000-0000-0000-0000-000000000002',
    p.id,
    'admin',
    '00000000-0000-0000-0000-000000000002'
FROM permissions p
ON CONFLICT (user_id, permission_id) DO UPDATE SET
    access_level = 'admin',
    updated_at = NOW();

-- Grant all module access to Yogesh Deora
INSERT INTO module_permissions (user_id, module_name, access_level, granted_by)
VALUES 
    ('00000000-0000-0000-0000-000000000002', 'master-data', 'admin', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', 'production-schedule', 'admin', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', 'operator-panel', 'admin', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', 'reports', 'admin', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', 'approvals', 'admin', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', 'admin', 'admin', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', 'profile', 'admin', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (user_id, module_name) DO UPDATE SET
    access_level = 'admin',
    updated_at = NOW();

-- Add Yogesh's phone number to approved list
INSERT INTO approved_phone_numbers (phone_number, approved_by, notes)
VALUES ('+919830599005', '00000000-0000-0000-0000-000000000002', 'Yogesh Deora - Permanent Admin')
ON CONFLICT (phone_number) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_approved_phone_numbers_phone ON approved_phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_user_id ON module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_module ON module_permissions(module_name);

-- Enable RLS on all new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for approved_phone_numbers
CREATE POLICY "Admins can manage approved phone numbers" ON approved_phone_numbers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for permissions (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for user_permissions
CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can manage all user permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- RLS Policies for module_permissions
CREATE POLICY "Users can view their own module permissions" ON module_permissions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can manage all module permissions" ON module_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Functions for access control
CREATE OR REPLACE FUNCTION check_user_permission(
    user_id UUID,
    permission_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = check_user_permission.user_id
        AND p.name = permission_name
        AND up.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_module_access(
    user_id UUID,
    module_name TEXT
) RETURNS TEXT AS $$
DECLARE
    access_level TEXT;
BEGIN
    SELECT mp.access_level INTO access_level
    FROM module_permissions mp
    WHERE mp.user_id = check_module_access.user_id
    AND mp.module_name = module_name
    AND mp.is_active = true;
    
    RETURN COALESCE(access_level, 'read');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_phone_approved(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM approved_phone_numbers
        WHERE phone_number = is_phone_approved.phone_number
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure Yogesh Deora is always admin
CREATE OR REPLACE FUNCTION ensure_yogesh_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is Yogesh Deora, ensure he's always admin
    IF NEW.email = 'yogesh@polypacks.in' THEN
        NEW.role := 'admin';
        NEW.is_active := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure Yogesh Deora is always admin
DROP TRIGGER IF EXISTS ensure_yogesh_admin_trigger ON user_profiles;
CREATE TRIGGER ensure_yogesh_admin_trigger
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_yogesh_admin();

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approved_phone_numbers_updated_at BEFORE UPDATE ON approved_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_permissions_updated_at BEFORE UPDATE ON module_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 