-- ============================================================================
-- UPDATE COLOR/LABEL MASTER TABLE STRUCTURE
-- Remove hex_code and description, add sr_no column
-- ============================================================================

-- Drop existing table and recreate with new structure
DROP TABLE IF EXISTS color_label_master CASCADE;

-- Recreate table with only sr_no and color_label columns
CREATE TABLE IF NOT EXISTS color_label_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sr_no INTEGER NOT NULL UNIQUE, -- Serial Number (1, 2, 3, ...)
    color_label VARCHAR(255) NOT NULL, -- Color / Label name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_color_label_master_sr_no ON color_label_master(sr_no);
CREATE INDEX IF NOT EXISTS idx_color_label_master_color_label ON color_label_master(color_label);

-- Disable RLS since the application uses custom authentication
-- This allows imports to work without Supabase's built-in auth
ALTER TABLE color_label_master DISABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_color_label_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_color_label_master_updated_at BEFORE UPDATE ON color_label_master
    FOR EACH ROW EXECUTE FUNCTION update_color_label_master_updated_at();
