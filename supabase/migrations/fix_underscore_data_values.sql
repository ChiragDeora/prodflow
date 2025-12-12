-- Fix underscore data values in BOM tables
-- Remove leading underscores from quantity values

-- Fix FG BOM quantity values
UPDATE fg_bom 
SET sfg_1_qty = LTRIM(sfg_1_qty::text, '_')::numeric 
WHERE sfg_1_qty::text LIKE '_%';

UPDATE fg_bom 
SET sfg_2_qty = LTRIM(sfg_2_qty::text, '_')::numeric 
WHERE sfg_2_qty::text LIKE '_%';

UPDATE fg_bom 
SET cnt_qty = LTRIM(cnt_qty::text, '_')::numeric 
WHERE cnt_qty::text LIKE '_%';

UPDATE fg_bom 
SET poly_qty = LTRIM(poly_qty::text, '_')::numeric 
WHERE poly_qty::text LIKE '_%';

UPDATE fg_bom 
SET qty_meter = LTRIM(qty_meter::text, '_')::numeric 
WHERE qty_meter::text LIKE '_%';

UPDATE fg_bom 
SET qty_meter_2 = LTRIM(qty_meter_2::text, '_')::numeric 
WHERE qty_meter_2::text LIKE '_%';

-- Fix LOCAL BOM quantity values
UPDATE local_bom 
SET sfg_1_qty = LTRIM(sfg_1_qty::text, '_')::numeric 
WHERE sfg_1_qty::text LIKE '_%';

UPDATE local_bom 
SET sfg_2_qty = LTRIM(sfg_2_qty::text, '_')::numeric 
WHERE sfg_2_qty::text LIKE '_%';

UPDATE local_bom 
SET cnt_qty = LTRIM(cnt_qty::text, '_')::numeric 
WHERE cnt_qty::text LIKE '_%';

UPDATE local_bom 
SET poly_qty = LTRIM(poly_qty::text, '_')::numeric 
WHERE poly_qty::text LIKE '_%';

UPDATE local_bom 
SET qty_meter = LTRIM(qty_meter::text, '_')::numeric 
WHERE qty_meter::text LIKE '_%';

UPDATE local_bom 
SET qty_meter_2 = LTRIM(qty_meter_2::text, '_')::numeric 
WHERE qty_meter_2::text LIKE '_%';

-- Fix SFG BOM percentage values if they have underscores
UPDATE sfg_bom 
SET hp_percentage = LTRIM(hp_percentage::text, '_')::numeric 
WHERE hp_percentage::text LIKE '_%';

UPDATE sfg_bom 
SET icp_percentage = LTRIM(icp_percentage::text, '_')::numeric 
WHERE icp_percentage::text LIKE '_%';

UPDATE sfg_bom 
SET rcp_percentage = LTRIM(rcp_percentage::text, '_')::numeric 
WHERE rcp_percentage::text LIKE '_%';

UPDATE sfg_bom 
SET ldpe_percentage = LTRIM(ldpe_percentage::text, '_')::numeric 
WHERE ldpe_percentage::text LIKE '_%';

UPDATE sfg_bom 
SET gpps_percentage = LTRIM(gpps_percentage::text, '_')::numeric 
WHERE gpps_percentage::text LIKE '_%';

UPDATE sfg_bom 
SET mb_percentage = LTRIM(mb_percentage::text, '_')::numeric 
WHERE mb_percentage::text LIKE '_%';

-- Verify the changes
SELECT 'FG BOM Sample' as table_name, item_code, sfg_1_qty, sfg_2_qty, cnt_qty 
FROM fg_bom 
LIMIT 5;

SELECT 'LOCAL BOM Sample' as table_name, item_code, sfg_1_qty, sfg_2_qty, cnt_qty 
FROM local_bom 
LIMIT 5;

SELECT 'SFG BOM Sample' as table_name, sfg_code, hp_percentage, icp_percentage, rcp_percentage 
FROM sfg_bom 
LIMIT 5;
