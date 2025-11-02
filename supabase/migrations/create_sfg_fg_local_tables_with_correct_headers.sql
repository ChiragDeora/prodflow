-- ============================================================================
-- CREATE SFG, FG, AND LOCAL BOM TABLES WITH CORRECT HEADERS
-- ============================================================================

-- Create SFG BOM table (Semi-Finished Goods) - Correct SFG headers
CREATE TABLE sfg_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sl_no INTEGER NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    sfg_code VARCHAR(100) NOT NULL,
    pcs DECIMAL(10,4),
    part_weight_gm_pcs DECIMAL(10,4),
    colour VARCHAR(100),
    hp_percentage DECIMAL(5,4),
    icp_percentage DECIMAL(5,4),
    rcp_percentage DECIMAL(5,4),
    ldpe_percentage DECIMAL(5,4),
    gpps_percentage DECIMAL(5,4),
    mb_percentage DECIMAL(5,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sfg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT sfg_bom_sfg_code_unique UNIQUE (sfg_code)
);

-- Create FG BOM table (Finished Goods) - Correct FG headers
CREATE TABLE fg_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    party_name VARCHAR(200),
    pack_size VARCHAR(50),
    sfg_1 VARCHAR(100),
    sfg_1_qty DECIMAL(10,4),
    sfg_2 VARCHAR(100),
    sfg_2_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_meter DECIMAL(10,4),
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT fg_bom_item_code_unique UNIQUE (item_code)
);

-- Create LOCAL BOM table - Correct LOCAL headers
CREATE TABLE local_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    pack_size VARCHAR(50),
    sfg_1 VARCHAR(100),
    sfg_1_qty DECIMAL(10,4),
    sfg_2 VARCHAR(100),
    sfg_2_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_meter DECIMAL(10,4),
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT local_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT local_bom_item_code_unique UNIQUE (item_code)
);

-- ============================================================================
-- VERSION CONTROL TABLES
-- ============================================================================

-- SFG BOM Versions
CREATE TABLE sfg_bom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sfg_bom_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    sl_no INTEGER NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    sfg_code VARCHAR(100) NOT NULL,
    pcs DECIMAL(10,4),
    part_weight_gm_pcs DECIMAL(10,4),
    colour VARCHAR(100),
    hp_percentage DECIMAL(5,4),
    icp_percentage DECIMAL(5,4),
    rcp_percentage DECIMAL(5,4),
    ldpe_percentage DECIMAL(5,4),
    gpps_percentage DECIMAL(5,4),
    mb_percentage DECIMAL(5,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sfg_bom_versions_sfg_bom_id_fk FOREIGN KEY (sfg_bom_id) REFERENCES sfg_bom(id) ON DELETE CASCADE,
    CONSTRAINT sfg_bom_versions_version_unique UNIQUE (sfg_bom_id, version_number)
);

-- FG BOM Versions
CREATE TABLE fg_bom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fg_bom_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    party_name VARCHAR(200),
    pack_size VARCHAR(50),
    sfg_1 VARCHAR(100),
    sfg_1_qty DECIMAL(10,4),
    sfg_2 VARCHAR(100),
    sfg_2_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_meter DECIMAL(10,4),
    bopp_1_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_versions_fg_bom_id_fk FOREIGN KEY (fg_bom_id) REFERENCES fg_bom(id) ON DELETE CASCADE,
    CONSTRAINT fg_bom_versions_version_unique UNIQUE (fg_bom_id, version_number)
);

-- LOCAL BOM Versions
CREATE TABLE local_bom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_bom_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    pack_size VARCHAR(50),
    sfg_1 VARCHAR(100),
    sfg_1_qty DECIMAL(10,4),
    sfg_2 VARCHAR(100),
    sfg_2_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_meter DECIMAL(10,4),
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT local_bom_versions_local_bom_id_fk FOREIGN KEY (local_bom_id) REFERENCES local_bom(id) ON DELETE CASCADE,
    CONSTRAINT local_bom_versions_version_unique UNIQUE (local_bom_id, version_number)
);

-- ============================================================================
-- IMMUTABLE VIEWS (READ-ONLY)
-- ============================================================================

-- SFG BOM with Versions View (Immutable)
CREATE VIEW sfg_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_name,
    b.sfg_code,
    b.pcs,
    b.part_weight_gm_pcs,
    b.colour,
    b.hp_percentage,
    b.icp_percentage,
    b.rcp_percentage,
    b.ldpe_percentage,
    b.gpps_percentage,
    b.mb_percentage,
    b.status,
    b.created_by,
    b.created_at,
    b.updated_at,
    COALESCE((SELECT MAX(version_number) FROM sfg_bom_versions WHERE sfg_bom_id = b.id), 0) as current_version,
    'SFG' as category
FROM sfg_bom b
ORDER BY b.sl_no;

-- FG BOM with Versions View (Immutable)
CREATE VIEW fg_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_code,
    b.party_name,
    b.pack_size,
    b.sfg_1,
    b.sfg_1_qty,
    b.sfg_2,
    b.sfg_2_qty,
    b.cnt_code,
    b.cnt_qty,
    b.polybag_code,
    b.poly_qty,
    b.bopp_1,
    b.qty_meter,
    b.bopp_2,
    b.qty_meter_2,
    b.status,
    b.created_by,
    b.created_at,
    b.updated_at,
    COALESCE((SELECT MAX(version_number) FROM fg_bom_versions WHERE fg_bom_id = b.id), 0) as current_version,
    'FG' as category
