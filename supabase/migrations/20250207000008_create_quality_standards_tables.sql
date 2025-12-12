-- =====================================================
-- QUALITY STANDARDS TABLES
-- =====================================================
-- This migration creates tables for quality standards:
-- 1. Product Weight Standards
-- 2. Packing Standards
-- 3. CBM (Cubic Meter) Standards

-- =====================================================
-- 1. PRODUCT WEIGHT STANDARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS product_weight_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product reference
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Weight specifications
    standard_weight_grams DECIMAL(10, 3) NOT NULL, -- Standard weight in grams
    tolerance_grams DECIMAL(10, 3) NOT NULL DEFAULT 0.5, -- Tolerance in ±grams
    min_weight_grams DECIMAL(10, 3), -- Minimum acceptable weight
    max_weight_grams DECIMAL(10, 3), -- Maximum acceptable weight
    
    -- Additional specifications
    unit VARCHAR(50) DEFAULT 'Unit 1',
    notes TEXT,
    
    -- Status and metadata
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Unique constraint
    CONSTRAINT uq_product_weight_standard UNIQUE (product_code, unit)
);

-- =====================================================
-- 2. PACKING STANDARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS packing_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product reference
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Packing specifications
    units_per_carton INTEGER NOT NULL, -- Number of units in one carton
    cartons_per_pallet INTEGER NOT NULL, -- Number of cartons on one pallet
    packaging_type VARCHAR(100), -- e.g., 'Corrugated Box', 'Plastic Bag', 'Shrink Wrap'
    carton_dimensions_length DECIMAL(10, 2), -- Length in cm
    carton_dimensions_width DECIMAL(10, 2), -- Width in cm
    carton_dimensions_height DECIMAL(10, 2), -- Height in cm
    carton_weight_kg DECIMAL(10, 3), -- Weight of empty carton in kg
    pallet_weight_kg DECIMAL(10, 3), -- Total pallet weight in kg
    
    -- Additional specifications
    unit VARCHAR(50) DEFAULT 'Unit 1',
    notes TEXT,
    
    -- Status and metadata
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Unique constraint
    CONSTRAINT uq_packing_standard UNIQUE (product_code, unit)
);

-- =====================================================
-- 3. CBM (CUBIC METER) STANDARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS cbm_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product reference
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- CBM specifications
    cbm_per_unit DECIMAL(10, 6) NOT NULL, -- Cubic meters per single unit
    cbm_per_carton DECIMAL(10, 6) NOT NULL, -- Cubic meters per carton
    units_per_carton INTEGER NOT NULL, -- Number of units in one carton
    cbm_per_pallet DECIMAL(10, 6), -- Cubic meters per pallet
    pallets_per_container DECIMAL(10, 2), -- Number of pallets that fit in a standard container
    
    -- Dimensions (for calculation verification)
    unit_length_cm DECIMAL(10, 2),
    unit_width_cm DECIMAL(10, 2),
    unit_height_cm DECIMAL(10, 2),
    carton_length_cm DECIMAL(10, 2),
    carton_width_cm DECIMAL(10, 2),
    carton_height_cm DECIMAL(10, 2),
    
    -- Additional specifications
    unit VARCHAR(50) DEFAULT 'Unit 1',
    notes TEXT,
    
    -- Status and metadata
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Unique constraint
    CONSTRAINT uq_cbm_standard UNIQUE (product_code, unit)
);

-- =====================================================
-- 4. CREATE INDEXES FOR QUALITY STANDARDS
-- =====================================================

-- Product Weight Standards Indexes
CREATE INDEX IF NOT EXISTS idx_product_weight_standards_product_code ON product_weight_standards(product_code);
CREATE INDEX IF NOT EXISTS idx_product_weight_standards_unit ON product_weight_standards(unit);
CREATE INDEX IF NOT EXISTS idx_product_weight_standards_status ON product_weight_standards(status);
CREATE INDEX IF NOT EXISTS idx_product_weight_standards_created_at ON product_weight_standards(created_at);

-- Packing Standards Indexes
CREATE INDEX IF NOT EXISTS idx_packing_standards_product_code ON packing_standards(product_code);
CREATE INDEX IF NOT EXISTS idx_packing_standards_unit ON packing_standards(unit);
CREATE INDEX IF NOT EXISTS idx_packing_standards_status ON packing_standards(status);
CREATE INDEX IF NOT EXISTS idx_packing_standards_created_at ON packing_standards(created_at);

-- CBM Standards Indexes
CREATE INDEX IF NOT EXISTS idx_cbm_standards_product_code ON cbm_standards(product_code);
CREATE INDEX IF NOT EXISTS idx_cbm_standards_unit ON cbm_standards(unit);
CREATE INDEX IF NOT EXISTS idx_cbm_standards_status ON cbm_standards(status);
CREATE INDEX IF NOT EXISTS idx_cbm_standards_created_at ON cbm_standards(created_at);

-- =====================================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quality_standards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Product Weight Standards
CREATE TRIGGER trigger_update_product_weight_standards_updated_at
    BEFORE UPDATE ON product_weight_standards
    FOR EACH ROW
    EXECUTE FUNCTION update_quality_standards_updated_at();

-- Triggers for Packing Standards
CREATE TRIGGER trigger_update_packing_standards_updated_at
    BEFORE UPDATE ON packing_standards
    FOR EACH ROW
    EXECUTE FUNCTION update_quality_standards_updated_at();

-- Triggers for CBM Standards
CREATE TRIGGER trigger_update_cbm_standards_updated_at
    BEFORE UPDATE ON cbm_standards
    FOR EACH ROW
    EXECUTE FUNCTION update_quality_standards_updated_at();

-- =====================================================
-- 6. CREATE VIEWS FOR COMBINED STANDARDS
-- =====================================================

-- View for all quality standards summary
CREATE OR REPLACE VIEW vw_quality_standards_summary AS
SELECT 
    'weight' AS standard_type,
    product_code,
    product_name,
    unit,
    status,
    created_at,
    updated_at,
    jsonb_build_object(
        'standard_weight_grams', standard_weight_grams,
        'tolerance_grams', tolerance_grams,
        'min_weight_grams', min_weight_grams,
        'max_weight_grams', max_weight_grams
    ) AS standard_data
FROM product_weight_standards
UNION ALL
SELECT 
    'packing' AS standard_type,
    product_code,
    product_name,
    unit,
    status,
    created_at,
    updated_at,
    jsonb_build_object(
        'units_per_carton', units_per_carton,
        'cartons_per_pallet', cartons_per_pallet,
        'packaging_type', packaging_type,
        'carton_dimensions', jsonb_build_object(
            'length', carton_dimensions_length,
            'width', carton_dimensions_width,
            'height', carton_dimensions_height
        )
    ) AS standard_data
FROM packing_standards
UNION ALL
SELECT 
    'cbm' AS standard_type,
    product_code,
    product_name,
    unit,
    status,
    created_at,
    updated_at,
    jsonb_build_object(
        'cbm_per_unit', cbm_per_unit,
        'cbm_per_carton', cbm_per_carton,
        'units_per_carton', units_per_carton,
        'cbm_per_pallet', cbm_per_pallet,
        'pallets_per_container', pallets_per_container
    ) AS standard_data
FROM cbm_standards
ORDER BY product_code, standard_type;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. All tables include unit field for multi-unit support
-- 2. Tables are designed without RLS (Row Level Security) as per previous patterns
-- 3. Indexes are created for common query patterns (product_code, unit, status)
-- 4. Views are provided for easy querying and reporting
-- 5. Unique constraints ensure one standard per product per unit
-- 6. Status field allows for active/inactive/archived states

