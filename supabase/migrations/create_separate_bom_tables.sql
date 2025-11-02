-- ============================================================================
-- CREATE SEPARATE BOM TABLES FOR EACH CATEGORY
-- ============================================================================

-- Create SFG BOM table
CREATE TABLE IF NOT EXISTS sfg_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_lineage_id UUID NOT NULL,
    sl_no INTEGER NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    sfg_code VARCHAR(100) NOT NULL,
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
    
    CONSTRAINT sfg_bom_lineage_fk FOREIGN KEY (bom_lineage_id) REFERENCES bom_lineage(id),
    CONSTRAINT sfg_bom_created_by_fk FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT sfg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT sfg_bom_sfg_code_unique UNIQUE (sfg_code)
);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sfg_bom_sl_no ON sfg_bom(sl_no);
CREATE INDEX IF NOT EXISTS idx_sfg_bom_sfg_code ON sfg_bom(sfg_code);
CREATE INDEX IF NOT EXISTS idx_sfg_bom_status ON sfg_bom(status);
CREATE INDEX IF NOT EXISTS idx_sfg_bom_created_by ON sfg_bom(created_by);

CREATE INDEX IF NOT EXISTS idx_fg_bom_sl_no ON fg_bom(sl_no);
CREATE INDEX IF NOT EXISTS idx_fg_bom_fg_code ON fg_bom(fg_code);
CREATE INDEX IF NOT EXISTS idx_fg_bom_status ON fg_bom(status);
CREATE INDEX IF NOT EXISTS idx_fg_bom_created_by ON fg_bom(created_by);

CREATE INDEX IF NOT EXISTS idx_local_bom_sl_no ON local_bom(sl_no);
CREATE INDEX IF NOT EXISTS idx_local_bom_local_code ON local_bom(local_code);
CREATE INDEX IF NOT EXISTS idx_local_bom_status ON local_bom(status);
CREATE INDEX IF NOT EXISTS idx_local_bom_created_by ON local_bom(created_by);

-- Migrate existing data from bom_master_trial to appropriate tables
INSERT INTO sfg_bom (
    bom_lineage_id, sl_no, item_name, sfg_code, pcs, part_weight_gm_pcs, 
    colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage, 
    gpps_percentage, mb_percentage, status, created_by, created_at, updated_at
)
SELECT 
    bom_lineage_id, sl_no, item_name, product_code as sfg_code, pcs, part_weight_gm_pcs,
    colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage,
    gpps_percentage, mb_percentage, status, created_by, created_at, updated_at
FROM bom_master_trial 
WHERE category = 'SFG' AND sl_no IS NOT NULL;

INSERT INTO fg_bom (
    bom_lineage_id, sl_no, item_name, fg_code, pcs, part_weight_gm_pcs, 
    colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage, 
    gpps_percentage, mb_percentage, status, created_by, created_at, updated_at
)
SELECT 
    bom_lineage_id, sl_no, item_name, product_code as fg_code, pcs, part_weight_gm_pcs,
    colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage,
    gpps_percentage, mb_percentage, status, created_by, created_at, updated_at
FROM bom_master_trial 
WHERE category = 'FG' AND sl_no IS NOT NULL;

INSERT INTO local_bom (
    bom_lineage_id, sl_no, item_name, local_code, pcs, part_weight_gm_pcs, 
    colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage, 
    gpps_percentage, mb_percentage, status, created_by, created_at, updated_at
)
SELECT 
    bom_lineage_id, sl_no, item_name, product_code as local_code, pcs, part_weight_gm_pcs,
    colour, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage,
    gpps_percentage, mb_percentage, status, created_by, created_at, updated_at
FROM bom_master_trial 
WHERE category = 'LOCAL' AND sl_no IS NOT NULL;

-- Verify the migration
SELECT 'SFG BOM Records' as table_name, COUNT(*) as record_count FROM sfg_bom
UNION ALL
SELECT 'FG BOM Records' as table_name, COUNT(*) as record_count FROM fg_bom
UNION ALL
SELECT 'LOCAL BOM Records' as table_name, COUNT(*) as record_count FROM local_bom;
