-- ============================================================================
-- CREATE SFG, FG, AND LOCAL BOM TABLES WITH VERSION CONTROL
-- ============================================================================

-- Create SFG BOM table (Semi-Finished Goods) - Based on the headers you showed
CREATE TABLE sfg_bom (
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
    qty_mitte DECIMAL(10,4),
    bopp_1_2 VARCHAR(100),
    qty_mitte_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sfg_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT sfg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT sfg_bom_item_code_unique UNIQUE (item_code)
);

-- Create FG BOM table (Finished Goods) - Different headers for FG
CREATE TABLE fg_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    party_name VARCHAR(200),
    pack_size VARCHAR(50),
    fg_1 VARCHAR(100),
    fg_1_qty DECIMAL(10,4),
    fg_2 VARCHAR(100),
    fg_2_qty DECIMAL(10,4),
    fg_3 VARCHAR(100),
    fg_3_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_mitte DECIMAL(10,4),
    bopp_2 VARCHAR(100),
    qty_mitte_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT fg_bom_item_code_unique UNIQUE (item_code)
);

-- Create LOCAL BOM table - Different headers for LOCAL
CREATE TABLE local_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    party_name VARCHAR(200),
    pack_size VARCHAR(50),
    local_1 VARCHAR(100),
    local_1_qty DECIMAL(10,4),
    local_2 VARCHAR(100),
    local_2_qty DECIMAL(10,4),
    local_3 VARCHAR(100),
    local_3_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_mitte DECIMAL(10,4),
    bopp_2 VARCHAR(100),
    qty_mitte_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT local_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
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
    qty_mitte DECIMAL(10,4),
    bopp_1_2 VARCHAR(100),
    qty_mitte_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sfg_bom_versions_sfg_bom_id_fk FOREIGN KEY (sfg_bom_id) REFERENCES sfg_bom(id) ON DELETE CASCADE,
    CONSTRAINT sfg_bom_versions_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
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
    fg_1 VARCHAR(100),
    fg_1_qty DECIMAL(10,4),
    fg_2 VARCHAR(100),
    fg_2_qty DECIMAL(10,4),
    fg_3 VARCHAR(100),
    fg_3_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_mitte DECIMAL(10,4),
    bopp_2 VARCHAR(100),
    qty_mitte_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_versions_fg_bom_id_fk FOREIGN KEY (fg_bom_id) REFERENCES fg_bom(id) ON DELETE CASCADE,
    CONSTRAINT fg_bom_versions_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fg_bom_versions_version_unique UNIQUE (fg_bom_id, version_number)
);

-- LOCAL BOM Versions
CREATE TABLE local_bom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_bom_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    party_name VARCHAR(200),
    pack_size VARCHAR(50),
    local_1 VARCHAR(100),
    local_1_qty DECIMAL(10,4),
    local_2 VARCHAR(100),
    local_2_qty DECIMAL(10,4),
    local_3 VARCHAR(100),
    local_3_qty DECIMAL(10,4),
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    polybag_code VARCHAR(100),
    poly_qty DECIMAL(10,4),
    bopp_1 VARCHAR(100),
    qty_mitte DECIMAL(10,4),
    bopp_2 VARCHAR(100),
    qty_mitte_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT local_bom_versions_local_bom_id_fk FOREIGN KEY (local_bom_id) REFERENCES local_bom(id) ON DELETE CASCADE,
    CONSTRAINT local_bom_versions_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
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
    b.qty_mitte,
    b.bopp_1_2,
    b.qty_mitte_2,
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
    b.fg_1,
    b.fg_1_qty,
    b.fg_2,
    b.fg_2_qty,
    b.fg_3,
    b.fg_3_qty,
    b.cnt_code,
    b.cnt_qty,
    b.polybag_code,
    b.poly_qty,
    b.bopp_1,
    b.qty_mitte,
    b.bopp_2,
    b.qty_mitte_2,
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
    b.party_name,
    b.pack_size,
    b.local_1,
    b.local_1_qty,
    b.local_2,
    b.local_2_qty,
    b.local_3,
    b.local_3_qty,
    b.cnt_code,
    b.cnt_qty,
    b.polybag_code,
    b.poly_qty,
    b.bopp_1,
    b.qty_mitte,
    b.bopp_2,
    b.qty_mitte_2,
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
        sfg_bom_id, version_number, sl_no, item_code, party_name, pack_size,
        sfg_1, sfg_1_qty, sfg_2, sfg_2_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_mitte, bopp_1_2, qty_mitte_2,
        status, created_by
    )
    SELECT 
        id, next_version, sl_no, item_code, party_name, pack_size,
        sfg_1, sfg_1_qty, sfg_2, sfg_2_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_mitte, bopp_1_2, qty_mitte_2,
        status, created_by
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
        fg_1, fg_1_qty, fg_2, fg_2_qty, fg_3, fg_3_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_mitte, bopp_2, qty_mitte_2,
        status, created_by
    )
    SELECT 
        id, next_version, sl_no, item_code, party_name, pack_size,
        fg_1, fg_1_qty, fg_2, fg_2_qty, fg_3, fg_3_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_mitte, bopp_2, qty_mitte_2,
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
        local_bom_id, version_number, sl_no, item_code, party_name, pack_size,
        local_1, local_1_qty, local_2, local_2_qty, local_3, local_3_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_mitte, bopp_2, qty_mitte_2,
        status, created_by
    )
    SELECT 
        id, next_version, sl_no, item_code, party_name, pack_size,
        local_1, local_1_qty, local_2, local_2_qty, local_3, local_3_qty, cnt_code, cnt_qty,
        polybag_code, poly_qty, bopp_1, qty_mitte, bopp_2, qty_mitte_2,
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
CREATE INDEX idx_sfg_bom_item_code ON sfg_bom(item_code);
CREATE INDEX idx_sfg_bom_status ON sfg_bom(status);
CREATE INDEX idx_sfg_bom_created_by ON sfg_bom(created_by);

-- FG BOM indexes
CREATE INDEX idx_fg_bom_sl_no ON fg_bom(sl_no);
CREATE INDEX idx_fg_bom_item_code ON fg_bom(item_code);
CREATE INDEX idx_fg_bom_status ON fg_bom(status);
CREATE INDEX idx_fg_bom_created_by ON fg_bom(created_by);

-- LOCAL BOM indexes
CREATE INDEX idx_local_bom_sl_no ON local_bom(sl_no);
CREATE INDEX idx_local_bom_item_code ON local_bom(item_code);
CREATE INDEX idx_local_bom_status ON local_bom(status);
CREATE INDEX idx_local_bom_created_by ON local_bom(created_by);

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
SELECT 'SFG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'sfg_bom' ORDER BY ordinal_position
UNION ALL
SELECT 'FG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'fg_bom' ORDER BY ordinal_position
UNION ALL
SELECT 'LOCAL BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'local_bom' ORDER BY ordinal_position;
