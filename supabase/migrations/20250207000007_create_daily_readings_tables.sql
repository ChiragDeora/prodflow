-- =====================================================
-- DAILY READINGS TABLES
-- =====================================================
-- This migration creates tables for daily readings:
-- 1. Daily Power Readings
-- 2. Mold Temperature Readings
-- 3. TDS Water Readings

-- =====================================================
-- 1. DAILY POWER READINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_power_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reading details
    reading_date DATE NOT NULL,
    reading_time TIME,
    power_reading_kwh DECIMAL(10, 2) NOT NULL,
    
    -- Entity references
    unit VARCHAR(50) NOT NULL DEFAULT 'Unit 1',
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    
    -- Additional information
    notes TEXT,
    photo_url TEXT, -- URL to photo stored in Google Drive (when connected)
    photo_path TEXT, -- Local path or reference to photo
    
    -- Metadata
    recorded_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_power_readings_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_power_readings_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 2. MOLD TEMPERATURE READINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS mold_temperature_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reading details
    reading_date DATE NOT NULL,
    reading_time TIME,
    temperature_celsius DECIMAL(5, 2) NOT NULL,
    
    -- Entity references
    unit VARCHAR(50) NOT NULL DEFAULT 'Unit 1',
    mold_id VARCHAR(50),
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    
    -- Additional information
    notes TEXT,
    photo_url TEXT, -- URL to photo stored in Google Drive (when connected)
    photo_path TEXT, -- Local path or reference to photo
    
    -- Metadata
    recorded_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_mold_temp_readings_mold FOREIGN KEY (mold_id) REFERENCES molds(mold_id) ON DELETE SET NULL,
    CONSTRAINT fk_mold_temp_readings_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_mold_temp_readings_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 3. TDS WATER READINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tds_water_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reading details
    reading_date DATE NOT NULL,
    reading_time TIME,
    tds_reading_ppm DECIMAL(10, 2) NOT NULL, -- Total Dissolved Solids in parts per million
    ph_level DECIMAL(4, 2), -- pH level (0-14)
    
    -- Entity references
    unit VARCHAR(50) NOT NULL DEFAULT 'Unit 1',
    location VARCHAR(100), -- e.g., 'Cooling Tower', 'Process Water', etc.
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    
    -- Additional information
    notes TEXT,
    photo_url TEXT, -- URL to photo stored in Google Drive (when connected)
    photo_path TEXT, -- Local path or reference to photo
    
    -- Metadata
    recorded_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_tds_readings_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_tds_readings_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 4. CREATE INDEXES FOR DAILY READINGS
-- =====================================================

-- Power Readings Indexes
CREATE INDEX IF NOT EXISTS idx_power_readings_date ON daily_power_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_power_readings_unit ON daily_power_readings(unit);
CREATE INDEX IF NOT EXISTS idx_power_readings_machine_id ON daily_power_readings(machine_id);
CREATE INDEX IF NOT EXISTS idx_power_readings_line_id ON daily_power_readings(line_id);
CREATE INDEX IF NOT EXISTS idx_power_readings_created_at ON daily_power_readings(created_at);

-- Mold Temperature Readings Indexes
CREATE INDEX IF NOT EXISTS idx_mold_temp_readings_date ON mold_temperature_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_mold_temp_readings_unit ON mold_temperature_readings(unit);
CREATE INDEX IF NOT EXISTS idx_mold_temp_readings_mold_id ON mold_temperature_readings(mold_id);
CREATE INDEX IF NOT EXISTS idx_mold_temp_readings_machine_id ON mold_temperature_readings(machine_id);
CREATE INDEX IF NOT EXISTS idx_mold_temp_readings_line_id ON mold_temperature_readings(line_id);
CREATE INDEX IF NOT EXISTS idx_mold_temp_readings_created_at ON mold_temperature_readings(created_at);

