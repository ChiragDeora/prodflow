-- ============================================================================
-- DISPATCH MODULE - Database Schema
-- Creates tables for Dispatch Memo and Delivery Challan
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DISPATCH MEMO TABLES
-- ============================================================================

-- Main dispatch memo table
CREATE TABLE IF NOT EXISTS dispatch_dispatch_memo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    memo_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    prepared_by VARCHAR(255),
    checked_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- Reference to user who created this memo
    CONSTRAINT dispatch_memo_date_check CHECK (date IS NOT NULL),
    CONSTRAINT dispatch_memo_party_name_check CHECK (party_name <> '')
);

-- Dispatch memo items table (one-to-many relationship)
CREATE TABLE IF NOT EXISTS dispatch_dispatch_memo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memo_id UUID NOT NULL REFERENCES dispatch_dispatch_memo(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    no_box VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT dispatch_memo_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT dispatch_memo_items_item_name_check CHECK (item_name <> ''),
    UNIQUE(memo_id, sr_no)
);

-- ============================================================================
-- DELIVERY CHALLAN TABLES
-- ============================================================================

-- Main delivery challan table
CREATE TABLE IF NOT EXISTS dispatch_delivery_challan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    sr_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    vehicle_no VARCHAR(100),
    lr_no VARCHAR(100),
    returnable BOOLEAN DEFAULT FALSE,
    to_address TEXT NOT NULL, -- Recipient address
    state VARCHAR(100),
    total_qty DECIMAL(15, 2) DEFAULT 0,
    received_by TEXT,
    prepared_by VARCHAR(255),
    checked_by VARCHAR(255),
    authorized_signatory VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- Reference to user who created this challan
    CONSTRAINT delivery_challan_date_check CHECK (date IS NOT NULL),
    CONSTRAINT delivery_challan_to_address_check CHECK (to_address <> '')
);

-- Delivery challan items table (one-to-many relationship)
CREATE TABLE IF NOT EXISTS dispatch_delivery_challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES dispatch_delivery_challan(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    material_description TEXT NOT NULL,
    qty DECIMAL(15, 2),
    uom VARCHAR(50), -- Unit of measurement (kg, pcs, etc.)
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT delivery_challan_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT delivery_challan_items_material_description_check CHECK (material_description <> ''),
    UNIQUE(challan_id, sr_no)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Dispatch Memo indexes
CREATE INDEX IF NOT EXISTS idx_dispatch_memo_date ON dispatch_dispatch_memo(date);
CREATE INDEX IF NOT EXISTS idx_dispatch_memo_party_name ON dispatch_dispatch_memo(party_name);
CREATE INDEX IF NOT EXISTS idx_dispatch_memo_doc_no ON dispatch_dispatch_memo(doc_no);
CREATE INDEX IF NOT EXISTS idx_dispatch_memo_memo_no ON dispatch_dispatch_memo(memo_no);
CREATE INDEX IF NOT EXISTS idx_dispatch_memo_created_at ON dispatch_dispatch_memo(created_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_memo_items_memo_id ON dispatch_dispatch_memo_items(memo_id);

-- Delivery Challan indexes
CREATE INDEX IF NOT EXISTS idx_delivery_challan_date ON dispatch_delivery_challan(date);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_sr_no ON dispatch_delivery_challan(sr_no);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_doc_no ON dispatch_delivery_challan(doc_no);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_vehicle_no ON dispatch_delivery_challan(vehicle_no);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_created_at ON dispatch_delivery_challan(created_at);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_items_challan_id ON dispatch_delivery_challan_items(challan_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_dispatch_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for dispatch_memo
CREATE TRIGGER update_dispatch_memo_updated_at
    BEFORE UPDATE ON dispatch_dispatch_memo
    FOR EACH ROW
    EXECUTE FUNCTION update_dispatch_updated_at_column();

-- Trigger for delivery_challan
CREATE TRIGGER update_delivery_challan_updated_at
    BEFORE UPDATE ON dispatch_delivery_challan
    FOR EACH ROW
    EXECUTE FUNCTION update_dispatch_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE dispatch_dispatch_memo ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_dispatch_memo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_delivery_challan ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_delivery_challan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispatch_memo
CREATE POLICY "Allow all operations for authenticated users on dispatch_memo"
    ON dispatch_dispatch_memo
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on dispatch_memo_items"
    ON dispatch_dispatch_memo_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for delivery_challan
CREATE POLICY "Allow all operations for authenticated users on delivery_challan"
    ON dispatch_delivery_challan
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on delivery_challan_items"
    ON dispatch_delivery_challan_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE dispatch_dispatch_memo IS 'Main table for storing dispatch memo information';
COMMENT ON TABLE dispatch_dispatch_memo_items IS 'Items associated with each dispatch memo';
COMMENT ON TABLE dispatch_delivery_challan IS 'Main table for storing delivery challan information';
COMMENT ON TABLE dispatch_delivery_challan_items IS 'Items associated with each delivery challan';

COMMENT ON COLUMN dispatch_dispatch_memo.doc_no IS 'Auto-generated document number (e.g., DPPL-COM-YYYYMM-XXX/R00)';
COMMENT ON COLUMN dispatch_dispatch_memo.memo_no IS 'Memo number entered by user';
COMMENT ON COLUMN dispatch_delivery_challan.doc_no IS 'Auto-generated document number for delivery challan';
COMMENT ON COLUMN dispatch_delivery_challan.sr_no IS 'Serial number entered by user';
COMMENT ON COLUMN dispatch_delivery_challan.returnable IS 'Whether the items are returnable or non-returnable';

