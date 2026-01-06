-- ============================================================================
-- SEED STOCK ITEMS FROM EXISTING DATA
-- ============================================================================
-- This migration populates stock_items from:
-- 1. sfg_bom table → SFG items
-- 2. raw_materials table → RM items  
-- 3. packing_materials table → PM items
-- ============================================================================

-- ============================================================================
-- SECTION 1: INSERT SFG ITEMS FROM sfg_bom TABLE
-- ============================================================================

INSERT INTO stock_items (item_code, item_name, item_type, category, unit_of_measure)
SELECT DISTINCT
    sfg_code AS item_code,
    item_name AS item_name,
    'SFG' AS item_type,
    'SFG' AS category,
    'NOS' AS unit_of_measure
FROM sfg_bom
WHERE sfg_code IS NOT NULL AND sfg_code != ''
ON CONFLICT (item_code) DO UPDATE SET
    item_name = EXCLUDED.item_name,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: INSERT RM ITEMS FROM raw_materials TABLE
-- ============================================================================
-- Format item_code as: PP-HP-HJ333MO (category-type-grade)

INSERT INTO stock_items (item_code, item_name, item_type, category, sub_category, unit_of_measure)
SELECT DISTINCT
    CONCAT(category, '-', type, '-', grade) AS item_code,
    CONCAT(category, ' ', type, ' ', grade, ' (', supplier, ')') AS item_name,
    'RM' AS item_type,
    category AS category,
    type AS sub_category,
    'KG' AS unit_of_measure
FROM raw_materials
WHERE grade IS NOT NULL AND grade != ''
ON CONFLICT (item_code) DO UPDATE SET
    item_name = EXCLUDED.item_name,
    sub_category = EXCLUDED.sub_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 3: INSERT STANDARD RM TYPES FOR DPR POSTING
-- ============================================================================
-- These are the RM types used in post-dpr.ts RM_TYPE_MAPPING

INSERT INTO stock_items (item_code, item_name, item_type, category, sub_category, unit_of_measure)
VALUES
    ('RM-HP', 'Raw Material - HP (Homo Polymer)', 'RM', 'PP', 'HP', 'KG'),
    ('RM-ICP', 'Raw Material - ICP (Impact Copolymer)', 'RM', 'PP', 'ICP', 'KG'),
    ('RM-RCP', 'Raw Material - RCP (Random Copolymer)', 'RM', 'PP', 'RCP', 'KG'),
    ('RM-LDPE', 'Raw Material - LDPE', 'RM', 'PE', 'LDPE', 'KG'),
    ('RM-GPPS', 'Raw Material - GPPS', 'RM', 'PS', 'GPPS', 'KG'),
    ('RM-MB', 'Raw Material - Masterbatch', 'RM', 'MB', 'MB', 'KG'),
    ('REGRIND', 'Regrind Material', 'RM', 'REGRIND', NULL, 'KG')
ON CONFLICT (item_code) DO NOTHING;

-- ============================================================================
-- SECTION 4: INSERT PM ITEMS FROM packing_materials TABLE (IF EXISTS)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'packing_materials') THEN
        INSERT INTO stock_items (item_code, item_name, item_type, category, unit_of_measure)
        SELECT DISTINCT
            COALESCE(item_code, CONCAT('PM-', id)) AS item_code,
            item_name AS item_name,
            'PM' AS item_type,
            COALESCE(category, 'PACKING') AS category,
            COALESCE(unit, 'NOS') AS unit_of_measure
        FROM packing_materials
        WHERE item_name IS NOT NULL
        ON CONFLICT (item_code) DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: VERIFY DATA WAS INSERTED
-- ============================================================================

DO $$
DECLARE
    sfg_count INTEGER;
    rm_count INTEGER;
    pm_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sfg_count FROM stock_items WHERE item_type = 'SFG';
    SELECT COUNT(*) INTO rm_count FROM stock_items WHERE item_type = 'RM';
    SELECT COUNT(*) INTO pm_count FROM stock_items WHERE item_type = 'PM';
    SELECT COUNT(*) INTO total_count FROM stock_items;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'STOCK ITEMS SEEDED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SFG Items: %', sfg_count;
    RAISE NOTICE 'RM Items: %', rm_count;
    RAISE NOTICE 'PM Items: %', pm_count;
    RAISE NOTICE 'Total Items: %', total_count;
    RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- SAMPLE QUERY TO VERIFY
-- ============================================================================
-- SELECT item_type, COUNT(*) as count FROM stock_items GROUP BY item_type;
-- SELECT * FROM stock_items ORDER BY item_type, item_code LIMIT 20;


