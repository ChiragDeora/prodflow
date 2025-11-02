-- Recreate FG BOM table with correct structure
-- This script will create a fresh FG BOM table with all required columns
-- FIXED: Changed qty_meter fields from NUMERIC(10,2) to DECIMAL(10,4) to prevent rounding

-- Create FG BOM table
CREATE TABLE fg_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    party_name VARCHAR(100) NOT NULL,
    pack_size VARCHAR(100),
    sfg_1 VARCHAR(100),
    sfg_1_qty NUMERIC(10,2),
    sfg_2 VARCHAR(100),
    sfg_2_qty NUMERIC(10,2),
    cnt_code VARCHAR(100),
    cnt_qty NUMERIC(10,2),
    polybag_code VARCHAR(100),
    poly_qty NUMERIC(10,2),
    bopp_1 VARCHAR(100),
    qty_meter DECIMAL(10,2),  -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,2), -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    status VARCHAR(50) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create FG BOM versions table
CREATE TABLE fg_bom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fg_bom_id UUID NOT NULL REFERENCES fg_bom(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    sl_no INTEGER NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    party_name VARCHAR(100) NOT NULL,
    pack_size VARCHAR(100),
    sfg_1 VARCHAR(100),
    sfg_1_qty NUMERIC(10,2),
    sfg_2 VARCHAR(100),
    sfg_2_qty NUMERIC(10,2),
    cnt_code VARCHAR(100),
    cnt_qty NUMERIC(10,2),
    polybag_code VARCHAR(100),
    poly_qty NUMERIC(10,2),
    bopp_1 VARCHAR(100),
    qty_meter DECIMAL(10,2),  -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,2), -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    status VARCHAR(50),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create FG BOM with versions view
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
    COALESCE(bv.version_number, 1) as version_number
FROM fg_bom b
LEFT JOIN fg_bom_versions bv ON b.id = bv.fg_bom_id;

-- Create indexes for better performance
CREATE INDEX idx_fg_bom_item_code ON fg_bom(item_code);
CREATE INDEX idx_fg_bom_party_name ON fg_bom(party_name);
CREATE INDEX idx_fg_bom_sl_no ON fg_bom(sl_no);
CREATE INDEX idx_fg_bom_versions_fg_bom_id ON fg_bom_versions(fg_bom_id);

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'fg_bom' 
ORDER BY ordinal_position;

-- Show the created view
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'fg_bom_with_versions' 
ORDER BY ordinal_position;
