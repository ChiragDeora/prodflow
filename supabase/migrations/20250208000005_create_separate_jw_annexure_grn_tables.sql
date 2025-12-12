-- ============================================================================
-- CREATE SEPARATE JW ANNEXURE GRN TABLES
-- Separates JW Annexure GRN from Normal GRN into its own tables
-- ============================================================================

-- Step 1: Create JW Annexure GRN main table
CREATE TABLE IF NOT EXISTS store_jw_annexure_grn (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    jw_no VARCHAR(100),
    jw_date DATE,
    indent_no VARCHAR(100),
    indent_date DATE,
    challan_no VARCHAR(100),
    challan_date DATE,
    party_name VARCHAR(255),
    address TEXT,
    state VARCHAR(100),
    gst_no VARCHAR(50),
    total_value DECIMAL(15, 2) DEFAULT 0,
    indent_slip_id UUID REFERENCES purchase_material_indent_slip(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT jw_annexure_grn_date_check CHECK (date IS NOT NULL)
);

-- Step 2: Create JW Annexure GRN items table
CREATE TABLE IF NOT EXISTS store_jw_annexure_grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jw_annexure_grn_id UUID NOT NULL REFERENCES store_jw_annexure_grn(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    item_code VARCHAR(100),
    item_name VARCHAR(255),
    indent_qty DECIMAL(15, 2),
    rcd_qty DECIMAL(15, 2),
    rate DECIMAL(15, 2),
    net_value DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT jw_annexure_grn_items_sr_no_check CHECK (sr_no > 0),
    UNIQUE(jw_annexure_grn_id, sr_no)
);

-- Step 3: Migrate existing JW Annexure GRN data from store_grn
-- First check if grn_type column exists, if not, there's no data to migrate
DO $$
BEGIN
    -- Check if grn_type column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_grn' AND column_name = 'grn_type'
    ) THEN
        -- Check if jw_no column exists (added in migration 20250208000004)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'store_grn' AND column_name = 'jw_no'
        ) THEN
            -- Migrate with JW-specific fields
            INSERT INTO store_jw_annexure_grn (
                id, doc_no, date, jw_no, jw_date, challan_no, challan_date,
                party_name, address, state, gst_no, total_value, indent_slip_id,
                created_at, updated_at, created_by
            )
            SELECT 
                id, doc_no, date, jw_no, jw_date, challan_no, challan_date,
                party_name, address, state, gst_no, COALESCE(final_amount, total_amount, 0), indent_slip_id,
                created_at, updated_at, created_by
            FROM store_grn
            WHERE grn_type = 'JW_ANNEXURE'
            ON CONFLICT (id) DO NOTHING;
        ELSE
            -- Migrate without JW-specific fields (they don't exist yet)
            INSERT INTO store_jw_annexure_grn (
                id, doc_no, date,
                party_name, address, state, gst_no, total_value, indent_slip_id,
                created_at, updated_at, created_by
            )
            SELECT 
                id, doc_no, date,
                party_name, address, state, gst_no, COALESCE(final_amount, total_amount, 0), indent_slip_id,
                created_at, updated_at, created_by
            FROM store_grn
            WHERE grn_type = 'JW_ANNEXURE'
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
END $$;

-- Step 4: Migrate existing JW Annexure GRN items data
DO $$
BEGIN
    -- Check if grn_type column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_grn' AND column_name = 'grn_type'
    ) THEN
        -- Check if item_code column exists (added in migration 20250208000004)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'store_grn_items' AND column_name = 'item_code'
        ) THEN
            -- Migrate with JW-specific item fields
            INSERT INTO store_jw_annexure_grn_items (
                jw_annexure_grn_id, sr_no, item_code, item_name,
                indent_qty, rcd_qty, rate, net_value, created_at
            )
            SELECT 
                grn_id, sr_no, item_code, item_name,
                indent_qty, rcd_qty, rate, net_value, created_at
            FROM store_grn_items
            WHERE grn_id IN (SELECT id FROM store_grn WHERE grn_type = 'JW_ANNEXURE')
            ON CONFLICT (jw_annexure_grn_id, sr_no) DO NOTHING;
        ELSE
            -- Migrate without JW-specific item fields (use item_description as item_name)
            INSERT INTO store_jw_annexure_grn_items (
                jw_annexure_grn_id, sr_no, item_name,
                rcd_qty, rate, net_value, created_at
            )
            SELECT 
                grn_id, sr_no, item_description,
                total_qty, NULL, total_price, created_at
            FROM store_grn_items
            WHERE grn_id IN (SELECT id FROM store_grn WHERE grn_type = 'JW_ANNEXURE')
            ON CONFLICT (jw_annexure_grn_id, sr_no) DO NOTHING;
        END IF;
    END IF;
