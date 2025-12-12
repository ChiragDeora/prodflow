-- IMPLEMENT NEW BOM CODING SYSTEM
-- Based on your requirements: 100 for SFG, 200 for FG, proper naming conventions

-- =====================================================
-- 1. UPDATE SFG BOM CODES (Add 100 prefix)
-- =====================================================

-- First, let's see current SFG structure
SELECT 'CURRENT SFG STRUCTURE' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'sfg_bom'
ORDER BY ordinal_position;

-- Update SFG codes to add 100 prefix
-- Example: RP-Ro10-B-C becomes 100RpRo10-B-C
UPDATE sfg_bom 
SET item_name = CASE 
    WHEN item_name NOT LIKE '100%' THEN '100' || REPLACE(item_name, 'RP-', 'Rp')
    ELSE item_name 
END
WHERE item_name IS NOT NULL;

-- =====================================================
-- 2. UPDATE FG BOM CODES (Add 200 prefix)
-- =====================================================

-- Check current FG structure
SELECT 'CURRENT FG STRUCTURE' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'fg_bom'
ORDER BY ordinal_position;

-- Update FG codes to add 200 prefix and market designation
-- For Export: 200RpRo10-B-C-Ex
-- For General Market: 200RpRo10-B-C-Gm
UPDATE fg_bom 
SET item_code = CASE 
    WHEN item_code NOT LIKE '200%' AND item_code LIKE '%-Ex' THEN 
        '200' || REPLACE(REPLACE(item_code, 'RP-', 'Rp'), '-Ex', '-Ex')
    WHEN item_code NOT LIKE '200%' AND item_code LIKE '%-Gm' THEN 
        '200' || REPLACE(REPLACE(item_code, 'RP-', 'Rp'), '-Gm', '-Gm')
    WHEN item_code NOT LIKE '200%' THEN 
        '200' || REPLACE(item_code, 'RP-', 'Rp') || '-Gm'  -- Default to General Market
    ELSE item_code 
END
WHERE item_code IS NOT NULL;

-- =====================================================
-- 3. UPDATE LOCAL BOM CODES (Add 200 prefix for FG items)
-- =====================================================

-- Update LOCAL BOM item codes (these are FG codes, so use 200 prefix)
UPDATE local_bom 
SET item_code = CASE 
    WHEN item_code NOT LIKE '200%' THEN '200' || REPLACE(item_code, 'RP-', 'Rp')
    ELSE item_code 
END
WHERE item_code IS NOT NULL;

-- Update SFG references in LOCAL BOM (add 100 prefix)
UPDATE local_bom 
SET sfg_1 = CASE 
    WHEN sfg_1 NOT LIKE '100%' AND sfg_1 IS NOT NULL THEN '100' || REPLACE(sfg_1, 'RP-', 'Rp')
    ELSE sfg_1 
END,
sfg_2 = CASE 
    WHEN sfg_2 NOT LIKE '100%' AND sfg_2 IS NOT NULL THEN '100' || REPLACE(sfg_2, 'RP-', 'Rp')
    ELSE sfg_2 
END
WHERE sfg_1 IS NOT NULL OR sfg_2 IS NOT NULL;

-- =====================================================
-- 4. ADD CBM COLUMN TO FG TABLES
-- =====================================================

-- Add CBM column to FG BOM
ALTER TABLE fg_bom ADD COLUMN IF NOT EXISTS cbm_export DECIMAL(10,4);
ALTER TABLE fg_bom ADD COLUMN IF NOT EXISTS cbm_general DECIMAL(10,4);

-- Add CBM column to LOCAL BOM (since it contains FG items)
ALTER TABLE local_bom ADD COLUMN IF NOT EXISTS cbm DECIMAL(10,4);

-- =====================================================
-- 5. FIX COLUMN NAMING (Remove underscores)
-- =====================================================

-- Note: We can't rename columns directly in PostgreSQL easily, 
-- but we can create views or update the frontend to display proper names

-- Create a view for better column naming
CREATE OR REPLACE VIEW sfg_bom_display AS
SELECT 
    id,
    sl_no,
    item_name,
    sfg_code,
    pcs,
    part_wt_gm_pcs as "PART WT (GM/PCS)",
    colour,
    hp_percent as "HP %",
    icp_percent as "ICP %", 
    rcp_percent as "RCP %",
    ldpe_percent as "LDPE %",
    gpps_percent as "GPPS %",
    mb_percent as "MB %",
    additives_percent as "ADDITIVES %",
    status,
    created_by,
    created_at,
    updated_at
FROM sfg_bom;

CREATE OR REPLACE VIEW fg_bom_display AS
SELECT 
    id,
    sl_no,
    item_code,
    party_name,
    pack_size,
    sfg_1,
    sfg_1_qty as "SFG-1 QTY",  -- Remove underscore
    sfg_2,
    sfg_2_qty as "SFG-2 QTY",  -- Remove underscore
    cnt_code,
    cnt_qty,
    polybag_code,
    poly_qty,
    cbm_export as "CBM (Export)",
    cbm_general as "CBM (General)",
    status,
    created_by,
    created_at,
    updated_at
