-- ============================================================================
-- STORE MODULE - Database Schema
-- Creates tables for GRN (Goods Received Note), MIS (Material Issue Slip), and FGN (Finished Goods Transfer Note)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- GRN (GOODS RECEIVED NOTE) TABLES
-- ============================================================================

-- Main GRN table
CREATE TABLE IF NOT EXISTS store_grn (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    po_no VARCHAR(100),
    po_date DATE,
    invoice_no VARCHAR(100),
    invoice_date DATE,
    type_of_material VARCHAR(10) CHECK (type_of_material IN ('RM', 'PM', 'STORE')),
    grn_no VARCHAR(100),
    grn_date DATE,
    received_by VARCHAR(255),
    verified_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT grn_date_check CHECK (date IS NOT NULL),
    CONSTRAINT grn_supplier_check CHECK (supplier_name <> '')
);

-- GRN items table
CREATE TABLE IF NOT EXISTS store_grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES store_grn(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    item_description TEXT NOT NULL,
    box_bag VARCHAR(50),
    per_box_bag_qty DECIMAL(15, 2),
    total_qty DECIMAL(15, 2),
    uom VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT grn_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT grn_items_description_check CHECK (item_description <> ''),
    UNIQUE(grn_id, sr_no)
);

-- ============================================================================
-- MIS (MATERIAL ISSUE SLIP) TABLES
-- ============================================================================

-- Main MIS table
CREATE TABLE IF NOT EXISTS store_mis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    dept_name VARCHAR(255) NOT NULL,
    issue_no VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    prepared_by VARCHAR(255),
    authorized_sign VARCHAR(255),
    receiver_sign VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT mis_date_check CHECK (date IS NOT NULL),
    CONSTRAINT mis_dept_check CHECK (dept_name <> ''),
    CONSTRAINT mis_issue_no_check CHECK (issue_no <> '')
);

-- MIS items table
CREATE TABLE IF NOT EXISTS store_mis_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mis_id UUID NOT NULL REFERENCES store_mis(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    description_of_material TEXT NOT NULL,
    uom VARCHAR(50),
    required_qty DECIMAL(15, 2),
    issue_qty DECIMAL(15, 2),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT mis_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT mis_items_description_check CHECK (description_of_material <> ''),
    UNIQUE(mis_id, sr_no)
);

-- ============================================================================
-- FGN (FINISHED GOODS TRANSFER NOTE) TABLES
-- ============================================================================

-- Main FGN table
CREATE TABLE IF NOT EXISTS store_fgn (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    from_dept VARCHAR(255) NOT NULL,
    to_dept VARCHAR(255) NOT NULL,
    transfer_no VARCHAR(100) NOT NULL,
    transfer_date_time TIMESTAMP WITH TIME ZONE,
    shift_incharge_name_sign VARCHAR(255),
    qc_inspector_name_sign VARCHAR(255),
    fg_received_name_sign VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT fgn_date_check CHECK (date IS NOT NULL),
    CONSTRAINT fgn_from_dept_check CHECK (from_dept <> ''),
    CONSTRAINT fgn_to_dept_check CHECK (to_dept <> ''),
    CONSTRAINT fgn_transfer_no_check CHECK (transfer_no <> '')
);

-- FGN items table
CREATE TABLE IF NOT EXISTS store_fgn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fgn_id UUID NOT NULL REFERENCES store_fgn(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    no_of_boxes INTEGER,
    qty_in_box DECIMAL(15, 2),
    total_qty DECIMAL(15, 2),
    received_qty DECIMAL(15, 2),
    qc_check VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fgn_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT fgn_items_item_name_check CHECK (item_name <> ''),
    UNIQUE(fgn_id, sr_no)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- GRN indexes
CREATE INDEX IF NOT EXISTS idx_grn_date ON store_grn(date);
CREATE INDEX IF NOT EXISTS idx_grn_doc_no ON store_grn(doc_no);
CREATE INDEX IF NOT EXISTS idx_grn_supplier_name ON store_grn(supplier_name);
CREATE INDEX IF NOT EXISTS idx_grn_po_no ON store_grn(po_no);
CREATE INDEX IF NOT EXISTS idx_grn_created_at ON store_grn(created_at);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON store_grn_items(grn_id);

-- MIS indexes
CREATE INDEX IF NOT EXISTS idx_mis_date ON store_mis(date);
CREATE INDEX IF NOT EXISTS idx_mis_doc_no ON store_mis(doc_no);
CREATE INDEX IF NOT EXISTS idx_mis_dept_name ON store_mis(dept_name);
CREATE INDEX IF NOT EXISTS idx_mis_issue_no ON store_mis(issue_no);
CREATE INDEX IF NOT EXISTS idx_mis_created_at ON store_mis(created_at);
CREATE INDEX IF NOT EXISTS idx_mis_items_mis_id ON store_mis_items(mis_id);

-- FGN indexes
CREATE INDEX IF NOT EXISTS idx_fgn_date ON store_fgn(date);
CREATE INDEX IF NOT EXISTS idx_fgn_doc_no ON store_fgn(doc_no);
CREATE INDEX IF NOT EXISTS idx_fgn_from_dept ON store_fgn(from_dept);
CREATE INDEX IF NOT EXISTS idx_fgn_to_dept ON store_fgn(to_dept);
CREATE INDEX IF NOT EXISTS idx_fgn_transfer_no ON store_fgn(transfer_no);
CREATE INDEX IF NOT EXISTS idx_fgn_created_at ON store_fgn(created_at);
CREATE INDEX IF NOT EXISTS idx_fgn_items_fgn_id ON store_fgn_items(fgn_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for GRN
CREATE TRIGGER update_grn_updated_at
    BEFORE UPDATE ON store_grn
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for MIS
CREATE TRIGGER update_mis_updated_at
    BEFORE UPDATE ON store_mis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for FGN
CREATE TRIGGER update_fgn_updated_at
    BEFORE UPDATE ON store_fgn
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE store_grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_mis ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_mis_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_fgn ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_fgn_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for GRN
CREATE POLICY "Allow all operations for authenticated users on store_grn"
    ON store_grn
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on store_grn_items"
    ON store_grn_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for MIS
CREATE POLICY "Allow all operations for authenticated users on store_mis"
    ON store_mis
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on store_mis_items"
    ON store_mis_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for FGN
CREATE POLICY "Allow all operations for authenticated users on store_fgn"
    ON store_fgn
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on store_fgn_items"
    ON store_fgn_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE store_grn IS 'Goods Received Note (GRN) for tracking incoming materials';
COMMENT ON TABLE store_grn_items IS 'Items associated with each GRN';
COMMENT ON TABLE store_mis IS 'Material Issue Slip (MIS) for issuing materials from store';
COMMENT ON TABLE store_mis_items IS 'Items associated with each MIS';
COMMENT ON TABLE store_fgn IS 'Finished Goods Transfer Note (FGN) for transferring finished goods';
COMMENT ON TABLE store_fgn_items IS 'Items associated with each FGN';

COMMENT ON COLUMN store_grn.type_of_material IS 'Type: RM (Raw Material), PM (Packing Material), or STORE';
COMMENT ON COLUMN store_fgn.transfer_date_time IS 'Date and time of transfer';

