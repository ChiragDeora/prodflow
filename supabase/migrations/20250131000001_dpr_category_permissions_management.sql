-- ============================================================================
-- DPR Category Permissions Management
-- ============================================================================
-- This migration ensures all DPR category permissions are properly set up
-- Uses the existing auth_permissions and auth_user_permissions tables

-- Ensure all DPR category permissions exist (using existing schema)
INSERT INTO auth_permissions (name, description, module, action, resource, created_at, updated_at)
VALUES
  -- Basic Info Category
  ('dpr.basic_info.view', 'View Basic Info columns in DPR (M/c No., Opt Name, Product, Cavity)', 'production', 'view', 'dpr_basic_info', NOW(), NOW()),
  -- Process Parameters Category
  ('dpr.process_params.view', 'View Process Parameters in DPR (Trg Cycle, Trg Run Time, Part Wt, Act part wt, Act Cycle)', 'production', 'view', 'dpr_process_params', NOW(), NOW()),
  -- Shots Category
  ('dpr.shots.view', 'View No of Shots columns in DPR (Start, End)', 'production', 'view', 'dpr_shots', NOW(), NOW()),
  -- Production Data Category
  ('dpr.production_data.view', 'View Production Data columns in DPR (Target Qty, Actual Qty, Ok Prod Qty, Ok Prod Kgs, Ok Prod %, Rej Kgs)', 'production', 'view', 'dpr_production_data', NOW(), NOW()),
  -- Runtime Category
  ('dpr.runtime.view', 'View Run Time columns in DPR (Run Time, Down time)', 'production', 'view', 'dpr_runtime', NOW(), NOW()),
  -- Stoppage Category
  ('dpr.stoppage.view', 'View Stoppage Time and Remarks columns in DPR (Reason, Start Time, End Time, Total Time, Mould change, REMARK)', 'production', 'view', 'dpr_stoppage', NOW(), NOW()),
  -- Settings Management
  ('dpr.settings.manage', 'Manage DPR column visibility settings', 'production', 'manage', 'dpr_settings', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Grant all DPR permissions to Yogesh Deora and root admins
DO $$
DECLARE
  yogesh_user_id UUID;
  dpr_permissions TEXT[] := ARRAY[
    'dpr.basic_info.view',
    'dpr.process_params.view',
    'dpr.shots.view',
    'dpr.production_data.view',
    'dpr.runtime.view',
    'dpr.stoppage.view',
    'dpr.settings.manage'
  ];
  perm_name TEXT;
BEGIN
  -- Find Yogesh Deora by email or username
  SELECT id INTO yogesh_user_id
  FROM auth_users
  WHERE LOWER(email) LIKE '%yogesh%' 
     OR LOWER(email) LIKE '%deora%'
     OR LOWER(full_name) LIKE '%yogesh%'
     OR LOWER(full_name) LIKE '%deora%'
     OR is_root_admin = true
  LIMIT 1;

  -- Grant permissions to Yogesh Deora
  IF yogesh_user_id IS NOT NULL THEN
    FOREACH perm_name IN ARRAY dpr_permissions
    LOOP
      INSERT INTO auth_user_permissions (user_id, permission_id, granted_by, granted_at, is_active)
      SELECT 
        yogesh_user_id,
        p.id,
        yogesh_user_id,
        NOW(),
        true
      FROM auth_permissions p
      WHERE p.name = perm_name
      ON CONFLICT (user_id, permission_id) DO UPDATE SET
        is_active = true,
        updated_at = NOW();
    END LOOP;
  END IF;

  -- Grant to all root admins
  INSERT INTO auth_user_permissions (user_id, permission_id, granted_by, granted_at, is_active)
  SELECT 
    u.id,
    p.id,
    u.id,
    NOW(),
    true
  FROM auth_users u
  CROSS JOIN auth_permissions p
  WHERE u.is_root_admin = true
    AND p.name = ANY(dpr_permissions)
  ON CONFLICT (user_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();
END $$;

-- Create a view for easy DPR permission management
CREATE OR REPLACE VIEW dpr_permissions_view AS
SELECT 
  p.id as permission_id,
  p.name as permission_name,
  p.description,
  p.module,
  p.action,
  p.resource,
  COUNT(DISTINCT up.user_id) as user_count,
  COUNT(DISTINCT CASE WHEN u.is_root_admin THEN u.id END) as root_admin_count
FROM auth_permissions p
LEFT JOIN auth_user_permissions up ON p.id = up.permission_id AND up.is_active = true
LEFT JOIN auth_users u ON up.user_id = u.id
WHERE p.name LIKE 'dpr.%'
GROUP BY p.id, p.name, p.description, p.module, p.action, p.resource
ORDER BY p.name;

-- Create a function to get all DPR permissions for a user
CREATE OR REPLACE FUNCTION get_user_dpr_permissions(p_user_id UUID)
RETURNS TABLE (
  permission_name TEXT,
  has_permission BOOLEAN,
  permission_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.name as permission_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM auth_user_permissions up 
        WHERE up.user_id = p_user_id 
          AND up.permission_id = p.id 
          AND up.is_active = true
      ) OR EXISTS (
        SELECT 1 FROM auth_users u
        WHERE u.id = p_user_id AND u.is_root_admin = true
      ) THEN TRUE
      ELSE FALSE
    END as has_permission,
    p.description as permission_description
  FROM auth_permissions p
  WHERE p.name LIKE 'dpr.%'
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to grant DPR permissions to a user
CREATE OR REPLACE FUNCTION grant_dpr_permission(
  p_user_id UUID,
  p_permission_name TEXT,
  p_granted_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_permission_id UUID;
BEGIN
  -- Get permission ID
  SELECT id INTO v_permission_id
  FROM auth_permissions
  WHERE name = p_permission_name;
  
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permission % does not exist', p_permission_name;
  END IF;
  
  -- Grant permission
  INSERT INTO auth_user_permissions (user_id, permission_id, granted_by, granted_at, is_active)
  VALUES (p_user_id, v_permission_id, p_granted_by, NOW(), true)
  ON CONFLICT (user_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to revoke DPR permissions from a user
CREATE OR REPLACE FUNCTION revoke_dpr_permission(
  p_user_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_permission_id UUID;
BEGIN
  -- Get permission ID
  SELECT id INTO v_permission_id
  FROM auth_permissions
  WHERE name = p_permission_name;
  
  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'Permission % does not exist', p_permission_name;
  END IF;
  
  -- Revoke permission (soft delete by setting is_active = false)
  UPDATE auth_user_permissions
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id AND permission_id = v_permission_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_dpr_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_dpr_permission(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_dpr_permission(UUID, TEXT) TO authenticated;

-- Add comments
COMMENT ON VIEW dpr_permissions_view IS 'View showing all DPR permissions with user counts';
COMMENT ON FUNCTION get_user_dpr_permissions(UUID) IS 'Get all DPR permissions for a specific user';
COMMENT ON FUNCTION grant_dpr_permission(UUID, TEXT, UUID) IS 'Grant a DPR permission to a user';
COMMENT ON FUNCTION revoke_dpr_permission(UUID, TEXT) IS 'Revoke a DPR permission from a user';

