-- ============================================================================
-- CREATE PRODUCTION FG TRANSFER NOTE TABLES
-- ============================================================================
-- This migration creates new tables for FG Transfer Note in production module:
-- - production_fg_transfer_note (header table)
-- - production_fg_transfer_note_items (line items table)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PRODUCTION_FG_TRANSFER_NOTE (Header Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_fg_transfer_note (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(50) NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_dept VARCHAR(200),
    to_dept VARCHAR(200),
    transfer_date_time TIMESTAMP WITH TIME ZONE,
    shift_incharge VARCHAR(200),
    qc_inspector VARCHAR(200),
    fg_received_by VARCHAR(200),
    stock_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (stock_status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    posted_at TIMESTAMP WITH TIME ZONE,
    posted_by VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_production_fg_transfer_note_doc_no ON production_fg_transfer_note(doc_no);
CREATE INDEX IF NOT EXISTS idx_production_fg_transfer_note_date ON production_fg_transfer_note(date);
CREATE INDEX IF NOT EXISTS idx_production_fg_transfer_note_stock_status ON production_fg_transfer_note(stock_status);

-- Disable RLS since the application uses custom authentication
ALTER TABLE production_fg_transfer_note DISABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_production_fg_transfer_note_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_production_fg_transfer_note_updated_at ON production_fg_transfer_note;
CREATE TRIGGER update_production_fg_transfer_note_updated_at 
    BEFORE UPDATE ON production_fg_transfer_note
    FOR EACH ROW EXECUTE FUNCTION update_production_fg_transfer_note_updated_at();

-- ============================================================================
-- PRODUCTION_FG_TRANSFER_NOTE_ITEMS (Line Items Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_fg_transfer_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_note_id UUID NOT NULL REFERENCES production_fg_transfer_note(id) ON DELETE CASCADE,
    sl_no INTEGER NOT NULL,
    fg_code VARCHAR(100) NOT NULL,
    bom_type VARCHAR(20) NOT NULL CHECK (bom_type IN ('FG', 'LOCAL')),
    item_name VARCHAR(200),
    party VARCHAR(200),
    color VARCHAR(100),
    qty_boxes INTEGER NOT NULL CHECK (qty_boxes > 0),
    pack_size INTEGER NOT NULL,
    total_qty_pcs INTEGER NOT NULL,
    total_qty_ton DECIMAL(10,4),
    -- SFG components from BOM
    -- Note: sfg1_int_wt and sfg2_int_wt are fetched from molds table via SFG BOM lookup:
    -- SFG Code → sfg_bom.item_name (mold name) → molds.int_wt
    sfg1_code VARCHAR(100),
    sfg1_qty INTEGER,
    sfg1_deduct INTEGER,
    sfg1_int_wt DECIMAL(10,4), -- Fetched from molds.int_wt via sfg_bom lookup at time of creation
    sfg2_code VARCHAR(100),
    sfg2_qty INTEGER,
    sfg2_deduct INTEGER,
    sfg2_int_wt DECIMAL(10,4), -- Fetched from molds.int_wt via sfg_bom lookup at time of creation
    -- Packing materials from BOM
    cnt_code VARCHAR(100),
    cnt_qty DECIMAL(10,4),
    cnt_deduct DECIMAL(10,4),
    polybag_code VARCHAR(100),
    polybag_qty DECIMAL(10,4),
    polybag_deduct DECIMAL(10,4),
    bopp1_code VARCHAR(100),
    bopp1_qty DECIMAL(10,4),
    bopp1_deduct DECIMAL(10,4),
    bopp2_code VARCHAR(100),
    bopp2_qty DECIMAL(10,4),
    bopp2_deduct DECIMAL(10,4),
    -- Other fields
    qc_check BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_production_fg_transfer_note_items_transfer_note_id 
    ON production_fg_transfer_note_items(transfer_note_id);
CREATE INDEX IF NOT EXISTS idx_production_fg_transfer_note_items_fg_code 
    ON production_fg_transfer_note_items(fg_code);
CREATE INDEX IF NOT EXISTS idx_production_fg_transfer_note_items_bom_type 
    ON production_fg_transfer_note_items(bom_type);

-- Disable RLS since the application uses custom authentication
ALTER TABLE production_fg_transfer_note_items DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE production_fg_transfer_note IS 'FG Transfer Note header - packing SFG into FG';
COMMENT ON TABLE production_fg_transfer_note_items IS 'FG Transfer Note line items';
COMMENT ON COLUMN production_fg_transfer_note.stock_status IS 'DRAFT: Not posted, POSTED: Stock movements created, CANCELLED: Reversed';
COMMENT ON COLUMN production_fg_transfer_note_items.total_qty_pcs IS 'Calculated: pack_size × qty_boxes';
COMMENT ON COLUMN production_fg_transfer_note_items.total_qty_ton IS 'Calculated: ((sfg1_qty × sfg1_int_wt) + (sfg2_qty × sfg2_int_wt)) × qty_boxes / 1,000,000';

-- ============================================================================
-- LOG MIGRATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Created production_fg_transfer_note table';
    RAISE NOTICE '✅ Created production_fg_transfer_note_items table';
    RAISE NOTICE '✅ FG Transfer Note tables created successfully!';
END $$;

