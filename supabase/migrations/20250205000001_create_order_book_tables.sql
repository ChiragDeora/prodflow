-- ============================================================================
-- ORDER BOOK MODULE - Database Schema
-- Creates tables for Order Book tracking
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORDER BOOK TABLES
-- ============================================================================

-- Main order book table
CREATE TABLE IF NOT EXISTS sales_order_book (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    po_number VARCHAR(100) NOT NULL,
    order_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_address TEXT,
    customer_contact VARCHAR(100),
    customer_email VARCHAR(255),
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Progress, Completed, Cancelled
    total_amount DECIMAL(15, 2) DEFAULT 0,
    gst_percentage DECIMAL(5, 2) DEFAULT 18,
    gst_amount DECIMAL(15, 2) DEFAULT 0,
    final_amount DECIMAL(15, 2) DEFAULT 0,
    payment_terms TEXT,
    delivery_terms TEXT,
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT order_book_po_number_check CHECK (po_number <> ''),
    CONSTRAINT order_book_customer_name_check CHECK (customer_name <> ''),
    CONSTRAINT order_book_order_date_check CHECK (order_date IS NOT NULL)
);

-- Order book items table (one-to-many relationship)
CREATE TABLE IF NOT EXISTS sales_order_book_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_book_id UUID NOT NULL REFERENCES sales_order_book(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    part_code VARCHAR(255) NOT NULL,
    part_name VARCHAR(255),
    description TEXT,
    quantity DECIMAL(15, 2) NOT NULL,
    delivered_qty DECIMAL(15, 2) DEFAULT 0,
    pending_qty DECIMAL(15, 2) DEFAULT 0,
    unit VARCHAR(50),
    unit_price DECIMAL(15, 2),
    total_price DECIMAL(15, 2),
    delivery_schedule DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Production, Completed, Delivered
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT order_book_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT order_book_items_part_code_check CHECK (part_code <> ''),
    CONSTRAINT order_book_items_quantity_check CHECK (quantity > 0),
    UNIQUE(order_book_id, sr_no)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_order_book_po_number ON sales_order_book(po_number);
CREATE INDEX IF NOT EXISTS idx_order_book_customer_name ON sales_order_book(customer_name);
CREATE INDEX IF NOT EXISTS idx_order_book_order_date ON sales_order_book(order_date);
CREATE INDEX IF NOT EXISTS idx_order_book_status ON sales_order_book(status);
CREATE INDEX IF NOT EXISTS idx_order_book_items_order_book_id ON sales_order_book_items(order_book_id);
CREATE INDEX IF NOT EXISTS idx_order_book_items_part_code ON sales_order_book_items(part_code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on order book tables
ALTER TABLE sales_order_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_book_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all order books (can be customized based on requirements)
CREATE POLICY "Users can view order books" ON sales_order_book
    FOR SELECT
    USING (true);

-- Policy: Users can insert order books
CREATE POLICY "Users can insert order books" ON sales_order_book
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can update order books
CREATE POLICY "Users can update order books" ON sales_order_book
    FOR UPDATE
    USING (true);

-- Policy: Users can delete order books
CREATE POLICY "Users can delete order books" ON sales_order_book
    FOR DELETE
    USING (true);

-- Policy: Users can view all order book items
CREATE POLICY "Users can view order book items" ON sales_order_book_items
    FOR SELECT
    USING (true);

-- Policy: Users can insert order book items
CREATE POLICY "Users can insert order book items" ON sales_order_book_items
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can update order book items
CREATE POLICY "Users can update order book items" ON sales_order_book_items
    FOR UPDATE
    USING (true);

-- Policy: Users can delete order book items
CREATE POLICY "Users can delete order book items" ON sales_order_book_items
    FOR DELETE
    USING (true);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_book_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order book table
CREATE TRIGGER update_sales_order_book_updated_at
    BEFORE UPDATE ON sales_order_book
    FOR EACH ROW
    EXECUTE FUNCTION update_order_book_updated_at();

