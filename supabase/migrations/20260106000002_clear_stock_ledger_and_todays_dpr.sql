-- ============================================================================
-- CLEAR STOCK LEDGER AND TODAY'S DPR ENTRIES
-- Date: 2026-01-06
-- Purpose: Clear stock ledger and today's DPR entries while keeping headers
-- ============================================================================

-- 1. Delete all stock ledger entries
DELETE FROM stock_ledger;

-- 2. Reset all stock balances to 0
DELETE FROM stock_balances;

-- 3. Delete today's DPR machine entries (5th Jan 2026)
-- This will keep the dpr_data header but remove all machine entries
DELETE FROM dpr_machine_entries
WHERE dpr_id IN (
    SELECT id FROM dpr_data 
    WHERE DATE(report_date) = '2026-01-05'
);

-- 4. Delete today's DPR stoppage entries (5th Jan 2026)
-- Stoppage entries are linked to machine entries, not directly to dpr_data
DELETE FROM dpr_stoppage_entries
WHERE dpr_machine_entry_id IN (
    SELECT id FROM dpr_machine_entries
    WHERE dpr_id IN (
        SELECT id FROM dpr_data 
        WHERE DATE(report_date) = '2026-01-05'
    )
);

-- 5. Optional: If you also want to delete the DPR header itself, uncomment below:
-- DELETE FROM dpr_data WHERE DATE(report_date) = '2026-01-05';

-- 6. Reset stock posting flags on documents (optional - uncomment if needed)
-- UPDATE store_grn SET posted_to_stock = false, posted_to_stock_at = NULL WHERE posted_to_stock = true;
-- UPDATE store_jw_annexure_grn SET posted_to_stock = false, posted_to_stock_at = NULL WHERE posted_to_stock = true;
-- UPDATE store_mis SET posted_to_stock = false, posted_to_stock_at = NULL WHERE posted_to_stock = true;
-- UPDATE dpr_data SET stock_status = 'NOT_POSTED', posted_to_stock_at = NULL WHERE stock_status = 'POSTED';

-- Verify deletions
SELECT 
    'stock_ledger' as table_name, 
    COUNT(*) as remaining_count 
FROM stock_ledger
UNION ALL
SELECT 
    'stock_balances', 
    COUNT(*) 
FROM stock_balances
UNION ALL
SELECT 
    'dpr_machine_entries (today)', 
    COUNT(*) 
FROM dpr_machine_entries 
WHERE dpr_id IN (SELECT id FROM dpr_data WHERE DATE(report_date) = '2026-01-05')
UNION ALL
SELECT 
    'dpr_data headers (today)', 
    COUNT(*) 
FROM dpr_data 
WHERE DATE(report_date) = '2026-01-05';

