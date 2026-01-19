-- ============================================================================
-- CLEAN STOCK LEDGER ENTRIES
-- Use this script to clean/delete stock ledger entries separately
-- WARNING: This will permanently delete transaction history!
-- ============================================================================

-- ============================================================================
-- OPTION 1: Delete all opening stock entries
-- ============================================================================
DELETE FROM stock_ledger
WHERE document_type = 'OPENING';

-- ============================================================================
-- OPTION 2: Delete ledger entries for specific item IDs
-- ============================================================================
-- Replace the IDs with actual item IDs
DELETE FROM stock_ledger
WHERE item_id IN (
    1, 2, 3, 4, 5
    -- Add more IDs here
);

-- ============================================================================
-- OPTION 3: Delete ledger entries for specific item codes
-- ============================================================================
DELETE FROM stock_ledger
WHERE item_code IN (
    'CTN-Ro10-GM',
    'CTN-Ro12-GM',
    'CTN-Ro16-GM'
    -- Add more item codes here
);

-- ============================================================================
-- OPTION 4: Delete ledger entries by date range
-- ============================================================================
DELETE FROM stock_ledger
WHERE transaction_date BETWEEN '2024-01-01' AND '2024-12-31';

-- ============================================================================
-- OPTION 5: Delete ledger entries by document type
-- ============================================================================
DELETE FROM stock_ledger
WHERE document_type IN ('OPENING', 'ADJUSTMENT');

-- ============================================================================
-- OPTION 6: Delete all ledger entries (NUCLEAR OPTION - Use with extreme caution!)
-- ============================================================================
-- WARNING: This deletes ALL transaction history!
-- DELETE FROM stock_ledger;

-- ============================================================================
-- VERIFY BEFORE DELETING
-- ============================================================================

-- Check how many entries will be deleted
SELECT 
    document_type,
    COUNT(*) as entry_count,
    MIN(transaction_date) as earliest_date,
    MAX(transaction_date) as latest_date
FROM stock_ledger
WHERE document_type = 'OPENING'  -- or your filter condition
GROUP BY document_type;

-- Check entries for specific items
SELECT 
    sl.item_id,
    si.item_code,
    si.item_name,
    COUNT(sl.id) as ledger_entries,
    MIN(sl.transaction_date) as first_entry,
    MAX(sl.transaction_date) as last_entry
FROM stock_ledger sl
JOIN stock_items si ON si.id = sl.item_id
WHERE sl.item_id IN (1, 2, 3)  -- Replace with your IDs
GROUP BY sl.item_id, si.item_code, si.item_name;

-- Check total ledger entries
SELECT COUNT(*) as total_ledger_entries FROM stock_ledger;

-- ============================================================================
-- CLEANUP: After deleting ledger entries, you may also want to clean balances
-- ============================================================================

-- Delete balances for items that no longer have ledger entries
DELETE FROM stock_balances
WHERE item_id NOT IN (
    SELECT DISTINCT item_id 
    FROM stock_ledger 
    WHERE item_id IS NOT NULL
);

-- Or delete specific balances
DELETE FROM stock_balances
WHERE item_id IN (
    1, 2, 3  -- Replace with your IDs
);
