-- Migration: Add DPR Category Permissions
-- This adds permissions for DPR column categories so Yogesh Deora can control which sections users can view

-- Insert DPR category permissions
INSERT INTO auth_permissions (name, description, module, action, resource, created_at, updated_at)
VALUES
  ('dpr.basic_info.view', 'View Basic Info columns in DPR (M/c No., Opt Name, Product, Cavity)', 'production', 'view', 'dpr_basic_info', NOW(), NOW()),
  ('dpr.process_params.view', 'View Process Parameters in DPR (Trg Cycle, Trg Run Time, Part Wt, Act part wt, Act Cycle)', 'production', 'view', 'dpr_process_params', NOW(), NOW()),
  ('dpr.shots.view', 'View No of Shots columns in DPR (Start, End)', 'production', 'view', 'dpr_shots', NOW(), NOW()),
  ('dpr.production_data.view', 'View Production Data columns in DPR (Target Qty, Actual Qty, Ok Prod Qty, Ok Prod Kgs, Ok Prod %, Rej Kgs)', 'production', 'view', 'dpr_production_data', NOW(), NOW()),
  ('dpr.runtime.view', 'View Run Time columns in DPR (Run Time, Down time)', 'production', 'view', 'dpr_runtime', NOW(), NOW()),
  ('dpr.stoppage.view', 'View Stoppage Time and Remarks columns in DPR (Reason, Start Time, End Time, Total Time, Mould change, REMARK)', 'production', 'view', 'dpr_stoppage', NOW(), NOW()),
  ('dpr.settings.manage', 'Manage DPR column visibility settings', 'production', 'manage', 'dpr_settings', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Grant all DPR permissions to Yogesh Deora (both possible user IDs)
-- First, find Yogesh Deora's user ID(s)
DO $$
DECLARE
  yogesh_user_id UUID;
BEGIN
  -- Try to find Yogesh Deora by email or username
  SELECT id INTO yogesh_user_id
  FROM auth_users
  WHERE LOWER(email) LIKE '%yogesh%' 
     OR LOWER(email) LIKE '%deora%'
     OR LOWER(full_name) LIKE '%yogesh%'
     OR LOWER(full_name) LIKE '%deora%'
     OR is_root_admin = true
  LIMIT 1;

  -- If found, grant all DPR permissions
  IF yogesh_user_id IS NOT NULL THEN
    INSERT INTO auth_user_permissions (user_id, permission_id, granted_by, granted_at, is_active)
    SELECT 
      yogesh_user_id,
      p.id,
      yogesh_user_id,
      NOW(),
      true
    FROM auth_permissions p
    WHERE p.name LIKE 'dpr.%'
    ON CONFLICT (user_id, permission_id) DO UPDATE SET
      is_active = true,
      updated_at = NOW();
  END IF;

  -- Also grant to all root admins
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
    AND p.name LIKE 'dpr.%'
  ON CONFLICT (user_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_auth_permissions_dpr ON auth_permissions(name) WHERE name LIKE 'dpr.%';

