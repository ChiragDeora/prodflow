-- ============================================================================
-- DELETE DPR FOR JANUARY 23, 2026
-- This script deletes:
-- 1. Stock ledger entries for the DPR(s)
-- 2. DPR data (which cascades to machine entries and stoppage entries)
-- ============================================================================

-- Step 1: Show what will be deleted (for verification)
SELECT 'DPR(s) to be deleted:' as info;
SELECT id, report_date, shift, shift_incharge, stock_status, created_at
FROM dpr_data 
WHERE DATE(report_date) = '2026-01-23'
ORDER BY shift;

SELECT 'Machine entries to be deleted:' as info;
SELECT COUNT(*) as count
FROM dpr_machine_entries
WHERE dpr_id IN (
    SELECT id FROM dpr_data 
    WHERE DATE(report_date) = '2026-01-23'
);

SELECT 'Stock ledger entries to be deleted:' as info;
SELECT COUNT(*) as count
FROM stock_ledger
WHERE document_type IN ('DPR', 'DPR_CANCEL')
AND document_id IN (
    SELECT id FROM dpr_data 
    WHERE DATE(report_date) = '2026-01-23'
);

-- Step 2: Delete stock ledger entries first (before deleting DPR)
-- This prevents orphaned references
DELETE FROM stock_ledger 
WHERE document_type IN ('DPR', 'DPR_CANCEL')
AND document_id IN (
    SELECT id FROM dpr_data 
    WHERE DATE(report_date) = '2026-01-23'
);

-- Step 3: Delete DPR data
-- This will CASCADE delete:
-- - dpr_machine_entries (via ON DELETE CASCADE)
-- - dpr_stoppage_entries (via ON DELETE CASCADE from machine entries)
DELETE FROM dpr_data 
WHERE DATE(report_date) = '2026-01-23';

-- Step 4: Verify deletion
SELECT 'Verification - Remaining DPR entries for Jan 23, 2026:' as info;
SELECT COUNT(*) as remaining_count 
FROM dpr_data 
WHERE DATE(report_date) = '2026-01-23';

SELECT 'Verification - Remaining stock ledger entries:' as info;
SELECT COUNT(*) as remaining_count
FROM stock_ledger
WHERE document_type IN ('DPR', 'DPR_CANCEL')
AND document_id IN (
    SELECT id FROM dpr_data 
    WHERE DATE(report_date) = '2026-01-23'
);

-- Note: Stock balances are NOT automatically recalculated here.
-- If you need to recalculate balances, run the balance recalculation separately.