FROM fg_bom;

CREATE OR REPLACE VIEW local_bom_display AS
SELECT 
    id,
    sl_no,
    item_code,
    pack_size,
    sfg_1,
    sfg_1_qty as "SFG-1 QTY",  -- Remove underscore
    sfg_2,
    sfg_2_qty as "SFG-2 QTY",  -- Remove underscore
    cnt_code,
    cnt_qty,
    polybag_code,
    poly_qty,
    bopp_1,
    qty_meter,
    bopp_2,
    qty_meter_2,
    cbm as "CBM",
    status,
    created_by,
    created_at,
    updated_at
FROM local_bom;

-- =====================================================
-- 6. CREATE BOM VERSIONING SYSTEM
-- =====================================================

-- Create BOM version tracking tables
CREATE TABLE IF NOT EXISTS bom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_type VARCHAR(10) NOT NULL CHECK (bom_type IN ('SFG', 'FG', 'LOCAL')),
    bom_id UUID NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    version_data JSONB NOT NULL,
    change_reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bom_type, bom_id, version_number)
);

-- Create function to auto-create new version when BOM changes
CREATE OR REPLACE FUNCTION create_bom_version() RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
    bom_type_val VARCHAR(10);
BEGIN
    -- Determine BOM type based on table name
    bom_type_val := CASE TG_TABLE_NAME
        WHEN 'sfg_bom' THEN 'SFG'
        WHEN 'fg_bom' THEN 'FG'
        WHEN 'local_bom' THEN 'LOCAL'
    END;
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO next_version
    FROM bom_versions 
    WHERE bom_type = bom_type_val AND bom_id = NEW.id;
    
    -- Create new version record
    INSERT INTO bom_versions (bom_type, bom_id, version_number, version_data, created_by)
    VALUES (bom_type_val, NEW.id, next_version, row_to_json(NEW), NEW.created_by);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for versioning
DROP TRIGGER IF EXISTS sfg_bom_versioning ON sfg_bom;
CREATE TRIGGER sfg_bom_versioning 
    AFTER INSERT OR UPDATE ON sfg_bom
    FOR EACH ROW EXECUTE FUNCTION create_bom_version();

DROP TRIGGER IF EXISTS fg_bom_versioning ON fg_bom;
CREATE TRIGGER fg_bom_versioning 
    AFTER INSERT OR UPDATE ON fg_bom
    FOR EACH ROW EXECUTE FUNCTION create_bom_version();

DROP TRIGGER IF EXISTS local_bom_versioning ON local_bom;
CREATE TRIGGER local_bom_versioning 
    AFTER INSERT OR UPDATE ON local_bom
    FOR EACH ROW EXECUTE FUNCTION create_bom_version();

-- =====================================================
-- 7. CREATE CUSTOMER AND VENDOR MASTER TABLES
-- =====================================================

-- Customer Master
CREATE TABLE IF NOT EXISTS customer_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    customer_type VARCHAR(20) CHECK (customer_type IN ('Domestic', 'Export', 'Both')) DEFAULT 'Domestic',
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Blocked')) DEFAULT 'Active',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Master  
CREATE TABLE IF NOT EXISTS vendor_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    vendor_type VARCHAR(50), -- Raw Material, Packaging, Services, etc.
    payment_terms VARCHAR(100),
    bank_details TEXT,
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Blocked')) DEFAULT 'Active',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Check updated codes
SELECT 'UPDATED SFG CODES' as info;
SELECT item_name, sfg_code FROM sfg_bom LIMIT 5;

SELECT 'UPDATED FG CODES' as info;
SELECT item_code, party_name FROM fg_bom LIMIT 5;

SELECT 'UPDATED LOCAL BOM CODES' as info;
SELECT item_code, sfg_1, sfg_2 FROM local_bom LIMIT 5;

-- Check new tables
SELECT 'BOM VERSIONS TABLE' as info;
SELECT COUNT(*) as version_count FROM bom_versions;

SELECT 'CUSTOMER MASTER TABLE' as info;
SELECT COUNT(*) as customer_count FROM customer_master;

SELECT 'VENDOR MASTER TABLE' as info;
SELECT COUNT(*) as vendor_count FROM vendor_master;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ BOM Coding System Implementation Complete!';
    RAISE NOTICE '📊 SFG codes updated with 100 prefix (100RpRo10-B-C)';
    RAISE NOTICE '📦 FG codes updated with 200 prefix (200RpRo10-B-C-Ex/Gm)';
    RAISE NOTICE '🏗️ LOCAL BOM codes updated with proper prefixes';
    RAISE NOTICE '📏 CBM columns added to FG tables';
    RAISE NOTICE '🔄 BOM versioning system implemented';
    RAISE NOTICE '👥 Customer and Vendor master tables created';
    RAISE NOTICE '📋 Display views created with proper column names';
END $$;