END $$;

-- Step 5: Delete migrated JW Annexure GRN data from store_grn
DO $$
BEGIN
    -- Check if grn_type column exists before deleting
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_grn' AND column_name = 'grn_type'
    ) THEN
        DELETE FROM store_grn_items
        WHERE grn_id IN (SELECT id FROM store_grn WHERE grn_type = 'JW_ANNEXURE');

        DELETE FROM store_grn
        WHERE grn_type = 'JW_ANNEXURE';
    END IF;
END $$;

-- Step 6: Remove JW-specific columns from store_grn (they're no longer needed)
-- Only drop if they exist (they might not exist if migration 20250208000004 wasn't run)
ALTER TABLE store_grn
  DROP COLUMN IF EXISTS jw_no,
  DROP COLUMN IF EXISTS jw_date,
  DROP COLUMN IF EXISTS challan_no,
  DROP COLUMN IF EXISTS challan_date,
  DROP COLUMN IF EXISTS grn_type;

-- Step 7: Remove JW-specific columns from store_grn_items
-- Only drop if they exist (they might not exist if migration 20250208000004 wasn't run)
ALTER TABLE store_grn_items
  DROP COLUMN IF EXISTS item_code,
  DROP COLUMN IF EXISTS item_name,
  DROP COLUMN IF EXISTS indent_qty,
  DROP COLUMN IF EXISTS rcd_qty,
  DROP COLUMN IF EXISTS net_value;

-- Step 8: Add indexes for JW Annexure GRN
CREATE INDEX IF NOT EXISTS idx_jw_annexure_grn_date 
ON store_jw_annexure_grn(date);

CREATE INDEX IF NOT EXISTS idx_jw_annexure_grn_doc_no 
ON store_jw_annexure_grn(doc_no);

CREATE INDEX IF NOT EXISTS idx_jw_annexure_grn_jw_no 
ON store_jw_annexure_grn(jw_no);

CREATE INDEX IF NOT EXISTS idx_jw_annexure_grn_challan_no 
ON store_jw_annexure_grn(challan_no);

CREATE INDEX IF NOT EXISTS idx_jw_annexure_grn_party_name 
ON store_jw_annexure_grn(party_name);

CREATE INDEX IF NOT EXISTS idx_jw_annexure_grn_indent_slip_id 
ON store_jw_annexure_grn(indent_slip_id);

CREATE INDEX IF NOT EXISTS idx_jw_annexure_grn_items_jw_annexure_grn_id 
ON store_jw_annexure_grn_items(jw_annexure_grn_id);

-- Step 9: Add triggers for updated_at
CREATE TRIGGER update_jw_annexure_grn_updated_at
    BEFORE UPDATE ON store_jw_annexure_grn
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Enable RLS
ALTER TABLE store_jw_annexure_grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_jw_annexure_grn_items ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies
CREATE POLICY "Allow all operations for authenticated users on jw_annexure_grn"
    ON store_jw_annexure_grn
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on jw_annexure_grn_items"
    ON store_jw_annexure_grn_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Step 12: Add comments
COMMENT ON TABLE store_jw_annexure_grn IS 'Job Work Annexure GRN (separate from Normal GRN)';
COMMENT ON TABLE store_jw_annexure_grn_items IS 'Items associated with each JW Annexure GRN';
COMMENT ON COLUMN store_jw_annexure_grn.jw_no IS 'Job Work Number';
COMMENT ON COLUMN store_jw_annexure_grn.jw_date IS 'Job Work Date';
COMMENT ON COLUMN store_jw_annexure_grn.indent_no IS 'Indent Number';
COMMENT ON COLUMN store_jw_annexure_grn.indent_date IS 'Indent Date';
COMMENT ON COLUMN store_jw_annexure_grn.challan_no IS 'Challan Number';
COMMENT ON COLUMN store_jw_annexure_grn.challan_date IS 'Challan Date';
COMMENT ON COLUMN store_jw_annexure_grn.total_value IS 'Total Value';
