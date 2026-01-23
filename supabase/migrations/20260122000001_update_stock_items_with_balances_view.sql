-- ============================================================================
-- Update stock_items_with_balances view to include last_movement_at and FG-specific columns
-- ============================================================================

CREATE OR REPLACE VIEW stock_items_with_balances AS
SELECT 
    si.id,
    si.item_code,
    si.item_name,
    si.item_type,
    si.category,
    si.sub_category,
    si.unit_of_measure,
    -- RM-specific: Get supplier from raw_materials (extract grade from item_code)
    -- For item_code like "PP-HP-HJ333MO", extract category, type, and grade
    CASE 
        WHEN si.item_type = 'RM' AND si.item_code LIKE '%-%-%' THEN
            (SELECT rm.supplier 
             FROM raw_materials rm 
             WHERE rm.category = SPLIT_PART(si.item_code, '-', 1)
             AND rm.type = SPLIT_PART(si.item_code, '-', 2)
             AND rm.grade = ARRAY_TO_STRING((string_to_array(si.item_code, '-'))[3:], '-')
             LIMIT 1)
        ELSE NULL
    END AS rm_supplier,
    COALESCE(sb_store.current_balance, 0) AS store_balance,
    COALESCE(sb_prod.current_balance, 0) AS production_balance,
    COALESCE(sb_fg.current_balance, 0) AS fg_store_balance,
    COALESCE(sb_store.current_balance, 0) + 
    COALESCE(sb_prod.current_balance, 0) + 
    COALESCE(sb_fg.current_balance, 0) AS total_balance,
    -- Get last movement timestamp from stock_ledger for each location
    (SELECT MAX(transaction_timestamp) 
     FROM stock_ledger sl 
     WHERE sl.item_code = si.item_code 
     AND sl.location_code = 'STORE') AS store_last_movement_at,
    (SELECT MAX(transaction_timestamp) 
     FROM stock_ledger sl 
     WHERE sl.item_code = si.item_code 
     AND sl.location_code = 'PRODUCTION') AS production_last_movement_at,
    (SELECT MAX(transaction_timestamp) 
     FROM stock_ledger sl 
     WHERE sl.item_code = si.item_code 
     AND sl.location_code = 'FG_STORE') AS fg_store_last_movement_at,
    -- FG-specific columns (only populated for FG items)
    -- Extract FG code and color from item_code (format: fg_code-color)
    CASE 
        WHEN si.item_type = 'FG' AND si.item_code LIKE '%-%' THEN
            LEFT(si.item_code, LENGTH(si.item_code) - POSITION('-' IN REVERSE(si.item_code)))
        ELSE NULL
    END AS fg_code,
    CASE 
        WHEN si.item_type = 'FG' AND si.item_code LIKE '%-%' THEN
            RIGHT(si.item_code, POSITION('-' IN REVERSE(si.item_code)) - 1)
        ELSE NULL
    END AS fg_color,
    -- Get party from fg_bom or local_bom
    COALESCE(fg_bom.party_name, local_bom.party_name) AS fg_party,
    -- Get pack_size from BOM
    COALESCE(fg_bom.pack_size, local_bom.pack_size) AS fg_pack_size,
    -- Calculate boxes for each location (balance / pack_size)
    CASE 
        WHEN si.item_type = 'FG' AND COALESCE(fg_bom.pack_size, local_bom.pack_size) IS NOT NULL 
             AND COALESCE(fg_bom.pack_size, local_bom.pack_size)::numeric > 0 THEN
            ROUND(COALESCE(sb_store.current_balance, 0) / NULLIF(CAST(COALESCE(fg_bom.pack_size, local_bom.pack_size) AS NUMERIC), 0), 2)
        ELSE NULL
    END AS store_boxes,
    CASE 
        WHEN si.item_type = 'FG' AND COALESCE(fg_bom.pack_size, local_bom.pack_size) IS NOT NULL 
             AND COALESCE(fg_bom.pack_size, local_bom.pack_size)::numeric > 0 THEN
            ROUND(COALESCE(sb_prod.current_balance, 0) / NULLIF(CAST(COALESCE(fg_bom.pack_size, local_bom.pack_size) AS NUMERIC), 0), 2)
        ELSE NULL
    END AS production_boxes,
    CASE 
        WHEN si.item_type = 'FG' AND COALESCE(fg_bom.pack_size, local_bom.pack_size) IS NOT NULL 
             AND COALESCE(fg_bom.pack_size, local_bom.pack_size)::numeric > 0 THEN
            ROUND(COALESCE(sb_fg.current_balance, 0) / NULLIF(CAST(COALESCE(fg_bom.pack_size, local_bom.pack_size) AS NUMERIC), 0), 2)
        ELSE NULL
    END AS fg_store_boxes,
    -- Total Qty (pcs) is the current_balance for FG items
    COALESCE(sb_store.current_balance, 0) AS store_total_qty_pcs,
    COALESCE(sb_prod.current_balance, 0) AS production_total_qty_pcs,
    COALESCE(sb_fg.current_balance, 0) AS fg_store_total_qty_pcs,
    -- Total Qty (ton) - will be calculated from SFG int_wt if needed (can be added later)
    NULL::NUMERIC AS store_total_qty_ton,
    NULL::NUMERIC AS production_total_qty_ton,
    NULL::NUMERIC AS fg_store_total_qty_ton,
    -- QC - would need to be stored in stock_ledger remarks or a separate table
    NULL::BOOLEAN AS qc_check,
    -- SFG-specific columns (only populated for SFG items)
    -- SFG code is the item_code itself
    CASE WHEN si.item_type = 'SFG' THEN si.item_code ELSE NULL END AS sfg_code,
    -- Get item_name from sfg_bom
    CASE WHEN si.item_type = 'SFG' THEN sfg_bom.item_name ELSE NULL END AS sfg_item_name,
    -- Qty PCS is the current_balance for SFG items (in NOS)
    CASE WHEN si.item_type = 'SFG' THEN COALESCE(sb_store.current_balance, 0) ELSE NULL END AS store_sfg_qty_pcs,
    CASE WHEN si.item_type = 'SFG' THEN COALESCE(sb_prod.current_balance, 0) ELSE NULL END AS production_sfg_qty_pcs,
    CASE WHEN si.item_type = 'SFG' THEN COALESCE(sb_fg.current_balance, 0) ELSE NULL END AS fg_store_sfg_qty_pcs,
    -- Qty KGS = (balance * part_weight_gm_pcs) / 1000 for SFG items
    CASE 
        WHEN si.item_type = 'SFG' AND sfg_bom.part_weight_gm_pcs IS NOT NULL 
             AND sfg_bom.part_weight_gm_pcs > 0 THEN
            ROUND((COALESCE(sb_store.current_balance, 0) * sfg_bom.part_weight_gm_pcs) / 1000.0, 2)
        ELSE NULL
    END AS store_sfg_qty_kgs,
    CASE 
        WHEN si.item_type = 'SFG' AND sfg_bom.part_weight_gm_pcs IS NOT NULL 
             AND sfg_bom.part_weight_gm_pcs > 0 THEN
            ROUND((COALESCE(sb_prod.current_balance, 0) * sfg_bom.part_weight_gm_pcs) / 1000.0, 2)
        ELSE NULL
    END AS production_sfg_qty_kgs,
    CASE 
        WHEN si.item_type = 'SFG' AND sfg_bom.part_weight_gm_pcs IS NOT NULL 
             AND sfg_bom.part_weight_gm_pcs > 0 THEN
            ROUND((COALESCE(sb_fg.current_balance, 0) * sfg_bom.part_weight_gm_pcs) / 1000.0, 2)
        ELSE NULL
    END AS fg_store_sfg_qty_kgs,
    -- PM-specific columns (only populated for PM items)
    -- Get dimensions from packing_materials
    CASE WHEN si.item_type = 'PM' THEN packing_materials.dimensions ELSE NULL END AS pm_dimensions,
    -- Party name, color/remarks would need to be stored separately or in stock_ledger remarks
    NULL::VARCHAR AS pm_party_name,
    NULL::VARCHAR AS pm_color_remarks
