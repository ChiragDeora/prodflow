-- ============================================================================
-- CREATE FG AND LOCAL BOM TABLES
-- ============================================================================

-- Create FG BOM table
CREATE TABLE IF NOT EXISTS fg_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_lineage_id UUID NOT NULL,
    sl_no INTEGER NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    fg_code VARCHAR(100) NOT NULL,
    pcs INTEGER NOT NULL DEFAULT 1,
    part_weight_gm_pcs DECIMAL(10,4) NOT NULL,
    colour VARCHAR(50) NOT NULL,
    hp_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    icp_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    rcp_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    ldpe_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    gpps_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    mb_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_lineage_fk FOREIGN KEY (bom_lineage_id) REFERENCES bom_lineage(id),
    CONSTRAINT fg_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT fg_bom_fg_code_unique UNIQUE (fg_code)
);

-- Create LOCAL BOM table
CREATE TABLE IF NOT EXISTS local_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_lineage_id UUID NOT NULL,
    sl_no INTEGER NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    local_code VARCHAR(100) NOT NULL,
    pcs INTEGER NOT NULL DEFAULT 1,
    part_weight_gm_pcs DECIMAL(10,4) NOT NULL,
    colour VARCHAR(50) NOT NULL,
    hp_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    icp_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    rcp_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    ldpe_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    gpps_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    mb_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT local_bom_lineage_fk FOREIGN KEY (bom_lineage_id) REFERENCES bom_lineage(id),
    CONSTRAINT local_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT local_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT local_bom_local_code_unique UNIQUE (local_code)
);

-- Create indexes for FG BOM
CREATE INDEX IF NOT EXISTS idx_fg_bom_sl_no ON fg_bom(sl_no);
CREATE INDEX IF NOT EXISTS idx_fg_bom_fg_code ON fg_bom(fg_code);
CREATE INDEX IF NOT EXISTS idx_fg_bom_status ON fg_bom(status);
CREATE INDEX IF NOT EXISTS idx_fg_bom_created_by ON fg_bom(created_by);

-- Create indexes for LOCAL BOM
CREATE INDEX IF NOT EXISTS idx_local_bom_sl_no ON local_bom(sl_no);
CREATE INDEX IF NOT EXISTS idx_local_bom_local_code ON local_bom(local_code);
CREATE INDEX IF NOT EXISTS idx_local_bom_status ON local_bom(status);
CREATE INDEX IF NOT EXISTS idx_local_bom_created_by ON local_bom(created_by);

-- Create views for each table with version information
CREATE VIEW fg_bom_with_versions AS
SELECT 
    bm.*,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version
FROM fg_bom bm
LEFT JOIN bom_versions_trial bv ON bm.id = bv.bom_master_id
GROUP BY bm.id, bm.bom_lineage_id, bm.sl_no, bm.item_name, bm.fg_code, bm.pcs, 
         bm.part_weight_gm_pcs, bm.colour, bm.hp_percentage, bm.icp_percentage, 
         bm.rcp_percentage, bm.ldpe_percentage, bm.gpps_percentage, bm.mb_percentage,
         bm.status, bm.created_by, bm.created_at, bm.updated_at;

CREATE VIEW local_bom_with_versions AS
SELECT 
    bm.*,
    COUNT(bv.id) as total_versions,
    MAX(bv.version_number) as latest_version,
    MAX(CASE WHEN bv.is_active THEN bv.version_number END) as active_version
FROM local_bom bm
LEFT JOIN bom_versions_trial bv ON bm.id = bv.bom_master_id
GROUP BY bm.id, bm.bom_lineage_id, bm.sl_no, bm.item_name, bm.local_code, bm.pcs, 
         bm.part_weight_gm_pcs, bm.colour, bm.hp_percentage, bm.icp_percentage, 
         bm.rcp_percentage, bm.ldpe_percentage, bm.gpps_percentage, bm.mb_percentage,
         bm.status, bm.created_by, bm.created_at, bm.updated_at;

-- Create a unified view that combines all three tables
CREATE VIEW unified_bom_master AS
SELECT 
    'SFG' as category,
    id,
    bom_lineage_id,
    sl_no,
    item_name,
    sfg_code as product_code,
    pcs,
    part_weight_gm_pcs,
    colour,
    hp_percentage,
    icp_percentage,
    rcp_percentage,
    ldpe_percentage,
    gpps_percentage,
    mb_percentage,
    status,
    created_by,
    created_at,
    updated_at,
    total_versions,
    latest_version,
    active_version
FROM sfg_bom_with_versions

UNION ALL

SELECT 
    'FG' as category,
    id,
    bom_lineage_id,
    sl_no,
    item_name,
    fg_code as product_code,
    pcs,
    part_weight_gm_pcs,
    colour,
    hp_percentage,
    icp_percentage,
    rcp_percentage,
    ldpe_percentage,
    gpps_percentage,
    mb_percentage,
    status,
    created_by,
    created_at,
    updated_at,
    total_versions,
    latest_version,
    active_version
FROM fg_bom_with_versions

UNION ALL

SELECT 
    'LOCAL' as category,
    id,
    bom_lineage_id,
    sl_no,
    item_name,
    local_code as product_code,
    pcs,
    part_weight_gm_pcs,
    colour,
    hp_percentage,
    icp_percentage,
    rcp_percentage,
    ldpe_percentage,
    gpps_percentage,
    mb_percentage,
    status,
    created_by,
    created_at,
    updated_at,
    total_versions,
    latest_version,
    active_version
FROM local_bom_with_versions;

-- Verify the setup
SELECT 'SFG BOM Records' as table_name, COUNT(*) as record_count FROM sfg_bom
UNION ALL
SELECT 'FG BOM Records' as table_name, COUNT(*) as record_count FROM fg_bom
UNION ALL
SELECT 'LOCAL BOM Records' as table_name, COUNT(*) as record_count FROM local_bom;

-- Show table structures
SELECT 'SFG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'sfg_bom' ORDER BY ordinal_position
UNION ALL
SELECT 'FG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'fg_bom' ORDER BY ordinal_position
UNION ALL
SELECT 'LOCAL BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'local_bom' ORDER BY ordinal_position;
