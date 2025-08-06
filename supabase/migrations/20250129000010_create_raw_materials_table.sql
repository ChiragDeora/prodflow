-- Create raw_materials table based on the Excel structure with TDS image support
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sl_no INTEGER NOT NULL, -- Serial number
    category VARCHAR(50) NOT NULL, -- PP, PE, etc.
    type VARCHAR(100) NOT NULL, -- HP, ICP, RCP, LDPE, MB, etc.
    grade VARCHAR(100) NOT NULL, -- HJ333MO, 1750 MN, etc.
    supplier VARCHAR(100) NOT NULL, -- Borouge, IOCL, Basell, etc.
    mfi DECIMAL(10,2), -- Melt Flow Index
    density DECIMAL(10,3), -- Density in g/cm³
    tds_image TEXT, -- Base64 encoded TDS image or URL
    remark TEXT, -- Additional remarks
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_type ON raw_materials(type);
CREATE INDEX IF NOT EXISTS idx_raw_materials_supplier ON raw_materials(supplier);
CREATE INDEX IF NOT EXISTS idx_raw_materials_grade ON raw_materials(grade);

-- Enable RLS
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON raw_materials
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON raw_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data based on the Excel structure
INSERT INTO raw_materials (sl_no, category, type, grade, supplier, mfi, density, remark) VALUES
(1, 'PP', 'HP', 'HJ333MO', 'Borouge', 75, 910, ''),
(2, 'PP', 'HP', '1750 MN', 'IOCL', 75, NULL, ''),
(3, 'PP', 'HP', 'HJ 311 MO', 'Borouge', 60, 900, ''),
(4, 'PP', 'HP', 'P1600MH', 'IOCL', 60, NULL, ''),
(5, 'PP', 'HP', 'HP 3442', 'Basell', 60, 900, ''),
(6, 'PP', 'HP', 'P902J', 'SCG', 60, 910, ''),
(7, 'PP', 'HP', 'HP 544T', 'Basell', 60, 900, ''),
(9, 'PP', 'ICP', 'BJ 368 MO', 'Borouge', 70, 903, ''),
(10, 'PP', 'ICP', '3650 MN', 'IOCL', 65, 900, ''),
(11, 'PP', 'ICP', 'FPC 75', 'Sabic', 75, NULL, ''),
(12, 'PP', 'ICP', 'PP7555KN', 'ExxonMobil', NULL, NULL, ''),
(13, 'PP', 'RCP', 'RJ 768 MO', 'Borouge', 70, 900, ''),
(14, 'PP', 'RCP', 'PP 2300 MC', 'IOCL', 30, NULL, ''),
(15, 'PP', 'RCP', 'RH 668 MO', 'Borouge', NULL, NULL, 'Clarifier'),
(16, 'PP', 'LDPE', '', '', NULL, NULL, ''),
(17, 'PP', '', 'For Amul', '', NULL, NULL, ''),
(18, 'PP', 'MB', 'Black', '', NULL, NULL, ''),
(19, 'PP', 'MB', 'White', '', NULL, NULL, ''),
(20, 'PP', 'MB', 'Peach', '', NULL, NULL, ''),
(21, 'PP', 'MB', 'Golden', '', NULL, NULL, ''); 