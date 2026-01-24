-- ============================================================================
-- DELETE DPR FOR ALL OF JANUARY 2026
-- Deletes dpr_data for Jan 2026 (cascades to dpr_machine_entries, dpr_stoppage_entries)
-- Use this to clear January DPR so you can create new data and post to stock.
-- ============================================================================

-- Step 1: Show what will be deleted
SELECT 'DPR(s) to be deleted (Jan 2026):' AS info;
SELECT id, report_date, shift, shift_incharge, stock_status, created_at
FROM dpr_data
WHERE report_date >= '2026-01-01' AND report_date < '2026-02-01'
ORDER BY report_date, shift;

SELECT 'Machine entries to be deleted:' AS info;
SELECT COUNT(*) AS count
FROM dpr_machine_entries
WHERE dpr_id IN (
    SELECT id FROM dpr_data
    WHERE report_date >= '2026-01-01' AND report_date < '2026-02-01'
);

-- Step 2: Delete DPR data (cascades to dpr_machine_entries, dpr_stoppage_entries)
DELETE FROM dpr_data
WHERE report_date >= '2026-01-01' AND report_date < '2026-02-01';

-- Step 3: Verify
SELECT 'Verification - Remaining DPR for Jan 2026:' AS info;
SELECT COUNT(*) AS remaining_count
FROM dpr_data
WHERE report_date >= '2026-01-01' AND report_date < '2026-02-01';