FROM fg_bom b
ORDER BY b.sl_no;

-- LOCAL BOM with Versions View (Immutable)
CREATE VIEW local_bom_with_versions AS
SELECT 
    b.id,
    b.sl_no,
    b.item_code,
    b.pack_size,
    b.sfg_1,
    b.sfg_1_qty,
    b.sfg_2,
    b.sfg_2_qty,
    b.cnt_code,
    b.cnt_qty,
    b.polybag_code,
    b.poly_qty,
    b.bopp_1,
    b.qty_meter,
    b.bopp_2,
    b.qty_meter_2,
    b.status,
    b.created_by,
    b.created_at,
    b.updated_at,
    COALESCE((SELECT MAX(version_number) FROM local_bom_versions WHERE local_bom_id = b.id), 0) as current_version,
    'LOCAL' as category
FROM local_bom b
ORDER BY b.sl_no;

-- ============================================================================
-- VERSION CONTROL FUNCTIONS
-- ============================================================================

-- Create SFG BOM Version
CREATE OR REPLACE FUNCTION create_sfg_bom_version(sfg_bom_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM sfg_bom_versions
    WHERE sfg_bom_id = sfg_bom_uuid;
    
    -- Insert new version
    INSERT INTO sfg_bom_versions (
        sfg_bom_id, version_number, sl_no, item_name, sfg_code, pcs, part_weight_gm_pcs,
        colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage,
        gpps_percentage, mb_percentage, status, created_by
    )
    SELECT 
        id, next_version, sl_no, item_name, sfg_code, pcs, part_weight_gm_pcs,
        colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage,
        gpps_percentage, mb_percentage, status, created_by
    FROM sfg_bom
    WHERE id = sfg_bom_uuid;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create FG BOM Version
CREATE OR REPLACE FUNCTION create_fg_bom_version(fg_bom_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM fg_bom_versions
    WHERE fg_bom_id = fg_bom_uuid;
    
    -- Insert new version
    INSERT INTO fg_bom_versions (
        fg_bom_id, version_number, sl_no, item_code, party_name, pack_size,
        sfg_1, sfg_1_qty, sfg_2, sfg_2_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_meter, bopp_1_2, qty_meter_2,
        status, created_by
    )
    SELECT 
        id, next_version, sl_no, item_code, party_name, pack_size,
        sfg_1, sfg_1_qty, sfg_2, sfg_2_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_meter, bopp_1_2, qty_meter_2,
        status, created_by
    FROM fg_bom
    WHERE id = fg_bom_uuid;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create LOCAL BOM Version
CREATE OR REPLACE FUNCTION create_local_bom_version(local_bom_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM local_bom_versions
    WHERE local_bom_id = local_bom_uuid;
    
    -- Insert new version
    INSERT INTO local_bom_versions (
        local_bom_id, version_number, sl_no, item_code, pack_size,
        sfg_1, sfg_1_qty, sfg_2, sfg_2_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_meter, bopp_1_2, qty_meter_2,
        status, created_by
    )
    SELECT 
        id, next_version, sl_no, item_code, pack_size,
        sfg_1, sfg_1_qty, sfg_2, sfg_2_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_meter, bopp_1_2, qty_meter_2,
        status, created_by
    FROM local_bom
    WHERE id = local_bom_uuid;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- SFG BOM indexes
CREATE INDEX idx_sfg_bom_sl_no ON sfg_bom(sl_no);
CREATE INDEX idx_sfg_bom_sfg_code ON sfg_bom(sfg_code);
CREATE INDEX idx_sfg_bom_status ON sfg_bom(status);

-- FG BOM indexes
CREATE INDEX idx_fg_bom_sl_no ON fg_bom(sl_no);
CREATE INDEX idx_fg_bom_item_code ON fg_bom(item_code);
CREATE INDEX idx_fg_bom_status ON fg_bom(status);

-- LOCAL BOM indexes
CREATE INDEX idx_local_bom_sl_no ON local_bom(sl_no);
CREATE INDEX idx_local_bom_item_code ON local_bom(item_code);
CREATE INDEX idx_local_bom_status ON local_bom(status);

-- Version indexes
CREATE INDEX idx_sfg_bom_versions_sfg_bom_id ON sfg_bom_versions(sfg_bom_id);
CREATE INDEX idx_fg_bom_versions_fg_bom_id ON fg_bom_versions(fg_bom_id);
CREATE INDEX idx_local_bom_versions_local_bom_id ON local_bom_versions(local_bom_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT 
    'SFG BOM Table' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'sfg_bom'

UNION ALL

SELECT 
    'FG BOM Table' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'fg_bom'

UNION ALL

SELECT 
    'LOCAL BOM Table' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'local_bom'

UNION ALL

SELECT 
    'SFG BOM Versions Table' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'sfg_bom_versions'

UNION ALL

SELECT 
    'FG BOM Versions Table' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'fg_bom_versions'

UNION ALL

SELECT 
    'LOCAL BOM Versions Table' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'local_bom_versions';

-- Show table structures
SELECT 'SFG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'sfg_bom' ORDER BY ordinal_position;

SELECT 'FG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'fg_bom' ORDER BY ordinal_position;

SELECT 'LOCAL BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'local_bom' ORDER BY ordinal_position;