-- TDS Water Readings Indexes
CREATE INDEX IF NOT EXISTS idx_tds_readings_date ON tds_water_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_tds_readings_unit ON tds_water_readings(unit);
CREATE INDEX IF NOT EXISTS idx_tds_readings_machine_id ON tds_water_readings(machine_id);
CREATE INDEX IF NOT EXISTS idx_tds_readings_line_id ON tds_water_readings(line_id);
CREATE INDEX IF NOT EXISTS idx_tds_readings_created_at ON tds_water_readings(created_at);

-- =====================================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_readings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Power Readings
CREATE TRIGGER trigger_update_power_readings_updated_at
    BEFORE UPDATE ON daily_power_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_readings_updated_at();

-- Triggers for Mold Temperature Readings
CREATE TRIGGER trigger_update_mold_temp_readings_updated_at
    BEFORE UPDATE ON mold_temperature_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_readings_updated_at();

-- Triggers for TDS Water Readings
CREATE TRIGGER trigger_update_tds_readings_updated_at
    BEFORE UPDATE ON tds_water_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_readings_updated_at();

-- =====================================================
-- 6. CREATE VIEWS FOR COMBINED READINGS HISTORY
-- =====================================================

-- View for all power readings with formatted data
CREATE OR REPLACE VIEW vw_power_readings_summary AS
SELECT 
    id,
    reading_date,
    reading_time,
    power_reading_kwh,
    unit,
    machine_id,
    line_id,
    notes,
    photo_url,
    recorded_by,
    created_at,
    updated_at
FROM daily_power_readings
ORDER BY reading_date DESC, reading_time DESC;

-- View for all mold temperature readings with formatted data
CREATE OR REPLACE VIEW vw_mold_temp_readings_summary AS
SELECT 
    id,
    reading_date,
    reading_time,
    temperature_celsius,
    unit,
    mold_id,
    machine_id,
    line_id,
    notes,
    photo_url,
    recorded_by,
    created_at,
    updated_at
FROM mold_temperature_readings
ORDER BY reading_date DESC, reading_time DESC;

-- View for all TDS water readings with formatted data
CREATE OR REPLACE VIEW vw_tds_readings_summary AS
SELECT 
    id,
    reading_date,
    reading_time,
    tds_reading_ppm,
    ph_level,
    unit,
    location,
    machine_id,
    line_id,
    notes,
    photo_url,
    recorded_by,
    created_at,
    updated_at
FROM tds_water_readings
ORDER BY reading_date DESC, reading_time DESC;

-- Combined view for all daily readings (for history tab)
CREATE OR REPLACE VIEW vw_all_daily_readings AS
SELECT 
    'power' AS reading_type,
    id::text,
    reading_date,
    reading_time,
    unit,
    machine_id,
    line_id,
    notes,
    photo_url,
    recorded_by,
    created_at,
    updated_at,
    jsonb_build_object('power_reading_kwh', power_reading_kwh) AS reading_data
FROM daily_power_readings
UNION ALL
SELECT 
    'mold_temp' AS reading_type,
    id::text,
    reading_date,
    reading_time,
    unit,
    machine_id,
    line_id,
    notes,
    photo_url,
    recorded_by,
    created_at,
    updated_at,
    jsonb_build_object(
        'temperature_celsius', temperature_celsius,
        'mold_id', mold_id
    ) AS reading_data
FROM mold_temperature_readings
UNION ALL
SELECT 
    'tds_water' AS reading_type,
    id::text,
    reading_date,
    reading_time,
    unit,
    machine_id,
    line_id,
    notes,
    photo_url,
    recorded_by,
    created_at,
    updated_at,
    jsonb_build_object(
        'tds_reading_ppm', tds_reading_ppm,
        'ph_level', ph_level,
        'location', location
    ) AS reading_data
FROM tds_water_readings
ORDER BY reading_date DESC, reading_time DESC;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. All tables include photo_url and photo_path fields for future Google Drive integration
-- 2. Tables are designed without RLS (Row Level Security) as per previous maintenance table patterns
-- 3. Indexes are created for common query patterns (date, unit, machine, line)
-- 4. Views are provided for easy querying and reporting
-- 5. Foreign key constraints ensure data integrity with machines, lines, and molds tables
-- 6. The combined view (vw_all_daily_readings) can be used for the History tab

