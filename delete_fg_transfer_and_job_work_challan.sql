-- ============================================================================
-- DELETE FG TRANSFER NOTE, JOB WORK CHALLAN & RELATED STOCK LEDGER ENTRIES
-- ============================================================================
-- Removes:
--   1. Stock ledger entries (FG_TRANSFER, FG_TRANSFER_CANCEL, JOB_WORK_CHALLAN, JOB_WORK_CHALLAN_CANCEL)
--   2. FG Transfer Note: production_fg_transfer_note_items, production_fg_transfer_note
--   3. Job Work Challan: store_job_work_challan_items, store_job_work_challan
--
-- NOTE: After running, stock_balances may be out of sync with stock_ledger.
--       Rebuild stock_balances from stock_ledger if you need correct balances.
-- ============================================================================

-- 1. Stock ledger: FG Transfer
DELETE FROM stock_ledger WHERE document_type = 'FG_TRANSFER';
DELETE FROM stock_ledger WHERE document_type = 'FG_TRANSFER_CANCEL';

-- 2. Stock ledger: Job Work Challan
DELETE FROM stock_ledger WHERE document_type = 'JOB_WORK_CHALLAN';
DELETE FROM stock_ledger WHERE document_type = 'JOB_WORK_CHALLAN_CANCEL';

-- 3. FG Transfer Note (production)
DELETE FROM production_fg_transfer_note_items;
DELETE FROM production_fg_transfer_note;

-- 4. Job Work Challan
DELETE FROM store_job_work_challan_items;
DELETE FROM store_job_work_challan;

-- 5. Verify
SELECT 'FG Transfer Notes'           AS table_name, COUNT(*) AS remaining FROM production_fg_transfer_note
UNION ALL SELECT 'FG Transfer Note Items', COUNT(*) FROM production_fg_transfer_note_items
UNION ALL SELECT 'Job Work Challan',        COUNT(*) FROM store_job_work_challan
UNION ALL SELECT 'Job Work Challan Items',  COUNT(*) FROM store_job_work_challan_items
UNION ALL SELECT 'stock_ledger FG_TRANSFER',         COUNT(*) FROM stock_ledger WHERE document_type = 'FG_TRANSFER'
UNION ALL SELECT 'stock_ledger FG_TRANSFER_CANCEL',  COUNT(*) FROM stock_ledger WHERE document_type = 'FG_TRANSFER_CANCEL'
UNION ALL SELECT 'stock_ledger JOB_WORK_CHALLAN',    COUNT(*) FROM stock_ledger WHERE document_type = 'JOB_WORK_CHALLAN'
UNION ALL SELECT 'stock_ledger JOB_WORK_CHALLAN_CANCEL', COUNT(*) FROM stock_ledger WHERE document_type = 'JOB_WORK_CHALLAN_CANCEL';
