-- ============================================================================
-- PURCHASE MODULE - Database Schema
-- Creates tables for Vendor Registration, Material Indent Slip, and Purchase Order
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- VENDOR REGISTRATION (VRF) TABLES
-- ============================================================================

-- Main vendor registration table
CREATE TABLE IF NOT EXISTS purchase_vendor_registration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_no VARCHAR(50),
    email_id VARCHAR(255),
    gst_no VARCHAR(50),
    pan_no VARCHAR(50),
    customer_supplier VARCHAR(50) CHECK (customer_supplier IN ('Customer', 'Supplier')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT vendor_customer_name_check CHECK (customer_name <> ''),
    CONSTRAINT vendor_address_check CHECK (address <> '')
);

-- ============================================================================
-- MATERIAL INDENT SLIP TABLES
-- ============================================================================

-- Main material indent slip table
CREATE TABLE IF NOT EXISTS purchase_material_indent_slip (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    sr_no VARCHAR(100) NOT NULL,
    indent_date DATE NOT NULL,
    to_address TEXT NOT NULL,
    purchase_store_incharge VARCHAR(255),
    tentative_required_date DATE,
    dept_head_sign VARCHAR(255),
    store_inch_sign VARCHAR(255),
    plant_head_sign VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT material_indent_date_check CHECK (date IS NOT NULL),
    CONSTRAINT material_indent_department_check CHECK (department_name <> '')
);

-- Material indent slip items table (one-to-many relationship)
CREATE TABLE IF NOT EXISTS purchase_material_indent_slip_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_slip_id UUID NOT NULL REFERENCES purchase_material_indent_slip(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    description_specification TEXT NOT NULL,
    qty DECIMAL(15, 2),
    uom VARCHAR(50),
    make_mfg_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT material_indent_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT material_indent_items_description_check CHECK (description_specification <> ''),
    UNIQUE(indent_slip_id, sr_no)
);

-- ============================================================================
-- PURCHASE ORDER TABLES
-- ============================================================================

-- Main purchase order table
CREATE TABLE IF NOT EXISTS purchase_purchase_order (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    po_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    to_address TEXT NOT NULL,
    reference VARCHAR(255),
    total_amt DECIMAL(15, 2) DEFAULT 0,
    gst_percentage DECIMAL(5, 2) DEFAULT 18,
    gst_amount DECIMAL(15, 2) DEFAULT 0,
    final_amt DECIMAL(15, 2) DEFAULT 0,
    amount_in_words TEXT,
    in_favour_of TEXT,
    inspection TEXT,
    authorized_signatory VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT purchase_order_date_check CHECK (date IS NOT NULL),
    CONSTRAINT purchase_order_to_address_check CHECK (to_address <> '')
);

-- Purchase order items table (one-to-many relationship)
CREATE TABLE IF NOT EXISTS purchase_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_purchase_order(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    description TEXT NOT NULL,
    qty DECIMAL(15, 2),
    unit VARCHAR(50),
    unit_price DECIMAL(15, 2),
    total_price DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT purchase_order_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT purchase_order_items_description_check CHECK (description <> ''),
    UNIQUE(purchase_order_id, sr_no)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Vendor Registration indexes
CREATE INDEX IF NOT EXISTS idx_vendor_registration_customer_name ON purchase_vendor_registration(customer_name);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_gst_no ON purchase_vendor_registration(gst_no);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_customer_supplier ON purchase_vendor_registration(customer_supplier);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_created_at ON purchase_vendor_registration(created_at);

-- Material Indent Slip indexes
CREATE INDEX IF NOT EXISTS idx_material_indent_date ON purchase_material_indent_slip(date);
CREATE INDEX IF NOT EXISTS idx_material_indent_doc_no ON purchase_material_indent_slip(doc_no);
CREATE INDEX IF NOT EXISTS idx_material_indent_department ON purchase_material_indent_slip(department_name);
CREATE INDEX IF NOT EXISTS idx_material_indent_created_at ON purchase_material_indent_slip(created_at);
CREATE INDEX IF NOT EXISTS idx_material_indent_items_indent_slip_id ON purchase_material_indent_slip_items(indent_slip_id);

-- Purchase Order indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_date ON purchase_purchase_order(date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_po_no ON purchase_purchase_order(po_no);
CREATE INDEX IF NOT EXISTS idx_purchase_order_doc_no ON purchase_purchase_order(doc_no);
CREATE INDEX IF NOT EXISTS idx_purchase_order_created_at ON purchase_purchase_order(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_purchase_order_items(purchase_order_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for vendor_registration
CREATE TRIGGER update_vendor_registration_updated_at
    BEFORE UPDATE ON purchase_vendor_registration
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for material_indent_slip
CREATE TRIGGER update_material_indent_slip_updated_at
    BEFORE UPDATE ON purchase_material_indent_slip
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for purchase_order
CREATE TRIGGER update_purchase_order_updated_at
    BEFORE UPDATE ON purchase_purchase_order
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE purchase_vendor_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_material_indent_slip ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_material_indent_slip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_purchase_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_registration
CREATE POLICY "Allow all operations for authenticated users on vendor_registration"
    ON purchase_vendor_registration
    FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for material_indent_slip
CREATE POLICY "Allow all operations for authenticated users on material_indent_slip"
    ON purchase_material_indent_slip
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on material_indent_slip_items"
    ON purchase_material_indent_slip_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS Policies for purchase_order
CREATE POLICY "Allow all operations for authenticated users on purchase_order"
    ON purchase_purchase_order
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on purchase_order_items"
    ON purchase_purchase_order_items
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE purchase_vendor_registration IS 'Vendor/Customer Registration Form (VRF)';
COMMENT ON TABLE purchase_material_indent_slip IS 'Material Indent Slip for requesting materials';
COMMENT ON TABLE purchase_material_indent_slip_items IS 'Items associated with each material indent slip';
COMMENT ON TABLE purchase_purchase_order IS 'Purchase Order (PO) form';
COMMENT ON TABLE purchase_purchase_order_items IS 'Items associated with each purchase order';

COMMENT ON COLUMN purchase_vendor_registration.customer_supplier IS 'Type: Customer or Supplier';
COMMENT ON COLUMN purchase_material_indent_slip.purchase_store_incharge IS 'Purchase/Store Incharge name';
COMMENT ON COLUMN purchase_purchase_order.gst_percentage IS 'GST percentage (default 18%)';

