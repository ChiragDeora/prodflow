-- ============================================================================
-- UPDATE SFG BOM TABLE STRUCTURE TO MATCH HEADERS
-- ============================================================================
-- Headers: SI, Item Name, SFG-Code, Pcs, Part Wt (gm/pcs), Colour, 
--          HP%, ICP%, RCP%, LDPE%, GPPS%, MB%
-- ============================================================================

-- Step 1: Ensure SFG BOM table has correct structure
-- ============================================================================

-- Drop existing table if it has wrong structure (be careful in production!)
-- Uncomment only if you need to recreate the table
-- DROP TABLE IF EXISTS sfg_bom_versions CASCADE;
-- DROP TABLE IF EXISTS sfg_bom CASCADE;

-- Create or alter SFG BOM table with correct headers
DO $$
BEGIN
    -- Check if table exists, if not create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sfg_bom') THEN
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
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'item_name') THEN
            ALTER TABLE sfg_bom ADD COLUMN item_name VARCHAR(200);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'sfg_code') THEN
            ALTER TABLE sfg_bom ADD COLUMN sfg_code VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'pcs') THEN
            ALTER TABLE sfg_bom ADD COLUMN pcs DECIMAL(10,4);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'part_weight_gm_pcs') THEN
            ALTER TABLE sfg_bom ADD COLUMN part_weight_gm_pcs DECIMAL(10,4);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'colour') THEN
            ALTER TABLE sfg_bom ADD COLUMN colour VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'hp_percentage') THEN
            ALTER TABLE sfg_bom ADD COLUMN hp_percentage DECIMAL(5,4);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'icp_percentage') THEN
            ALTER TABLE sfg_bom ADD COLUMN icp_percentage DECIMAL(5,4);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'rcp_percentage') THEN
            ALTER TABLE sfg_bom ADD COLUMN rcp_percentage DECIMAL(5,4);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'ldpe_percentage') THEN
            ALTER TABLE sfg_bom ADD COLUMN ldpe_percentage DECIMAL(5,4);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'gpps_percentage') THEN
            ALTER TABLE sfg_bom ADD COLUMN gpps_percentage DECIMAL(5,4);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sfg_bom' AND column_name = 'mb_percentage') THEN
            ALTER TABLE sfg_bom ADD COLUMN mb_percentage DECIMAL(5,4);
        END IF;
    END IF;
END $$;

-- Step 2: Ensure SFG Code Master table exists (for SFG code explanation)
-- ============================================================================
-- This table stores the SFG code structure: Code, SFG, Item, RP/CK, BOM
-- Example: Code = "Code", SFG = "1", Item = "101", RP/CK = "10/20", BOM = "001"

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

-- Step 3: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sfg_bom_sl_no ON sfg_bom(sl_no);
CREATE INDEX IF NOT EXISTS idx_sfg_bom_sfg_code ON sfg_bom(sfg_code);
CREATE INDEX IF NOT EXISTS idx_sfg_bom_item_name ON sfg_bom(item_name);
CREATE INDEX IF NOT EXISTS idx_sfg_bom_status ON sfg_bom(status);

CREATE INDEX IF NOT EXISTS idx_sfg_code_code ON sfg_code(code);
CREATE INDEX IF NOT EXISTS idx_sfg_code_item ON sfg_code(item);
CREATE INDEX IF NOT EXISTS idx_sfg_code_bom ON sfg_code(bom);

-- Step 4: Verification queries
-- ============================================================================

-- Verify SFG BOM table structure
SELECT 
    'sfg_bom columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sfg_bom'
ORDER BY ordinal_position;

-- Verify SFG Code Master table structure
SELECT 
    'sfg_code columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sfg_code'
ORDER BY ordinal_position;

-- ============================================================================
-- NOTES
-- ============================================================================
-- SFG BOM Headers Mapping:
-- - SI (Serial Number) -> sl_no
-- - Item Name -> item_name
-- - SFG-Code -> sfg_code
-- - Pcs -> pcs
-- - Part Wt (gm/pcs) -> part_weight_gm_pcs
-- - Colour -> colour
-- - HP% -> hp_percentage
-- - ICP% -> icp_percentage
-- - RCP% -> rcp_percentage
-- - LDPE% -> ldpe_percentage
-- - GPPS% -> gpps_percentage
-- - MB% -> mb_percentage
--
-- SFG Code Master Table Structure:
-- - Code: The generated code (e.g., "110110001")
-- - SFG: Category indicator (1 = SFG)
-- - Item: Item code (e.g., "101")
-- - RP/CK: RP/CK indicator (e.g., "10/20" means can be either RP=10 or CK=20)
-- - BOM: BOM number (e.g., "001", "002")
--
-- SFG Code Generation: 1 (category) + 101 (item) + 10/20 (RP/CK) + 001 (BOM)
-- ============================================================================

