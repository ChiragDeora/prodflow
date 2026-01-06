-- ============================================================================
-- STOCK LEDGER SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This migration creates the complete stock ledger system including:
-- 1. Core stock tables (stock_items, stock_locations, stock_ledger, stock_balances)
-- 2. Stock item mappings for document integration
-- 3. New document tables (customer_returns, stock_adjustments)
-- 4. Fields added to existing document tables for stock posting
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: STOCK LOCATIONS TABLE
-- ============================================================================
-- Reference table for valid stock locations (3 locations as per spec)

CREATE TABLE IF NOT EXISTS stock_locations (
    id SERIAL PRIMARY KEY,
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50) CHECK (location_type IN ('WAREHOUSE', 'PRODUCTION')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the three stock locations
INSERT INTO stock_locations (location_code, location_name, location_type) VALUES
    ('STORE', 'Main Store', 'WAREHOUSE'),
    ('PRODUCTION', 'Production Floor', 'PRODUCTION'),
    ('FG_STORE', 'Finished Goods Store', 'WAREHOUSE')
ON CONFLICT (location_code) DO NOTHING;

COMMENT ON TABLE stock_locations IS 'Reference table for valid stock locations';
COMMENT ON COLUMN stock_locations.location_code IS 'Unique code: STORE, PRODUCTION, FG_STORE';
COMMENT ON COLUMN stock_locations.location_type IS 'WAREHOUSE or PRODUCTION';

-- ============================================================================
-- SECTION 2: STOCK ITEMS TABLE
-- ============================================================================
-- Master list of all trackable items

CREATE TABLE IF NOT EXISTS stock_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(100) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('RM', 'PM', 'SFG', 'FG')),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    unit_of_measure VARCHAR(20) NOT NULL CHECK (unit_of_measure IN ('KG', 'NOS', 'METERS')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for stock_items
CREATE INDEX IF NOT EXISTS idx_stock_items_item_code ON stock_items(item_code);
CREATE INDEX IF NOT EXISTS idx_stock_items_item_type ON stock_items(item_type);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_items_is_active ON stock_items(is_active);

COMMENT ON TABLE stock_items IS 'Master list of all trackable stock items';
COMMENT ON COLUMN stock_items.item_code IS 'Unique identifier: PP-HP-HJ333MO for RM, 110110001 for SFG, etc.';
COMMENT ON COLUMN stock_items.item_type IS 'RM=Raw Material, PM=Packing Material, SFG=Semi-Finished Goods, FG=Finished Goods';
COMMENT ON COLUMN stock_items.category IS 'Grouping: PP, MB, REGRIND, LABEL, BOPP, Boxes, Polybags';
COMMENT ON COLUMN stock_items.sub_category IS 'Sub-grouping: HP, ICP, RCP for PP items';

-- ============================================================================
-- SECTION 3: STOCK LEDGER TABLE
-- ============================================================================
-- Core immutable log of all stock movements

CREATE TABLE IF NOT EXISTS stock_ledger (
    id BIGSERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES stock_items(id),
    item_code VARCHAR(100) NOT NULL,
    location_code VARCHAR(50) NOT NULL REFERENCES stock_locations(location_code),
    quantity DECIMAL(15, 4) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    balance_after DECIMAL(15, 4) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    document_type VARCHAR(50) NOT NULL,
    document_id UUID NOT NULL,
    document_number VARCHAR(100),
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    counterpart_location VARCHAR(50),
    posted_by VARCHAR(255),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remarks TEXT,
    
    -- Prevent duplicate posting of same document
    CONSTRAINT stock_ledger_unique_entry UNIQUE (document_type, document_id, item_code, location_code, movement_type)
);

-- Indexes for stock_ledger
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_location ON stock_ledger(item_code, location_code);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_document ON stock_ledger(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_transaction_date ON stock_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_date ON stock_ledger(item_code, transaction_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_location ON stock_ledger(location_code);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_id ON stock_ledger(item_id);

COMMENT ON TABLE stock_ledger IS 'Immutable log of all stock movements - the core of the stock system';
COMMENT ON COLUMN stock_ledger.quantity IS 'Positive for IN, negative for OUT';
COMMENT ON COLUMN stock_ledger.balance_after IS 'Running balance after this entry';
COMMENT ON COLUMN stock_ledger.document_type IS 'GRN, JW_GRN, MIS, DPR, FG_TRANSFER, DISPATCH, CUSTOMER_RETURN, ADJUSTMENT, OPENING_BALANCE';
COMMENT ON COLUMN stock_ledger.counterpart_location IS 'For transfers, the other location involved';

-- ============================================================================
-- SECTION 4: STOCK BALANCES TABLE
-- ============================================================================
-- Cache of current balances for quick lookup

CREATE TABLE IF NOT EXISTS stock_balances (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES stock_items(id),
    item_code VARCHAR(100) NOT NULL,
    location_code VARCHAR(50) NOT NULL REFERENCES stock_locations(location_code),
    current_balance DECIMAL(15, 4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(20) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT stock_balances_unique UNIQUE (item_code, location_code)
);

-- Indexes for stock_balances
CREATE INDEX IF NOT EXISTS idx_stock_balances_item_code ON stock_balances(item_code);
CREATE INDEX IF NOT EXISTS idx_stock_balances_location ON stock_balances(location_code);
CREATE INDEX IF NOT EXISTS idx_stock_balances_item_id ON stock_balances(item_id);

COMMENT ON TABLE stock_balances IS 'Cache of current balances for quick lookup';
COMMENT ON COLUMN stock_balances.current_balance IS 'Should equal sum of all ledger entries for this item/location';

-- ============================================================================
-- SECTION 5: STOCK ITEM MAPPINGS TABLE
-- ============================================================================
-- Maps document descriptions to stock item codes

CREATE TABLE IF NOT EXISTS stock_item_mappings (
    id SERIAL PRIMARY KEY,
    source_table VARCHAR(100) NOT NULL,
    source_description VARCHAR(500) NOT NULL,
    stock_item_code VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT stock_item_mappings_unique UNIQUE (source_table, source_description)
);

-- Index for mappings lookup
CREATE INDEX IF NOT EXISTS idx_stock_item_mappings_lookup ON stock_item_mappings(source_table, source_description);

COMMENT ON TABLE stock_item_mappings IS 'Maps document descriptions to stock item codes when they do not match exactly';
COMMENT ON COLUMN stock_item_mappings.source_table IS 'Which document type: grn, mis, dispatch, etc.';

-- ============================================================================
-- SECTION 6: STOCK ADJUSTMENTS TABLES
-- ============================================================================
-- For stock adjustments (increase, decrease, opening balance)

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_no VARCHAR(100) UNIQUE NOT NULL,
    adjustment_date DATE NOT NULL,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('INCREASE', 'DECREASE', 'OPENING')),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    posted_to_stock_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL CHECK (quantity > 0),
    unit_of_measure VARCHAR(20) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for stock_adjustments
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON stock_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_type ON stock_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_items_adjustment_id ON stock_adjustment_items(adjustment_id);

COMMENT ON TABLE stock_adjustments IS 'Header for stock adjustment documents';
COMMENT ON TABLE stock_adjustment_items IS 'Line items for stock adjustments';
COMMENT ON COLUMN stock_adjustments.adjustment_type IS 'INCREASE: add stock, DECREASE: remove stock, OPENING: initial stock';

-- ============================================================================
-- SECTION 7: CUSTOMER RETURNS TABLES
-- ============================================================================
-- For tracking goods returned by customers

CREATE TABLE IF NOT EXISTS customer_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_no VARCHAR(100) UNIQUE NOT NULL,
    return_date DATE NOT NULL,
    party_name VARCHAR(255),
    original_dispatch_id UUID,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    posted_to_stock_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS customer_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES customer_returns(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL CHECK (quantity > 0),
    unit_of_measure VARCHAR(20) DEFAULT 'NOS',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_returns
CREATE INDEX IF NOT EXISTS idx_customer_returns_date ON customer_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_customer_returns_party ON customer_returns(party_name);
CREATE INDEX IF NOT EXISTS idx_customer_returns_status ON customer_returns(status);
CREATE INDEX IF NOT EXISTS idx_customer_return_items_return_id ON customer_return_items(return_id);

COMMENT ON TABLE customer_returns IS 'Header for customer return documents';
COMMENT ON TABLE customer_return_items IS 'Line items for customer returns';
COMMENT ON COLUMN customer_returns.original_dispatch_id IS 'Optional link to original dispatch document';

-- ============================================================================
-- SECTION 8: ADD STOCK STATUS FIELDS TO EXISTING TABLES
-- ============================================================================

-- Add to store_grn
ALTER TABLE store_grn 
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);

-- Add to store_jw_annexure_grn
ALTER TABLE store_jw_annexure_grn 
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);

-- Add to store_mis
ALTER TABLE store_mis 
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);

-- Add to store_fgn (FG Transfer)
ALTER TABLE store_fgn 
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);

