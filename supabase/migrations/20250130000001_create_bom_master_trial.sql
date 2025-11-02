-- Create trial BOM Master system with immutability and versioning
-- This is a trial implementation that can be completely removed before production

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create BOM Master Trial table
CREATE TABLE IF NOT EXISTS bom_master_trial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_lineage_id UUID NOT NULL, -- Groups versions of the same BOM
    product_code VARCHAR(100) NOT NULL, -- Product identifier
    product_name VARCHAR(200) NOT NULL, -- Product name
    category VARCHAR(20) NOT NULL CHECK (category IN ('SFG', 'FG', 'LOCAL')), -- BOM category
    description TEXT, -- BOM description
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'released', 'archived')),
    created_by VARCHAR(100) NOT NULL, -- User who created the BOM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique product_code + category + bom_lineage_id combination
    UNIQUE(product_code, category, bom_lineage_id)
);

-- Create BOM Versions Trial table
CREATE TABLE IF NOT EXISTS bom_versions_trial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_master_id UUID NOT NULL REFERENCES bom_master_trial(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL, -- Sequential version (1, 2, 3, etc.)
    version_name VARCHAR(50), -- Optional version name (e.g., "v1.0", "Initial Release")
    is_active BOOLEAN NOT NULL DEFAULT false, -- Only one version can be active per BOM lineage
    components JSONB NOT NULL DEFAULT '[]', -- Array of BOM components
    total_components INTEGER NOT NULL DEFAULT 0, -- Count of components
    total_cost DECIMAL(15,2) DEFAULT 0, -- Total BOM cost
    notes TEXT, -- Version-specific notes
    change_reason TEXT, -- Reason for this version
    created_by VARCHAR(100) NOT NULL, -- User who created this version
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique version per BOM lineage
    UNIQUE(bom_master_id, version_number)
);

-- Create BOM Components Trial table (for detailed component tracking)
CREATE TABLE IF NOT EXISTS bom_components_trial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_version_id UUID NOT NULL REFERENCES bom_versions_trial(id) ON DELETE CASCADE,
    component_code VARCHAR(100) NOT NULL, -- Component identifier
    component_name VARCHAR(200) NOT NULL, -- Component name
    component_type VARCHAR(50) NOT NULL, -- raw_material, packing_material, sub_assembly, etc.
    quantity DECIMAL(10,4) NOT NULL, -- Required quantity
    unit_of_measure VARCHAR(20) NOT NULL, -- kg, pcs, m, etc.
    unit_cost DECIMAL(10,4) DEFAULT 0, -- Cost per unit
    total_cost DECIMAL(15,2) DEFAULT 0, -- Total cost for this component
    supplier VARCHAR(100), -- Supplier information
    lead_time_days INTEGER, -- Lead time in days
    is_critical BOOLEAN DEFAULT false, -- Critical component flag
    notes TEXT, -- Component-specific notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BOM Audit Trail Trial table (for complete immutability tracking)
CREATE TABLE IF NOT EXISTS bom_audit_trial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL, -- bom_master_trial, bom_versions_trial, bom_components_trial
    record_id UUID NOT NULL, -- ID of the affected record
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB, -- Previous values (for updates/deletes)
    new_values JSONB, -- New values (for inserts/updates)
    changed_by VARCHAR(100) NOT NULL, -- User who made the change
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT, -- Reason for the change
    ip_address INET, -- IP address of the user
    user_agent TEXT -- User agent string
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_product_code ON bom_master_trial(product_code);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_category ON bom_master_trial(category);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_lineage ON bom_master_trial(bom_lineage_id);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_status ON bom_master_trial(status);
CREATE INDEX IF NOT EXISTS idx_bom_master_trial_created_by ON bom_master_trial(created_by);

CREATE INDEX IF NOT EXISTS idx_bom_versions_trial_master_id ON bom_versions_trial(bom_master_id);
CREATE INDEX IF NOT EXISTS idx_bom_versions_trial_version ON bom_versions_trial(version_number);
CREATE INDEX IF NOT EXISTS idx_bom_versions_trial_active ON bom_versions_trial(is_active);
CREATE INDEX IF NOT EXISTS idx_bom_versions_trial_created_by ON bom_versions_trial(created_by);

CREATE INDEX IF NOT EXISTS idx_bom_components_trial_version_id ON bom_components_trial(bom_version_id);
CREATE INDEX IF NOT EXISTS idx_bom_components_trial_code ON bom_components_trial(component_code);
CREATE INDEX IF NOT EXISTS idx_bom_components_trial_type ON bom_components_trial(component_type);
CREATE INDEX IF NOT EXISTS idx_bom_components_trial_critical ON bom_components_trial(is_critical);

