-- Create Silo Management System tables

-- Main silo configuration table
CREATE TABLE IF NOT EXISTS silos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_number INTEGER UNIQUE NOT NULL,
    silo_name VARCHAR(50) NOT NULL, -- SILO-1, SILO-2, SILO-3
    capacity_kg DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily silo inventory tracking
CREATE TABLE IF NOT EXISTS silo_daily_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_id UUID REFERENCES silos(id) ON DELETE CASCADE,
    inventory_date DATE NOT NULL,
    
    -- HP Grade
    hp_grade_bags INTEGER DEFAULT 0,
    hp_grade_kg DECIMAL(10,2) DEFAULT 0,
    hp_grade_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- ICP Grade  
    icp_grade_bags INTEGER DEFAULT 0,
    icp_grade_kg DECIMAL(10,2) DEFAULT 0,
    icp_grade_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- CP Grade
    cp_grade_bags INTEGER DEFAULT 0,
    cp_grade_kg DECIMAL(10,2) DEFAULT 0,
    cp_grade_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- LD Grade
    ld_grade_bags INTEGER DEFAULT 0,
    ld_grade_kg DECIMAL(10,2) DEFAULT 0,
    ld_grade_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- MB (Master Batch)
    mb_bags INTEGER DEFAULT 0,
    mb_kg DECIMAL(10,2) DEFAULT 0,
    mb_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Totals
    total_bags INTEGER GENERATED ALWAYS AS (
        hp_grade_bags + icp_grade_bags + cp_grade_bags + ld_grade_bags + mb_bags
    ) STORED,
    total_kg DECIMAL(10,2) GENERATED ALWAYS AS (
        hp_grade_kg + icp_grade_kg + cp_grade_kg + ld_grade_kg + mb_kg
    ) STORED,
    
    -- Audit fields
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per silo per date
    UNIQUE(silo_id, inventory_date)
);

