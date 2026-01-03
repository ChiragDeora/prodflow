-- ============================================================================
-- CREATE PARTY COLOR MAPPING TABLE
-- Maps party names to available colors/labels
-- Example: Gesa party can have White, Black, Natural
--          Klex party can have one color
-- 
-- This table is used for BOTH regular production blocks AND changeover blocks.
-- When a party is selected (either for regular production or changeover),
-- this mapping determines which colors are available in the dropdown.
-- 
-- The same party_color_mapping is used regardless of whether it's for:
-- - Regular production block product colors
-- - Changeover block product colors (configured in "Changeover Party Name and Colors" section)
-- ============================================================================

-- Create junction table for party-color mapping
CREATE TABLE IF NOT EXISTS party_color_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_name_id UUID NOT NULL REFERENCES party_name_master(id) ON DELETE CASCADE,
    color_label_id UUID NOT NULL REFERENCES color_label_master(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(party_name_id, color_label_id) -- Prevent duplicate mappings
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_party_color_mapping_party ON party_color_mapping(party_name_id);
CREATE INDEX IF NOT EXISTS idx_party_color_mapping_color ON party_color_mapping(color_label_id);

-- Disable RLS since the application uses custom authentication
ALTER TABLE party_color_mapping DISABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_party_color_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_party_color_mapping_updated_at BEFORE UPDATE ON party_color_mapping
    FOR EACH ROW EXECUTE FUNCTION update_party_color_mapping_updated_at();

