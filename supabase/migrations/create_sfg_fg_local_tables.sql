-- ============================================================================
-- CREATE SFG, FG, AND LOCAL BOM TABLES WITH RESPECTIVE HEADERS
-- ============================================================================

-- Create SFG BOM table (Semi-Finished Goods)
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

-- Create FG BOM table (Finished Goods)
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
    qty_mitte DECIMAL(10,4),
    bopp_1_2 VARCHAR(100),
    qty_mitte_2 DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT fg_bom_item_code_unique UNIQUE (item_code)
);

-- Create LOCAL BOM table
CREATE TABLE local_bom (
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
    
    CONSTRAINT local_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT local_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT local_bom_item_code_unique UNIQUE (item_code)
);

-- Create indexes for better performance
CREATE INDEX idx_sfg_bom_sl_no ON sfg_bom(sl_no);
CREATE INDEX idx_sfg_bom_item_code ON sfg_bom(item_code);
CREATE INDEX idx_sfg_bom_status ON sfg_bom(status);
CREATE INDEX idx_sfg_bom_created_by ON sfg_bom(created_by);

CREATE INDEX idx_fg_bom_sl_no ON fg_bom(sl_no);
CREATE INDEX idx_fg_bom_item_code ON fg_bom(item_code);
CREATE INDEX idx_fg_bom_status ON fg_bom(status);
CREATE INDEX idx_fg_bom_created_by ON fg_bom(created_by);

CREATE INDEX idx_local_bom_sl_no ON local_bom(sl_no);
CREATE INDEX idx_local_bom_item_code ON local_bom(item_code);
CREATE INDEX idx_local_bom_status ON local_bom(status);
CREATE INDEX idx_local_bom_created_by ON local_bom(created_by);

-- Create views for each table
CREATE VIEW sfg_bom_view AS
SELECT * FROM sfg_bom ORDER BY sl_no;

CREATE VIEW fg_bom_view AS
SELECT * FROM fg_bom ORDER BY sl_no;

CREATE VIEW local_bom_view AS
SELECT * FROM local_bom ORDER BY sl_no;

-- Verify the tables were created
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
WHERE table_name = 'local_bom';

-- Show table structures
SELECT 'SFG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'sfg_bom' ORDER BY ordinal_position
UNION ALL
SELECT 'FG BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'fg_bom' ORDER BY ordinal_position
UNION ALL
SELECT 'LOCAL BOM Structure' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'local_bom' ORDER BY ordinal_position;
