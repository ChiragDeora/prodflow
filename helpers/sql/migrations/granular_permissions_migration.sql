-- Granular Permissions System Migration
-- This creates a comprehensive role and permissions management system

-- Step 1: Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create user_permissions table for granular access
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Step 3: Create module_permissions table for module-level access
CREATE TABLE IF NOT EXISTS module_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Step 4: Insert default permissions for all modules
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

-- Step 5: Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies for permissions (read-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
CREATE POLICY "Authenticated users can view permissions" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Step 7: RLS Policies for user_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all user permissions" ON user_permissions;
CREATE POLICY "Admins can manage all user permissions" ON user_permissions
    FOR ALL USING (
        auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE auth_user_id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Step 8: RLS Policies for module_permissions
DROP POLICY IF EXISTS "Users can view their own module permissions" ON module_permissions;
CREATE POLICY "Users can view their own module permissions" ON module_permissions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all module permissions" ON module_permissions;
CREATE POLICY "Admins can manage all module permissions" ON module_permissions
    FOR ALL USING (
        auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE auth_user_id::text = auth.uid()::text AND role = 'admin'
        )
    );

-- Step 9: Functions for permission management
DROP FUNCTION IF EXISTS set_default_user_permissions(UUID);
CREATE OR REPLACE FUNCTION set_default_user_permissions(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Grant read access to all permissions by default
    INSERT INTO user_permissions (user_id, permission_id, access_level, granted_by)
    SELECT 
        target_user_id,
        p.id,
        'read',
        '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid
    FROM permissions p
    ON CONFLICT (user_id, permission_id) DO UPDATE SET
        access_level = EXCLUDED.access_level,
        updated_at = NOW();
    
    -- Grant read access to all modules by default
    INSERT INTO module_permissions (user_id, module_name, access_level, granted_by)
    VALUES 
        (target_user_id, 'master-data', 'read', '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid),
        (target_user_id, 'production-schedule', 'read', '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid),
        (target_user_id, 'operator-panel', 'read', '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid),
        (target_user_id, 'reports', 'read', '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid),
        (target_user_id, 'approvals', 'read', '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid),
        (target_user_id, 'profile', 'read', '224632d5-f27c-48d2-b38f-61c40c1acc21'::uuid)
    ON CONFLICT (user_id, module_name) DO UPDATE SET
        access_level = EXCLUDED.access_level,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Function to check user permissions
DROP FUNCTION IF EXISTS check_user_permission(UUID, TEXT);
CREATE OR REPLACE FUNCTION check_user_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = check_user_permission.user_id
        AND p.name = check_user_permission.permission_name
        AND up.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Function to check module access
DROP FUNCTION IF EXISTS check_module_access(UUID, TEXT);
CREATE OR REPLACE FUNCTION check_module_access(user_id UUID, module_name TEXT)
RETURNS TEXT AS $$
DECLARE
    access_level TEXT;
BEGIN
    SELECT mp.access_level INTO access_level
    FROM module_permissions mp
    WHERE mp.user_id = check_module_access.user_id
    AND mp.module_name = check_module_access.module_name
    AND mp.is_active = true;
    
    RETURN COALESCE(access_level, 'blocked');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_user_id ON module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_module ON module_permissions(module_name);

-- Step 13: Add updated_at triggers
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_module_permissions_updated_at ON module_permissions;
CREATE TRIGGER update_module_permissions_updated_at BEFORE UPDATE ON module_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 14: Set default permissions for existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM user_profiles WHERE is_active = true
    LOOP
        PERFORM set_default_user_permissions(user_record.id);
    END LOOP;
END $$;

-- Migration complete! Granular permissions system is now active. 