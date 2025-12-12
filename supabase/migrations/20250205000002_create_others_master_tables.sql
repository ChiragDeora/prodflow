-- ============================================================================
-- CREATE OTHERS MASTER TABLES
-- Creates tables for Color/Label Master and Party Name Master
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- COLOR/LABEL MASTER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS color_label_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE, -- Color or label name (e.g., "Black", "White", "Peach")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_color_label_master_name ON color_label_master(name);

-- Enable RLS
ALTER TABLE color_label_master ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON color_label_master
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_color_label_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_color_label_master_updated_at BEFORE UPDATE ON color_label_master
    FOR EACH ROW EXECUTE FUNCTION update_color_label_master_updated_at();

-- ============================================================================
-- PARTY NAME MASTER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS party_name_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE, -- Party name
    code VARCHAR(100), -- Optional party code
    address TEXT, -- Optional address
    contact_person VARCHAR(200), -- Optional contact person
    phone VARCHAR(50), -- Optional phone number
    email VARCHAR(255), -- Optional email
    gstin VARCHAR(50), -- Optional GSTIN
    description TEXT, -- Optional description
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_party_name_master_name ON party_name_master(name);
CREATE INDEX IF NOT EXISTS idx_party_name_master_code ON party_name_master(code);

-- Enable RLS
ALTER TABLE party_name_master ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON party_name_master
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_party_name_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_party_name_master_updated_at BEFORE UPDATE ON party_name_master
    FOR EACH ROW EXECUTE FUNCTION update_party_name_master_updated_at();