FROM stock_items si
LEFT JOIN stock_balances sb_store ON si.item_code = sb_store.item_code AND sb_store.location_code = 'STORE'
LEFT JOIN stock_balances sb_prod ON si.item_code = sb_prod.item_code AND sb_prod.location_code = 'PRODUCTION'
LEFT JOIN stock_balances sb_fg ON si.item_code = sb_fg.item_code AND sb_fg.location_code = 'FG_STORE'
-- Join with fg_bom and local_bom for FG items
LEFT JOIN fg_bom ON si.item_type = 'FG' 
    AND CASE 
        WHEN si.item_code LIKE '%-%' THEN
            LEFT(si.item_code, LENGTH(si.item_code) - POSITION('-' IN REVERSE(si.item_code)))
        ELSE si.item_code
    END = fg_bom.item_code
LEFT JOIN local_bom ON si.item_type = 'FG' 
    AND CASE 
        WHEN si.item_code LIKE '%-%' THEN
            LEFT(si.item_code, LENGTH(si.item_code) - POSITION('-' IN REVERSE(si.item_code)))
        ELSE si.item_code
    END = local_bom.item_code
-- Join with sfg_bom for SFG items
LEFT JOIN sfg_bom ON si.item_type = 'SFG' AND si.item_code = sfg_bom.sfg_code
-- Join with packing_materials for PM items
LEFT JOIN packing_materials ON si.item_type = 'PM' AND si.item_code = packing_materials.item_code
WHERE si.is_active = TRUE
ORDER BY si.item_type, si.item_code;
