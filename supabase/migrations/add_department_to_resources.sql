-- ============================================================================
-- ADD DEPARTMENT COLUMN TO auth_resources TABLE
-- This is the BEST solution - makes department extraction reliable and dynamic
-- ============================================================================

-- Add department column to auth_resources table
ALTER TABLE auth_resources ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Update existing resources with department based on table_name or ID pattern
-- Note: Sub-departments (Purchase, Inward, Outward, Sales) are extracted dynamically from table_name/ID
UPDATE auth_resources 
SET department = CASE
    -- Extract from table_name prefix (primary method)
    -- Store department includes: Purchase, Inward, Outward, Sales sub-departments
    WHEN table_name LIKE 'store_%' OR table_name LIKE 'purchase_%' OR table_name LIKE 'dispatch_%' THEN 'Store'
    WHEN table_name LIKE 'production_%' OR table_name LIKE 'schedule_%' OR table_name LIKE 'daily_%' OR table_name LIKE 'first_%' THEN 'Production'
    WHEN table_name LIKE 'maintenance_%' THEN 'Maintenance'
    WHEN table_name LIKE 'planning_%' OR table_name LIKE 'line_%' THEN 'Planning'
    WHEN table_name LIKE 'quality_%' OR table_name LIKE 'incoming_%' OR table_name LIKE 'container_%' OR table_name LIKE 'corrective_%' OR table_name LIKE 'rnd_%' THEN 'Quality'
    WHEN table_name IN ('machines', 'molds', 'lines', 'raw_materials', 'packing_materials', 'color_label_master', 'party_name_master', 'customer_master', 'vendor_master') THEN 'Master Data'
    -- Extract from ID pattern
    WHEN id::text LIKE 'store-%' OR id::text LIKE 'purchase-%' OR id::text LIKE 'dispatch-%' THEN 'Store'
    WHEN id::text LIKE 'production-%' THEN 'Production'
    WHEN id::text LIKE 'maintenance-%' THEN 'Maintenance'
    WHEN id::text LIKE 'planning-%' THEN 'Planning'
    WHEN id::text LIKE 'master-%' THEN 'Master Data'
    WHEN id::text LIKE 'quality-%' THEN 'Quality'
    -- Extract from name pattern "Department - Sub-Dept - Resource" or "Department - Resource"
    WHEN name LIKE 'Store%' OR name LIKE 'Store & Dispatch%' THEN 'Store'
    WHEN name LIKE 'Purchase%' AND name NOT LIKE 'Store%' THEN 'Purchase'
    WHEN name LIKE 'Dispatch%' AND name NOT LIKE 'Store%' THEN 'Store'
    WHEN name LIKE 'Production%' THEN 'Production'
    WHEN name LIKE 'Maintenance%' THEN 'Maintenance'
    WHEN name LIKE 'Planning%' THEN 'Planning'
    WHEN name LIKE 'Master Data%' OR name LIKE 'Master%' THEN 'Master Data'
    WHEN name LIKE 'Quality%' THEN 'Quality'
    WHEN name LIKE 'Approval%' THEN 'Approvals'
    WHEN name LIKE 'Report%' THEN 'Reports'
    ELSE 'Other'
END
WHERE department IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_auth_resources_department ON auth_resources(department);

-- Add comment
COMMENT ON COLUMN auth_resources.department IS 'Department/Module this resource belongs to. Used for organizing permissions in the matrix view.';

