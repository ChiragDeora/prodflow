-- ============================================================================
-- DROP AND RECREATE BOM TABLES WITH CORRECT SCHEMA
-- ============================================================================
-- This script will drop all existing BOM tables and recreate them with the
-- correct DECIMAL(10,4) schema for qty_meter fields to prevent rounding issues

-- Step 1: Drop all existing BOM tables and related objects
-- ============================================================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS sfg_bom_with_versions CASCADE;
DROP VIEW IF EXISTS sfg_bom_versions_with_components CASCADE;
DROP VIEW IF EXISTS bom_master_with_versions CASCADE;
DROP VIEW IF EXISTS bom_versions_with_components CASCADE;
DROP VIEW IF EXISTS unified_bom_master CASCADE;
DROP VIEW IF EXISTS fg_bom_with_versions CASCADE;
DROP VIEW IF EXISTS local_bom_with_versions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS create_sfg_bom_version(UUID, INTEGER, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_sfg_bom_version_history(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_initial_sfg_bom_version() CASCADE;
DROP FUNCTION IF EXISTS get_next_bom_version(UUID) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_create_initial_sfg_bom_version ON sfg_bom;

-- Drop tables in dependency order (child tables first, then parent tables)
DROP TABLE IF EXISTS sfg_bom_audit_trial CASCADE;
DROP TABLE IF EXISTS sfg_bom_components_trial CASCADE;
DROP TABLE IF EXISTS sfg_bom_versions_trial CASCADE;
DROP TABLE IF EXISTS sfg_bom CASCADE;
DROP TABLE IF EXISTS sfg_bom_lineage CASCADE;

-- Drop original bom_ tables
DROP TABLE IF EXISTS bom_audit_trial CASCADE;
DROP TABLE IF EXISTS bom_components_trial CASCADE;
DROP TABLE IF EXISTS bom_versions_trial CASCADE;
DROP TABLE IF EXISTS bom_master_trial CASCADE;
DROP TABLE IF EXISTS bom_lineage CASCADE;

-- Drop FG and LOCAL tables
DROP TABLE IF EXISTS fg_bom CASCADE;
DROP TABLE IF EXISTS local_bom CASCADE;
DROP TABLE IF EXISTS fg_bom_versions CASCADE;
DROP TABLE IF EXISTS local_bom_versions CASCADE;

-- Drop indexes (they should be dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_sfg_bom_sl_no CASCADE;
DROP INDEX IF EXISTS idx_sfg_bom_sfg_code CASCADE;
DROP INDEX IF EXISTS idx_sfg_bom_status CASCADE;
DROP INDEX IF EXISTS idx_sfg_bom_created_by CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_sl_no CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_fg_code CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_status CASCADE;
DROP INDEX IF EXISTS idx_fg_bom_created_by CASCADE;
DROP INDEX IF EXISTS idx_local_bom_sl_no CASCADE;
DROP INDEX IF EXISTS idx_local_bom_local_code CASCADE;
DROP INDEX IF EXISTS idx_local_bom_status CASCADE;
DROP INDEX IF EXISTS idx_local_bom_created_by CASCADE;

-- Verify all BOM tables are dropped
SELECT 
    'Remaining BOM tables' as status,
    table_name
FROM information_schema.tables 
WHERE (table_name LIKE '%sfg%' OR table_name LIKE '%bom%')
AND table_schema = 'public'
ORDER BY table_name;

-- Step 2: Recreate tables with correct schema
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create SFG BOM table
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

-- Create FG BOM table - Correct FG headers with DECIMAL(10,2) for qty_meter
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
    qty_meter DECIMAL(10,2),  -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,2), -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT fg_bom_item_code_unique UNIQUE (item_code)
);

-- Create LOCAL BOM table - Correct LOCAL headers with DECIMAL(10,2) for qty_meter
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
    qty_meter DECIMAL(10,2),  -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,2), -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT local_bom_sl_no_unique UNIQUE (sl_no),
    CONSTRAINT local_bom_item_code_unique UNIQUE (item_code)
);

-- Create version control tables
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
    qty_meter DECIMAL(10,2),  -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    bopp_1_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,2), -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_bom_versions_fg_bom_id_fk FOREIGN KEY (fg_bom_id) REFERENCES fg_bom(id) ON DELETE CASCADE,
    CONSTRAINT fg_bom_versions_version_unique UNIQUE (fg_bom_id, version_number)
);

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
    qty_meter DECIMAL(10,2),  -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    bopp_2 VARCHAR(100),
    qty_meter_2 DECIMAL(10,2), -- FIXED: Now DECIMAL(10,2) for 2 decimal places
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT local_bom_versions_local_bom_id_fk FOREIGN KEY (local_bom_id) REFERENCES local_bom(id) ON DELETE CASCADE,
    CONSTRAINT local_bom_versions_version_unique UNIQUE (local_bom_id, version_number)
);

-- Create indexes for better performance
CREATE INDEX idx_sfg_bom_sl_no ON sfg_bom(sl_no);
CREATE INDEX idx_sfg_bom_sfg_code ON sfg_bom(sfg_code);
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

-- Step 3: Verify the new schema
-- ============================================================================

-- Check the data types of qty_meter fields to confirm they are DECIMAL(10,2)
SELECT 
    'VERIFICATION: qty_meter fields should be DECIMAL(10,2)' as info,
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name IN ('fg_bom', 'local_bom', 'fg_bom_versions', 'local_bom_versions')
    AND column_name IN ('qty_meter', 'qty_meter_2')
ORDER BY table_name, column_name;

-- Show all created tables
SELECT 
    'All BOM tables created' as status,
    table_name
FROM information_schema.tables 
WHERE table_name IN ('sfg_bom', 'fg_bom', 'local_bom', 'sfg_bom_versions', 'fg_bom_versions', 'local_bom_versions')
AND table_schema = 'public'
ORDER BY table_name;
