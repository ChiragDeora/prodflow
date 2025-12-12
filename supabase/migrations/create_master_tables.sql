-- Create Customer Master table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    customer_type VARCHAR(20) DEFAULT 'domestic' CHECK (customer_type IN ('domestic', 'export')),
    payment_terms TEXT,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Vendor Master table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendor_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    vendor_type VARCHAR(20) DEFAULT 'material' CHECK (vendor_type IN ('material', 'service', 'both')),
    payment_terms TEXT,
    credit_period INTEGER DEFAULT 0,
    bank_name VARCHAR(255),
    bank_account VARCHAR(50),
    ifsc_code VARCHAR(11),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create VRF Forms table matching the exact structure from store module (purchase_vendor_registration)
CREATE TABLE IF NOT EXISTS purchase_vendor_registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_no VARCHAR(20),
    email_id VARCHAR(255),
    gst_no VARCHAR(15),
    pan_no VARCHAR(10),
    customer_supplier VARCHAR(20) CHECK (customer_supplier IN ('Customer', 'Supplier')),
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_master_name ON customer_master(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_master_code ON customer_master(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_master_status ON customer_master(status);

CREATE INDEX IF NOT EXISTS idx_vendor_master_name ON vendor_master(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_master_code ON vendor_master(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendor_master_status ON vendor_master(status);

CREATE INDEX IF NOT EXISTS idx_purchase_vendor_registration_name ON purchase_vendor_registration(customer_name);
CREATE INDEX IF NOT EXISTS idx_purchase_vendor_registration_type ON purchase_vendor_registration(customer_supplier);

-- No sample data inserted - tables created empty

-- Verify tables were created
SELECT 'customer_master' as table_name, COUNT(*) as record_count FROM customer_master
UNION ALL
SELECT 'vendor_master' as table_name, COUNT(*) as record_count FROM vendor_master
UNION ALL
SELECT 'purchase_vendor_registration' as table_name, COUNT(*) as record_count FROM purchase_vendor_registration;