CREATE INDEX IF NOT EXISTS idx_bom_audit_trial_table_record ON bom_audit_trial(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_bom_audit_trial_changed_by ON bom_audit_trial(changed_by);
CREATE INDEX IF NOT EXISTS idx_bom_audit_trial_changed_at ON bom_audit_trial(changed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE bom_master_trial ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_versions_trial ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_components_trial ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_audit_trial ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow all for authenticated users on bom_master_trial" ON bom_master_trial
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users on bom_versions_trial" ON bom_versions_trial
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users on bom_components_trial" ON bom_components_trial
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users on bom_audit_trial" ON bom_audit_trial
    FOR ALL USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_bom_master_trial_updated_at BEFORE UPDATE ON bom_master_trial
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_versions_trial_updated_at BEFORE UPDATE ON bom_versions_trial
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_components_trial_updated_at BEFORE UPDATE ON bom_components_trial
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_bom_trial_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_name TEXT;
BEGIN
    -- Get current user, fallback to 'system' if not available
    BEGIN
        current_user_name := current_setting('app.current_user', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_name := 'system';
    END;
    
    -- If still null, use auth.uid() or fallback to 'system'
    IF current_user_name IS NULL THEN
        current_user_name := COALESCE(auth.uid()::text, 'system');
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO bom_audit_trial (table_name, record_id, action, old_values, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), current_user_name, NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO bom_audit_trial (table_name, record_id, action, old_values, new_values, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user_name, NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO bom_audit_trial (table_name, record_id, action, new_values, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), current_user_name, NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER audit_bom_master_trial_changes
    AFTER INSERT OR UPDATE OR DELETE ON bom_master_trial
    FOR EACH ROW EXECUTE FUNCTION audit_bom_trial_changes();

CREATE TRIGGER audit_bom_versions_trial_changes
    AFTER INSERT OR UPDATE OR DELETE ON bom_versions_trial
    FOR EACH ROW EXECUTE FUNCTION audit_bom_trial_changes();

CREATE TRIGGER audit_bom_components_trial_changes
    AFTER INSERT OR UPDATE OR DELETE ON bom_components_trial
    FOR EACH ROW EXECUTE FUNCTION audit_bom_trial_changes();

-- Create function to enforce immutability rules
CREATE OR REPLACE FUNCTION enforce_bom_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent updates to released BOMs
    IF TG_OP = 'UPDATE' AND OLD.status = 'released' THEN
        RAISE EXCEPTION 'Cannot modify released BOM. Create a new version instead.';
    END IF;
    
    -- Prevent deletion of released BOMs
    IF TG_OP = 'DELETE' AND OLD.status = 'released' THEN
        RAISE EXCEPTION 'Cannot delete released BOM. Archive it instead.';
    END IF;
    
    -- Ensure only one active version per BOM lineage
    IF TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false THEN
        UPDATE bom_versions_trial 
        SET is_active = false 
        WHERE bom_master_id = NEW.bom_master_id AND id != NEW.id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create immutability triggers
CREATE TRIGGER enforce_bom_master_immutability
    BEFORE UPDATE OR DELETE ON bom_master_trial
    FOR EACH ROW EXECUTE FUNCTION enforce_bom_immutability();

CREATE TRIGGER enforce_bom_versions_immutability
    BEFORE UPDATE OR DELETE ON bom_versions_trial
    FOR EACH ROW EXECUTE FUNCTION enforce_bom_immutability();

-- Create function to get next version number
CREATE OR REPLACE FUNCTION get_next_bom_version(bom_master_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM bom_versions_trial
    WHERE bom_master_id = bom_master_uuid;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create function to create new BOM lineage
CREATE OR REPLACE FUNCTION create_new_bom_lineage(
    p_product_code VARCHAR(100),
    p_product_name VARCHAR(200),
    p_category VARCHAR(20),
    p_description TEXT,
    p_created_by VARCHAR(100)
)
RETURNS UUID AS $$
DECLARE
    new_lineage_id UUID;
    new_bom_id UUID;
BEGIN
    -- Set the current user context for audit trail
    PERFORM set_config('app.current_user', p_created_by, true);
    
    -- Generate new lineage ID
    new_lineage_id := uuid_generate_v4();
    
    -- Create new BOM master record
    INSERT INTO bom_master_trial (
        bom_lineage_id, product_code, product_name, category, description, created_by
    ) VALUES (
        new_lineage_id, p_product_code, p_product_name, p_category, p_description, p_created_by
    ) RETURNING id INTO new_bom_id;
    
    RETURN new_bom_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to set current user context
CREATE OR REPLACE FUNCTION set_current_user_context(user_name TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user', user_name, true);
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO bom_master_trial (bom_lineage_id, product_code, product_name, category, description, status, created_by) VALUES
(uuid_generate_v4(), 'PROD-001', 'Sample Product 1', 'FG', 'Sample finished good product', 'draft', 'system'),
(uuid_generate_v4(), 'SFG-001', 'Sample Semi-Finished Good', 'SFG', 'Sample semi-finished good', 'draft', 'system'),
(uuid_generate_v4(), 'LOCAL-001', 'Local Component', 'LOCAL', 'Sample local component', 'draft', 'system');

-- Create views for easier querying
CREATE VIEW bom_master_with_versions AS
SELECT 
    bm.*,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version
FROM bom_master_trial bm
LEFT JOIN bom_versions_trial bv ON bm.id = bv.bom_master_id
GROUP BY bm.id;

CREATE VIEW bom_versions_with_components AS
SELECT 
    bv.*,
    bm.product_code,
    bm.product_name,
    bm.category,
    COUNT(bc.id) as component_count,
    SUM(bc.total_cost) as calculated_total_cost
FROM bom_versions_trial bv
JOIN bom_master_trial bm ON bv.bom_master_id = bm.id
LEFT JOIN bom_components_trial bc ON bv.id = bc.bom_version_id
GROUP BY bv.id, bm.product_code, bm.product_name, bm.category;

-- Grant permissions
GRANT ALL ON bom_master_trial TO authenticated;
GRANT ALL ON bom_versions_trial TO authenticated;
GRANT ALL ON bom_components_trial TO authenticated;
GRANT ALL ON bom_audit_trial TO authenticated;
GRANT SELECT ON bom_master_with_versions TO authenticated;
GRANT SELECT ON bom_versions_with_components TO authenticated;

-- Add comment
COMMENT ON TABLE bom_master_trial IS 'Trial BOM Master table - can be completely removed before production';
COMMENT ON TABLE bom_versions_trial IS 'Trial BOM Versions table - tracks version history with immutability';
COMMENT ON TABLE bom_components_trial IS 'Trial BOM Components table - detailed component information';
COMMENT ON TABLE bom_audit_trial IS 'Trial BOM Audit table - complete audit trail for immutability';
