-- ============================================================================
-- CLEAN BOM TABLES AND CREATE MASTER CODE TABLES FOR UPLOAD
-- ============================================================================
-- This script cleans existing BOM tables and creates master code tables matching
-- the structure shown in the SFG Master, FG Master (Export), and FG Master (Local) sheets
--
-- BOM Code Generation System (see src/utils/bomCodeUtils.ts):
-- - SFG Code: 1 (category) + 101 (item) + 10/20 (RP/CK) + 001 (BOM)
-- - FG Export Code: 2 (category) + 101 (item) + 10/20 (RP/CK) + 10/20 (non-IML/IML) + 001 (BOM)
-- - FG Local Code: 3 (category) + 101 (item) + 10/20 (RP/CK) + 10/20 (non-IML/IML) + 001 (BOM)
--
-- These master tables store reference data that maps:
-- - Category indicators (1=SFG, 2=FG Export, 3=FG Local)
-- - Item codes
-- - RP/CK indicators (10=RP, 20=CK)
-- - For FG: Non-IML (10) or IML (20) indicators
-- - BOM numbers (001, 002, etc.)
-- ============================================================================

-- Step 1: Clean existing BOM tables
-- ============================================================================

-- Clean SFG BOM table
TRUNCATE TABLE sfg_bom CASCADE;

-- Clean FG BOM table  
TRUNCATE TABLE fg_bom CASCADE;

-- Clean LOCAL BOM table
TRUNCATE TABLE local_bom CASCADE;

-- Optional: If you want to delete instead of truncate (removes all data permanently)
-- DELETE FROM sfg_bom;
-- DELETE FROM fg_bom;
-- DELETE FROM local_bom;

-- Step 2: Create Master Code Tables matching the image structure
-- ============================================================================

-- Create SFG Code Master table (matches SFG Master sheet)
CREATE TABLE IF NOT EXISTS sfg_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    sfg VARCHAR(100) NOT NULL,
    item VARCHAR(200) NOT NULL,
    rp_ck VARCHAR(50),  -- RP/CK field (e.g., "10/20")
    bom VARCHAR(100),    -- BOM reference (e.g., "001")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sfg_code_code_unique UNIQUE (code)
);

-- Create FG Export Code Master table (matches FG Master Export sheet)
CREATE TABLE IF NOT EXISTS fg_export_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    ex VARCHAR(100) NOT NULL,  -- Export designation
    item VARCHAR(200) NOT NULL,
    rp_ck VARCHAR(50),          -- RP/CK field (e.g., "10/20")
    non_iml VARCHAR(100),      -- Non IML field (e.g., "101")
    iml VARCHAR(100),          -- IML field (e.g., "201")
    bom VARCHAR(100),          -- BOM reference (e.g., "001")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_export_code_code_unique UNIQUE (code)
);

-- Create FG Local Code Master table (matches FG Master Local sheet)
CREATE TABLE IF NOT EXISTS fg_local_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    local VARCHAR(100) NOT NULL,  -- Local designation
    item VARCHAR(200) NOT NULL,
    rp_ck VARCHAR(50),            -- RP/CK field (e.g., "10/20")
    non_iml VARCHAR(100),         -- Non IML field (e.g., "101")
    iml VARCHAR(100),             -- IML field (e.g., "201")
    bom VARCHAR(100),             -- BOM reference (e.g., "001")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fg_local_code_code_unique UNIQUE (code)
);

-- Step 3: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sfg_code_code ON sfg_code(code);
CREATE INDEX IF NOT EXISTS idx_sfg_code_item ON sfg_code(item);
CREATE INDEX IF NOT EXISTS idx_sfg_code_bom ON sfg_code(bom);

CREATE INDEX IF NOT EXISTS idx_fg_export_code_code ON fg_export_code(code);
CREATE INDEX IF NOT EXISTS idx_fg_export_code_item ON fg_export_code(item);
CREATE INDEX IF NOT EXISTS idx_fg_export_code_bom ON fg_export_code(bom);

