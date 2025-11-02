-- Diagnostic script to check quantity field data types
-- This will help identify which tables have the wrong precision causing rounding issues

-- Check all BOM-related tables and their quantity field data types
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name LIKE '%bom%'
    AND c.column_name IN (
        'qty_meter', 'qty_meter_2', 
        'sfg_1_qty', 'sfg_2_qty', 
        'cnt_qty', 'poly_qty',
        'pcs', 'part_weight_gm_pcs'
    )
    AND t.table_schema = 'public'
ORDER BY t.table_name, c.column_name;

-- Check if there are any NUMERIC(10,2) fields that should be DECIMAL(10,4)
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    'NEEDS FIXING - Only 2 decimal places allowed' as issue
FROM information_schema.columns 
WHERE table_name LIKE '%bom%'
    AND data_type = 'numeric'
    AND numeric_scale = 2
    AND column_name IN (
        'qty_meter', 'qty_meter_2', 
        'sfg_1_qty', 'sfg_2_qty', 
        'cnt_qty', 'poly_qty',
        'pcs', 'part_weight_gm_pcs'
    )
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check for correct DECIMAL(10,4) fields
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    'CORRECT - 4 decimal places allowed' as status
FROM information_schema.columns 
WHERE table_name LIKE '%bom%'
    AND data_type = 'numeric'
    AND numeric_scale = 4
    AND column_name IN (
        'qty_meter', 'qty_meter_2', 
        'sfg_1_qty', 'sfg_2_qty', 
        'cnt_qty', 'poly_qty',
        'pcs', 'part_weight_gm_pcs'
    )
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check for any other problematic data types
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    'PROBLEMATIC DATA TYPE' as issue
FROM information_schema.columns 
WHERE table_name LIKE '%bom%'
    AND data_type NOT IN ('numeric', 'decimal')
    AND column_name IN (
        'qty_meter', 'qty_meter_2', 
        'sfg_1_qty', 'sfg_2_qty', 
        'cnt_qty', 'poly_qty',
        'pcs', 'part_weight_gm_pcs'
    )
    AND table_schema = 'public'
ORDER BY table_name, column_name;
