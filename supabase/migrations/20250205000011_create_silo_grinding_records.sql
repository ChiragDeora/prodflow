-- Create Silo Grinding Records table
-- This table tracks grinding operations for materials in silos

CREATE TABLE IF NOT EXISTS silo_grinding_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_date DATE NOT NULL,
    silo_id UUID REFERENCES silos(id) ON DELETE CASCADE,
    
    -- Material details
    material_grade VARCHAR(20) CHECK (material_grade IN ('hp_grade', 'icp_grade', 'cp_grade', 'ld_grade', 'mb')),
    material_name VARCHAR(255) NOT NULL,
    
    -- Weight measurements
    input_weight_kg DECIMAL(10,2) NOT NULL,
    output_weight_kg DECIMAL(10,2) NOT NULL,
    waste_weight_kg DECIMAL(10,2) DEFAULT 0,
    efficiency_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Personnel
    operator_name VARCHAR(255),
    supervisor_name VARCHAR(255),
    
    -- Notes
    remarks TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grinding_records_date ON silo_grinding_records(record_date);
CREATE INDEX IF NOT EXISTS idx_grinding_records_silo ON silo_grinding_records(silo_id);
CREATE INDEX IF NOT EXISTS idx_grinding_records_silo_date ON silo_grinding_records(silo_id, record_date);
CREATE INDEX IF NOT EXISTS idx_grinding_records_material ON silo_grinding_records(material_grade);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_grinding_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_silo_grinding_records_updated_at
    BEFORE UPDATE ON silo_grinding_records
    FOR EACH ROW
    EXECUTE FUNCTION update_grinding_records_updated_at();

-- Enable RLS
ALTER TABLE silo_grinding_records ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON silo_grinding_records
    FOR ALL USING (auth.role() = 'authenticated');

