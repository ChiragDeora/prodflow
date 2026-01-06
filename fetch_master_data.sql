-- Fetch all master data for stock testing

-- 1. SFG BOM (Semi-Finished Goods)
SELECT '=== SFG BOM ===' as section;
SELECT sfg_code, item_name, hp_percentage, icp_percentage, rcp_percentage 
FROM sfg_bom 
ORDER BY sfg_code 
LIMIT 20;

-- 2. Raw Materials
SELECT '=== RAW MATERIALS ===' as section;
SELECT CONCAT(category, '-', type, '-', grade) as item_code, 
       CONCAT(category, ' ', type, ' ', grade) as item_name,
       supplier
FROM raw_materials 
ORDER BY category, type 
LIMIT 20;

-- 3. Packing Materials
SELECT '=== PACKING MATERIALS ===' as section;
SELECT * FROM packing_materials LIMIT 20;

-- 4. Existing Stock Items
SELECT '=== EXISTING STOCK ITEMS ===' as section;
SELECT item_code, item_name, item_type, unit_of_measure 
FROM stock_items 
WHERE is_active = true 
ORDER BY item_type, item_code 
LIMIT 20;
