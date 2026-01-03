-- ============================================================================
-- DPR User View Settings
-- ============================================================================
-- Stores per-user DPR dashboard/view configuration (which metrics/columns
-- are visible on the Daily Production Report screen).
--
-- This is *view-only* configuration and does NOT affect what data is stored
-- in DPR tables; it only controls which widgets/columns are shown per user.

CREATE TABLE IF NOT EXISTS dpr_user_view_settings (
  user_id UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  field_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at in sync on changes
CREATE OR REPLACE FUNCTION set_dpr_user_view_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dpr_user_view_settings_updated_at
ON dpr_user_view_settings;

CREATE TRIGGER trg_dpr_user_view_settings_updated_at
BEFORE UPDATE ON dpr_user_view_settings
FOR EACH ROW
EXECUTE FUNCTION set_dpr_user_view_settings_updated_at();

COMMENT ON TABLE dpr_user_view_settings IS
  'Per-user DPR dashboard view settings (which metrics/columns are visible).';


