-- Create packing_materials table based on the Excel structure
CREATE TABLE IF NOT EXISTS packing_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL, -- Boxes, PolyBags, Bopp
    type VARCHAR(100) NOT NULL, -- Export, Local, etc.
    item_code VARCHAR(100) NOT NULL, -- CTN-Ro16, etc.
    pack_size VARCHAR(50), -- 150, 800, etc.
    dimensions VARCHAR(200), -- LxBxH format
    technical_detail TEXT, -- Technical specifications
    brand VARCHAR(100), -- Regular, Gesa, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packing_materials_category ON packing_materials(category);
CREATE INDEX IF NOT EXISTS idx_packing_materials_type ON packing_materials(type);
CREATE INDEX IF NOT EXISTS idx_packing_materials_item_code ON packing_materials(item_code);
CREATE INDEX IF NOT EXISTS idx_packing_materials_brand ON packing_materials(brand);

-- Enable RLS
ALTER TABLE packing_materials ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON packing_materials
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_packing_materials_updated_at BEFORE UPDATE ON packing_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data based on the Excel structure
INSERT INTO packing_materials (category, type, item_code, pack_size, dimensions, technical_detail, brand) VALUES
('Boxes', 'Export', 'CTN-Ro16', '150', '', '', 'Regular'),
('Boxes', 'Local', 'CTN-Ro16', '800', '', '', 'Gesa'); 