-- Add QC status to store_fgn_items
ALTER TABLE store_fgn_items 
    ADD COLUMN IF NOT EXISTS qc_status VARCHAR(20) DEFAULT 'PASSED' CHECK (qc_status IN ('PASSED', 'QC_HOLD'));

-- Add to dispatch_dispatch_memo
ALTER TABLE dispatch_dispatch_memo 
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);

-- Add to dispatch_delivery_challan
ALTER TABLE dispatch_delivery_challan 
    ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);

-- Add to dpr_data (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        ALTER TABLE dpr_data 
            ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
            ADD COLUMN IF NOT EXISTS posted_to_stock_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS posted_to_stock_by VARCHAR(255);
    END IF;
END $$;

-- ============================================================================
-- SECTION 9: INDEXES FOR STOCK STATUS FIELDS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_store_grn_stock_status ON store_grn(stock_status);
CREATE INDEX IF NOT EXISTS idx_store_jw_annexure_grn_stock_status ON store_jw_annexure_grn(stock_status);
CREATE INDEX IF NOT EXISTS idx_store_mis_stock_status ON store_mis(stock_status);
CREATE INDEX IF NOT EXISTS idx_store_fgn_stock_status ON store_fgn(stock_status);
CREATE INDEX IF NOT EXISTS idx_dispatch_memo_stock_status ON dispatch_dispatch_memo(stock_status);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_stock_status ON dispatch_delivery_challan(stock_status);

-- Create index on dpr_data only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        CREATE INDEX IF NOT EXISTS idx_dpr_data_stock_status ON dpr_data(stock_status);
    END IF;
END $$;

-- ============================================================================
-- SECTION 10: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for stock tables
CREATE TRIGGER trigger_stock_items_updated_at
    BEFORE UPDATE ON stock_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_updated_at();

CREATE TRIGGER trigger_stock_adjustments_updated_at
    BEFORE UPDATE ON stock_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_updated_at();

CREATE TRIGGER trigger_customer_returns_updated_at
    BEFORE UPDATE ON customer_returns
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_updated_at();

-- ============================================================================
-- SECTION 11: ROW LEVEL SECURITY (RLS) - DISABLED FOR API ACCESS
-- ============================================================================
-- RLS is DISABLED on stock tables to allow API access without authentication issues
-- This follows the pattern used in other master tables in this codebase

-- Disable RLS on all stock tables (not enable)
ALTER TABLE stock_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_item_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_return_items DISABLE ROW LEVEL SECURITY;

-- No RLS policies needed since RLS is disabled

-- ============================================================================
-- SECTION 12: HELPER FUNCTIONS FOR STOCK OPERATIONS
-- ============================================================================

-- Function to get current balance for an item at a location
CREATE OR REPLACE FUNCTION get_stock_balance(
    p_item_code VARCHAR,
    p_location_code VARCHAR
) RETURNS DECIMAL(15, 4) AS $$
DECLARE
    v_balance DECIMAL(15, 4);
BEGIN
    SELECT current_balance INTO v_balance
    FROM stock_balances
    WHERE item_code = p_item_code AND location_code = p_location_code;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if a document is already posted
CREATE OR REPLACE FUNCTION is_document_posted(
    p_document_type VARCHAR,
    p_document_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM stock_ledger 
        WHERE document_type = p_document_type AND document_id = p_document_id
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate adjustment number
CREATE OR REPLACE FUNCTION generate_adjustment_number() 
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR;
    v_month VARCHAR;
    v_count INTEGER;
    v_number VARCHAR;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM stock_adjustments
    WHERE adjustment_no LIKE 'ADJ-' || v_year || v_month || '%';
    
    v_number := 'ADJ-' || v_year || v_month || '-' || LPAD(v_count::VARCHAR, 4, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate customer return number
CREATE OR REPLACE FUNCTION generate_return_number() 
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR;
    v_month VARCHAR;
    v_count INTEGER;
    v_number VARCHAR;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM customer_returns
    WHERE return_no LIKE 'RET-' || v_year || v_month || '%';
    
    v_number := 'RET-' || v_year || v_month || '-' || LPAD(v_count::VARCHAR, 4, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 13: VIEWS FOR REPORTING
-- ============================================================================

-- View for current stock summary by location
CREATE OR REPLACE VIEW stock_summary_by_location AS
SELECT 
    sb.location_code,
    sl.location_name,
    si.item_type,
    COUNT(DISTINCT sb.item_code) AS item_count,
    SUM(sb.current_balance) AS total_quantity
FROM stock_balances sb
JOIN stock_locations sl ON sb.location_code = sl.location_code
JOIN stock_items si ON sb.item_code = si.item_code
WHERE si.is_active = TRUE
GROUP BY sb.location_code, sl.location_name, si.item_type
ORDER BY sb.location_code, si.item_type;

-- View for stock items with balances
CREATE OR REPLACE VIEW stock_items_with_balances AS
SELECT 
    si.id,
    si.item_code,
    si.item_name,
    si.item_type,
    si.category,
    si.sub_category,
    si.unit_of_measure,
    COALESCE(sb_store.current_balance, 0) AS store_balance,
    COALESCE(sb_prod.current_balance, 0) AS production_balance,
    COALESCE(sb_fg.current_balance, 0) AS fg_store_balance,
    COALESCE(sb_store.current_balance, 0) + 
    COALESCE(sb_prod.current_balance, 0) + 
    COALESCE(sb_fg.current_balance, 0) AS total_balance
FROM stock_items si
LEFT JOIN stock_balances sb_store ON si.item_code = sb_store.item_code AND sb_store.location_code = 'STORE'
LEFT JOIN stock_balances sb_prod ON si.item_code = sb_prod.item_code AND sb_prod.location_code = 'PRODUCTION'
LEFT JOIN stock_balances sb_fg ON si.item_code = sb_fg.item_code AND sb_fg.location_code = 'FG_STORE'
WHERE si.is_active = TRUE
ORDER BY si.item_type, si.item_code;

-- View for recent ledger entries
CREATE OR REPLACE VIEW stock_ledger_recent AS
SELECT 
    sled.id,
    sled.item_code,
    si.item_name,
    si.item_type,
    sled.location_code,
    sled.quantity,
    sled.unit_of_measure,
    sled.balance_after,
    sled.transaction_date,
    sled.document_type,
    sled.document_number,
    sled.movement_type,
    sled.counterpart_location,
    sled.posted_by,
    sled.posted_at,
    sled.remarks
FROM stock_ledger sled
JOIN stock_items si ON sled.item_code = si.item_code
ORDER BY sled.posted_at DESC;

-- ============================================================================
-- SECTION 14: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN store_grn.stock_status IS 'Stock posting status: DRAFT, POSTED, or CANCELLED';
COMMENT ON COLUMN store_grn.posted_to_stock_at IS 'Timestamp when posted to stock ledger';
COMMENT ON COLUMN store_grn.posted_to_stock_by IS 'User who posted to stock ledger';

COMMENT ON COLUMN store_mis.stock_status IS 'Stock posting status: DRAFT, POSTED, or CANCELLED';
COMMENT ON COLUMN store_fgn.stock_status IS 'Stock posting status: DRAFT, POSTED, or CANCELLED';
COMMENT ON COLUMN store_fgn_items.qc_status IS 'QC status: PASSED or QC_HOLD';

-- Add comment on dpr_data only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dpr_data') THEN
        COMMENT ON COLUMN dpr_data.stock_status IS 'Stock posting status: DRAFT, POSTED, or CANCELLED';
    END IF;
END $$;

COMMENT ON FUNCTION get_stock_balance IS 'Returns current balance for an item at a location, or 0 if not found';
COMMENT ON FUNCTION is_document_posted IS 'Checks if a document has already been posted to stock';

-- ============================================================================
-- END OF STOCK LEDGER SYSTEM MIGRATION
-- ============================================================================