-- Material transactions (loading/unloading from silos)
CREATE TABLE IF NOT EXISTS silo_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_id UUID REFERENCES silos(id) ON DELETE CASCADE,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('loading', 'unloading', 'transfer')),
    
    -- Material details
    material_grade VARCHAR(20) CHECK (material_grade IN ('hp_grade', 'icp_grade', 'cp_grade', 'ld_grade', 'mb')),
    material_name VARCHAR(255), -- Specific material name/code
    supplier VARCHAR(255),
    
    -- Quantity
    bags_count INTEGER NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    
    -- Reference documents
    grn_number VARCHAR(50),
    batch_number VARCHAR(50),
    
    -- Personnel
    operator_name VARCHAR(255),
    supervisor_name VARCHAR(255),
    
    -- Notes
    remarks TEXT,
    
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Silo alerts and notifications
CREATE TABLE IF NOT EXISTS silo_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_id UUID REFERENCES silos(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) CHECK (alert_type IN ('low_stock', 'overfill', 'maintenance_due', 'contamination')),
    alert_level VARCHAR(20) CHECK (alert_level IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    threshold_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default silos
INSERT INTO silos (silo_number, silo_name, capacity_kg, status) VALUES
(1, 'SILO-1', 10000.00, 'active'),
(2, 'SILO-2', 10000.00, 'active'),
(3, 'SILO-3', 10000.00, 'active')
ON CONFLICT (silo_number) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_silo_inventory_date ON silo_daily_inventory(inventory_date);
CREATE INDEX IF NOT EXISTS idx_silo_inventory_silo_date ON silo_daily_inventory(silo_id, inventory_date);
CREATE INDEX IF NOT EXISTS idx_silo_transactions_date ON silo_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_silo_transactions_silo ON silo_transactions(silo_id);
CREATE INDEX IF NOT EXISTS idx_silo_transactions_type ON silo_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_silo_alerts_active ON silo_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_silo_alerts_silo ON silo_alerts(silo_id);

-- Function to update percentages automatically
CREATE OR REPLACE FUNCTION update_silo_percentages()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate percentages based on total weight
    IF NEW.total_kg > 0 THEN
        NEW.hp_grade_percentage := ROUND((NEW.hp_grade_kg / NEW.total_kg) * 100, 2);
        NEW.icp_grade_percentage := ROUND((NEW.icp_grade_kg / NEW.total_kg) * 100, 2);
        NEW.cp_grade_percentage := ROUND((NEW.cp_grade_kg / NEW.total_kg) * 100, 2);
        NEW.ld_grade_percentage := ROUND((NEW.ld_grade_kg / NEW.total_kg) * 100, 2);
        NEW.mb_percentage := ROUND((NEW.mb_kg / NEW.total_kg) * 100, 2);
    ELSE
        NEW.hp_grade_percentage := 0;
        NEW.icp_grade_percentage := 0;
        NEW.cp_grade_percentage := 0;
        NEW.ld_grade_percentage := 0;
        NEW.mb_percentage := 0;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic percentage calculation
CREATE TRIGGER trigger_update_silo_percentages
    BEFORE INSERT OR UPDATE ON silo_daily_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_silo_percentages();

-- Function to create alerts based on thresholds
CREATE OR REPLACE FUNCTION check_silo_thresholds()
RETURNS TRIGGER AS $$
DECLARE
    silo_capacity DECIMAL(10,2);
    silo_name VARCHAR(50);
BEGIN
    -- Get silo details
    SELECT capacity_kg, silo_name INTO silo_capacity, silo_name
    FROM silos WHERE id = NEW.silo_id;
    
    -- Check for low stock (less than 10% capacity)
    IF NEW.total_kg < (silo_capacity * 0.1) THEN
        INSERT INTO silo_alerts (silo_id, alert_type, alert_level, message, threshold_value, current_value)
        VALUES (NEW.silo_id, 'low_stock', 'warning', 
                silo_name || ' is running low on material', 
                silo_capacity * 0.1, NEW.total_kg)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Check for overfill (more than 95% capacity)
    IF NEW.total_kg > (silo_capacity * 0.95) THEN
        INSERT INTO silo_alerts (silo_id, alert_type, alert_level, message, threshold_value, current_value)
        VALUES (NEW.silo_id, 'overfill', 'critical', 
                silo_name || ' is nearly at capacity', 
                silo_capacity * 0.95, NEW.total_kg)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for threshold checking
CREATE TRIGGER trigger_check_silo_thresholds
    AFTER INSERT OR UPDATE ON silo_daily_inventory
    FOR EACH ROW
    EXECUTE FUNCTION check_silo_thresholds();

-- View for current silo status (latest inventory for each silo)
CREATE OR REPLACE VIEW current_silo_status AS
SELECT 
    s.id as silo_id,
    s.silo_number,
    s.silo_name,
    s.capacity_kg,
    s.status as silo_status,
    COALESCE(sdi.inventory_date, CURRENT_DATE) as last_updated_date,
    COALESCE(sdi.hp_grade_bags, 0) as hp_grade_bags,
    COALESCE(sdi.hp_grade_kg, 0) as hp_grade_kg,
    COALESCE(sdi.hp_grade_percentage, 0) as hp_grade_percentage,
    COALESCE(sdi.icp_grade_bags, 0) as icp_grade_bags,
    COALESCE(sdi.icp_grade_kg, 0) as icp_grade_kg,
    COALESCE(sdi.icp_grade_percentage, 0) as icp_grade_percentage,
    COALESCE(sdi.cp_grade_bags, 0) as cp_grade_bags,
    COALESCE(sdi.cp_grade_kg, 0) as cp_grade_kg,
    COALESCE(sdi.cp_grade_percentage, 0) as cp_grade_percentage,
    COALESCE(sdi.ld_grade_bags, 0) as ld_grade_bags,
    COALESCE(sdi.ld_grade_kg, 0) as ld_grade_kg,
    COALESCE(sdi.ld_grade_percentage, 0) as ld_grade_percentage,
    COALESCE(sdi.mb_bags, 0) as mb_bags,
    COALESCE(sdi.mb_kg, 0) as mb_kg,
    COALESCE(sdi.mb_percentage, 0) as mb_percentage,
    COALESCE(sdi.total_bags, 0) as total_bags,
    COALESCE(sdi.total_kg, 0) as total_kg,
    ROUND((COALESCE(sdi.total_kg, 0) / s.capacity_kg) * 100, 2) as capacity_utilization_percentage
FROM silos s
LEFT JOIN LATERAL (
    SELECT * FROM silo_daily_inventory 
    WHERE silo_id = s.id 
    ORDER BY inventory_date DESC 
    LIMIT 1
) sdi ON true
ORDER BY s.silo_number;

-- Verify tables were created
SELECT 'silos' as table_name, COUNT(*) as record_count FROM silos
UNION ALL
SELECT 'silo_daily_inventory' as table_name, COUNT(*) as record_count FROM silo_daily_inventory
UNION ALL
SELECT 'silo_transactions' as table_name, COUNT(*) as record_count FROM silo_transactions
UNION ALL
SELECT 'silo_alerts' as table_name, COUNT(*) as record_count FROM silo_alerts;
