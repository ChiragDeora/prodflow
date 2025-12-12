-- More robust fix for underscore data values in BOM tables
-- Handle both leading underscores and convert text fields properly

-- Check current data with underscores
SELECT 'FG BOM with underscores' as info, 
       item_code, 
       sfg_1_qty,
       CASE 
         WHEN sfg_1_qty::text LIKE '_%' THEN 'HAS UNDERSCORE'
         ELSE 'CLEAN'
       END as status
FROM fg_bom 
WHERE sfg_1_qty::text LIKE '_%'
LIMIT 5;

-- Fix FG BOM - Handle both numeric and text fields with underscores
UPDATE fg_bom 
SET sfg_1_qty = CASE 
  WHEN sfg_1_qty::text LIKE '_%' THEN 
    CAST(LTRIM(sfg_1_qty::text, '_') AS DECIMAL(10,4))
  ELSE sfg_1_qty 
END;

UPDATE fg_bom 
SET sfg_2_qty = CASE 
  WHEN sfg_2_qty::text LIKE '_%' THEN 
    CAST(LTRIM(sfg_2_qty::text, '_') AS DECIMAL(10,4))
  ELSE sfg_2_qty 
END;

UPDATE fg_bom 
SET cnt_qty = CASE 
  WHEN cnt_qty::text LIKE '_%' THEN 
    CAST(LTRIM(cnt_qty::text, '_') AS DECIMAL(10,4))
  ELSE cnt_qty 
END;

UPDATE fg_bom 
SET poly_qty = CASE 
  WHEN poly_qty::text LIKE '_%' THEN 
    CAST(LTRIM(poly_qty::text, '_') AS DECIMAL(10,4))
  ELSE poly_qty 
END;

UPDATE fg_bom 
SET qty_meter = CASE 
  WHEN qty_meter::text LIKE '_%' THEN 
    CAST(LTRIM(qty_meter::text, '_') AS DECIMAL(10,4))
  ELSE qty_meter 
END;

UPDATE fg_bom 
SET qty_meter_2 = CASE 
  WHEN qty_meter_2::text LIKE '_%' THEN 
    CAST(LTRIM(qty_meter_2::text, '_') AS DECIMAL(10,4))
  ELSE qty_meter_2 
END;

-- Fix LOCAL BOM
UPDATE local_bom 
SET sfg_1_qty = CASE 
  WHEN sfg_1_qty::text LIKE '_%' THEN 
    CAST(LTRIM(sfg_1_qty::text, '_') AS DECIMAL(10,4))
  ELSE sfg_1_qty 
END;

UPDATE local_bom 
SET sfg_2_qty = CASE 
  WHEN sfg_2_qty::text LIKE '_%' THEN 
    CAST(LTRIM(sfg_2_qty::text, '_') AS DECIMAL(10,4))
  ELSE sfg_2_qty 
END;

UPDATE local_bom 
SET cnt_qty = CASE 
  WHEN cnt_qty::text LIKE '_%' THEN 
    CAST(LTRIM(cnt_qty::text, '_') AS DECIMAL(10,4))
  ELSE cnt_qty 
END;

UPDATE local_bom 
SET poly_qty = CASE 
  WHEN poly_qty::text LIKE '_%' THEN 
    CAST(LTRIM(poly_qty::text, '_') AS DECIMAL(10,4))
  ELSE poly_qty 
END;

UPDATE local_bom 
SET qty_meter = CASE 
  WHEN qty_meter::text LIKE '_%' THEN 
    CAST(LTRIM(qty_meter::text, '_') AS DECIMAL(10,4))
  ELSE qty_meter 
END;

UPDATE local_bom 
SET qty_meter_2 = CASE 
  WHEN qty_meter_2::text LIKE '_%' THEN 
    CAST(LTRIM(qty_meter_2::text, '_') AS DECIMAL(10,4))
  ELSE qty_meter_2 
END;

-- Verify the fixes
SELECT 'FG BOM After Fix' as info, 
       item_code, 
       sfg_1_qty,
       sfg_2_qty,
       cnt_qty
FROM fg_bom 
LIMIT 5;

SELECT 'LOCAL BOM After Fix' as info, 
       item_code, 
       sfg_1_qty,
       sfg_2_qty,
       cnt_qty
FROM local_bom 
LIMIT 5;
