-- ============================================================================
-- ADD LINKING FIELDS AND NEW TABLES FOR STORE MODULE
-- ============================================================================

-- Add fields to GRN table for Material Indent linking and GRN type
ALTER TABLE store_grn 
ADD COLUMN IF NOT EXISTS indent_slip_id UUID REFERENCES purchase_material_indent_slip(id),
ADD COLUMN IF NOT EXISTS grn_type VARCHAR(20) CHECK (grn_type IN ('NORMAL', 'JW_ANNEXURE')) DEFAULT 'NORMAL';

-- Add fields to Purchase Order for Material Indent linking and PO type
ALTER TABLE purchase_purchase_order 
ADD COLUMN IF NOT EXISTS indent_slip_id UUID REFERENCES purchase_material_indent_slip(id),
ADD COLUMN IF NOT EXISTS po_type VARCHAR(20) CHECK (po_type IN ('CAPITAL', 'OPERATIONAL')) DEFAULT 'OPERATIONAL';

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_grn_indent_slip_id ON store_grn(indent_slip_id);
CREATE INDEX IF NOT EXISTS idx_grn_grn_type ON store_grn(grn_type);
CREATE INDEX IF NOT EXISTS idx_po_indent_slip_id ON purchase_purchase_order(indent_slip_id);
CREATE INDEX IF NOT EXISTS idx_po_po_type ON purchase_purchase_order(po_type);

-- ============================================================================
-- JOB WORK CHALLAN TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_job_work_challan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_no VARCHAR(100) UNIQUE NOT NULL,
    sr_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    jobwork_annexure_no VARCHAR(100),
    jobwork_annexure_date DATE,
    party_name VARCHAR(255) NOT NULL,
    party_address TEXT,
    gst_no VARCHAR(50),
    vehicle_no VARCHAR(100),
    lr_no VARCHAR(100),
    challan_no VARCHAR(100),
    challan_date DATE,
    total_qty DECIMAL(15, 2) DEFAULT 0,
    prepared_by VARCHAR(255),
    checked_by VARCHAR(255),
    authorized_signatory VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT job_work_challan_date_check CHECK (date IS NOT NULL),
    CONSTRAINT job_work_challan_party_check CHECK (party_name <> '')
);

CREATE TABLE IF NOT EXISTS store_job_work_challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES store_job_work_challan(id) ON DELETE CASCADE,
    sr_no INTEGER NOT NULL,
    material_description TEXT NOT NULL,
    qty DECIMAL(15, 2),
    uom VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT job_work_challan_items_sr_no_check CHECK (sr_no > 0),
    CONSTRAINT job_work_challan_items_description_check CHECK (material_description <> ''),
    UNIQUE(challan_id, sr_no)
);

-- Indexes for Job Work Challan
CREATE INDEX IF NOT EXISTS idx_job_work_challan_date ON store_job_work_challan(date);
CREATE INDEX IF NOT EXISTS idx_job_work_challan_doc_no ON store_job_work_challan(doc_no);
CREATE INDEX IF NOT EXISTS idx_job_work_challan_party_name ON store_job_work_challan(party_name);
CREATE INDEX IF NOT EXISTS idx_job_work_challan_items_challan_id ON store_job_work_challan_items(challan_id);

-- Trigger for updated_at
CREATE TRIGGER update_job_work_challan_updated_at
    BEFORE UPDATE ON store_job_work_challan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS for Job Work Challan
ALTER TABLE store_job_work_challan ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_job_work_challan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on store_job_work_challan"
    ON store_job_work_challan
    FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users on store_job_work_challan_items"
    ON store_job_work_challan_items
    FOR ALL
    USING (auth.role() = 'authenticated');

COMMENT ON TABLE store_job_work_challan IS 'Job Work Challan for sending materials for job work (GST compliant)';
COMMENT ON TABLE store_job_work_challan_items IS 'Items associated with each Job Work Challan';

-- MATERIAL INDENT STATUS AND QUANTITY TRACKING
-- Add status and received quantity tracking to Material Indent
ALTER TABLE purchase_material_indent_slip 
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED_PERFECT', 'CLOSED_OVER_RECEIVED', 'MANUALLY_CLOSED'));

-- Add received quantity tracking to Material Indent Items
ALTER TABLE purchase_material_indent_slip_items
ADD COLUMN IF NOT EXISTS received_qty DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_qty DECIMAL(15,2) GENERATED ALWAYS AS (qty - received_qty) STORED;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_indent_status ON purchase_material_indent_slip(status);
CREATE INDEX IF NOT EXISTS idx_material_indent_items_pending ON purchase_material_indent_slip_items(pending_qty);

-- Function to update Material Indent status based on pending quantities
CREATE OR REPLACE FUNCTION update_material_indent_status()
RETURNS TRIGGER AS $$
DECLARE
    indent_id UUID;
    total_pending DECIMAL(15,2);
    has_over_received BOOLEAN;
BEGIN
    -- Get the indent_id from the updated item
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
        indent_id := NEW.indent_slip_id;
    ELSE
        indent_id := OLD.indent_slip_id;
    END IF;

    -- Calculate total pending quantity for this indent
    SELECT 
        SUM(pending_qty),
        BOOL_OR(pending_qty < 0)
    INTO total_pending, has_over_received
    FROM purchase_material_indent_slip_items 
    WHERE indent_slip_id = indent_id;

    -- Update status based on pending quantities
    IF total_pending = 0 THEN
        UPDATE purchase_material_indent_slip 
        SET status = 'CLOSED_PERFECT' 
        WHERE id = indent_id AND status != 'MANUALLY_CLOSED';
    ELSIF has_over_received THEN
        UPDATE purchase_material_indent_slip 
        SET status = 'CLOSED_OVER_RECEIVED' 
        WHERE id = indent_id AND status != 'MANUALLY_CLOSED';
    ELSE
        UPDATE purchase_material_indent_slip 
        SET status = 'OPEN' 
        WHERE id = indent_id AND status != 'MANUALLY_CLOSED';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update Material Indent status
CREATE TRIGGER trigger_update_material_indent_status
    AFTER INSERT OR UPDATE OR DELETE ON purchase_material_indent_slip_items
    FOR EACH ROW
    EXECUTE FUNCTION update_material_indent_status();

-- Function to update received quantities when GRN is created
CREATE OR REPLACE FUNCTION update_received_quantities_from_grn()
RETURNS TRIGGER AS $$
BEGIN
    -- Update received quantities in Material Indent Items when GRN items are created/updated
    IF NEW.indent_slip_id IS NOT NULL THEN
        -- This is a simplified approach - in practice, you'd need to match items by description/specification
        -- For now, we'll update based on the order of items (this should be enhanced with proper item matching)
        UPDATE purchase_material_indent_slip_items 
        SET received_qty = received_qty + NEW.received_qty
        WHERE indent_slip_id = NEW.indent_slip_id
        AND id = (
            SELECT id FROM purchase_material_indent_slip_items 
            WHERE indent_slip_id = NEW.indent_slip_id 
            ORDER BY created_at 
            LIMIT 1 OFFSET (NEW.sr_no - 1)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would be applied to GRN items table when it's properly structured
-- For now, this is the framework for the functionality

COMMENT ON FUNCTION update_material_indent_status() IS 'Automatically updates Material Indent status based on pending quantities';
COMMENT ON FUNCTION update_received_quantities_from_grn() IS 'Updates received quantities in Material Indent when GRN is created';
