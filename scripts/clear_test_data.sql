-- ============================================================================
-- CLEAR ALL DATA FOR FRESH TESTING
-- ============================================================================

-- 1. Delete stock ledger entries
DELETE FROM stock_ledger WHERE document_type = 'JW_GRN';
DELETE FROM stock_ledger WHERE document_type = 'MIS';
DELETE FROM stock_ledger WHERE document_type = 'FG_TRANSFER';
DELETE FROM stock_ledger WHERE document_type = 'FG_TRANSFER_CANCEL';

-- 2. Delete JW Annexure GRN data
DELETE FROM store_jw_annexure_grn_items;
DELETE FROM store_jw_annexure_grn;

-- 3. Delete Material Indent Slip data (CORRECT TABLE NAMES)
DELETE FROM purchase_material_indent_slip_items;
DELETE FROM purchase_material_indent_slip;

-- 4. Delete Issue Slip (MIS) data
DELETE FROM store_mis_items;
DELETE FROM store_mis;

-- 5. Delete FG Transfer Note data
DELETE FROM production_fg_transfer_note_items;
DELETE FROM production_fg_transfer_note;

-- 6. Reset RM stock balances
DELETE FROM stock_balances WHERE item_code LIKE 'RM-%';

-- 7. Verify cleanup
SELECT 'JW GRN Headers' as table_name, COUNT(*) as count FROM store_jw_annexure_grn
UNION ALL
SELECT 'JW GRN Items', COUNT(*) FROM store_jw_annexure_grn_items
UNION ALL
SELECT 'Material Indent Slips', COUNT(*) FROM purchase_material_indent_slip
UNION ALL
SELECT 'Material Indent Items', COUNT(*) FROM purchase_material_indent_slip_items
UNION ALL
SELECT 'Issue Slips', COUNT(*) FROM store_mis
UNION ALL
SELECT 'Issue Slip Items', COUNT(*) FROM store_mis_items
UNION ALL
SELECT 'FG Transfer Notes', COUNT(*) FROM production_fg_transfer_note
UNION ALL
SELECT 'FG Transfer Note Items', COUNT(*) FROM production_fg_transfer_note_items
UNION ALL
SELECT 'JW GRN Stock Entries', COUNT(*) FROM stock_ledger WHERE document_type = 'JW_GRN'
UNION ALL
SELECT 'Issue Slip Stock Entries', COUNT(*) FROM stock_ledger WHERE document_type = 'MIS'
UNION ALL
SELECT 'FG Transfer Stock Entries', COUNT(*) FROM stock_ledger WHERE document_type = 'FG_TRANSFER'
UNION ALL
SELECT 'FG Transfer Cancel Entries', COUNT(*) FROM stock_ledger WHERE document_type = 'FG_TRANSFER_CANCEL';