CREATE INDEX IF NOT EXISTS idx_fg_local_code_code ON fg_local_code(code);
CREATE INDEX IF NOT EXISTS idx_fg_local_code_item ON fg_local_code(item);
CREATE INDEX IF NOT EXISTS idx_fg_local_code_bom ON fg_local_code(bom);

-- Step 4: Verification queries
-- ============================================================================

-- Verify tables are empty
SELECT 
    'sfg_bom' as table_name, 
    COUNT(*) as record_count 
FROM sfg_bom
UNION ALL
SELECT 
    'fg_bom' as table_name, 
    COUNT(*) as record_count 
FROM fg_bom
UNION ALL
SELECT 
    'local_bom' as table_name, 
    COUNT(*) as record_count 
FROM local_bom;

-- Verify master code tables are created
SELECT 
    'sfg_code' as table_name, 
    COUNT(*) as record_count 
FROM sfg_code
UNION ALL
SELECT 
    'fg_export_code' as table_name, 
    COUNT(*) as record_count 
FROM fg_export_code
UNION ALL
SELECT 
    'fg_local_code' as table_name, 
    COUNT(*) as record_count 
FROM fg_local_code;

-- Show table structures
SELECT 
    'sfg_code columns' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'sfg_code'
ORDER BY ordinal_position;

SELECT 
    'fg_export_code columns' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'fg_export_code'
ORDER BY ordinal_position;

SELECT 
    'fg_local_code columns' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'fg_local_code'
ORDER BY ordinal_position;

-- ============================================================================
-- SAMPLE INSERT STATEMENTS FOR REFERENCE
-- ============================================================================
-- Note: The values in these tables correspond to the BOM code generation system:
-- - sfg/ex/local: Category indicator (1=SFG, 2=FG Export, 3=FG Local)
-- - item: Item code (e.g., "101" or "Ro10")
-- - rp_ck: RP/CK indicator (e.g., "10/20" means can be either RP=10 or CK=20)
-- - non_iml/iml: For FG tables, these represent non-IML (10) and IML (20) codes
-- - bom: BOM number (e.g., "001", "002")

-- Example: Insert into sfg_code
-- This would generate code: 1 + 101 + 10 (if RP) or 20 (if CK) + 001 = "110110001" or "110120001"
-- INSERT INTO sfg_code (code, sfg, item, rp_ck, bom) 
-- VALUES ('Code', '1', '101', '10/20', '001');

-- Example: Insert into fg_export_code
-- This would generate code: 2 + 101 + 10 (RP) + 10 (non-IML) + 001 = "2101101001"
-- INSERT INTO fg_export_code (code, ex, item, rp_ck, non_iml, iml, bom) 
-- VALUES ('Code', '2', '101', '10/20', '10', '20', '001');

-- Example: Insert into fg_local_code
-- This would generate code: 3 + 101 + 10 (RP) + 10 (non-IML) + 001 = "3101101001"
-- INSERT INTO fg_local_code (code, local, item, rp_ck, non_iml, iml, bom) 
-- VALUES ('Code', '3', '101', '10/20', '10', '20', '001');

-- ============================================================================
-- BULK UPLOAD FROM CSV (if using COPY command)
-- ============================================================================

-- Example COPY commands (adjust paths and column order as needed):
-- COPY sfg_code (code, sfg, item, rp_ck, bom) 
-- FROM '/path/to/sfg_code.csv' 
-- WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- COPY fg_export_code (code, ex, item, rp_ck, non_iml, iml, bom) 
-- FROM '/path/to/fg_export_code.csv' 
-- WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- COPY fg_local_code (code, local, item, rp_ck, non_iml, iml, bom) 
-- FROM '/path/to/fg_local_code.csv' 
-- WITH (FORMAT csv, HEADER true, DELIMITER ',');




