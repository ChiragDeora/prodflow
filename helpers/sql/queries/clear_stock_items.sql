-- ============================================================================
-- CLEAR STOCK ITEMS - Safe Deletion Script
-- This script safely removes stock items by handling foreign key constraints
-- ============================================================================

-- STEP 1: Check what will be deleted (run this first to verify)
SELECT 
    si.id,
    si.item_code,
    si.item_name,
    si.item_type,
    COUNT(DISTINCT sl.id) as ledger_entries,
    COUNT(DISTINCT sb.id) as balance_entries
FROM stock_items si
LEFT JOIN stock_ledger sl ON sl.item_id = si.id
LEFT JOIN stock_balances sb ON sb.item_id = si.id
WHERE si.is_active = true  -- or add specific conditions
GROUP BY si.id, si.item_code, si.item_name, si.item_type
ORDER BY ledger_entries DESC, si.id;

-- ============================================================================
-- STEP 2: Soft delete all active stock items (SAFE - Recommended)
-- ============================================================================
UPDATE stock_items
SET is_active = false,
    updated_at = NOW()
WHERE is_active = true;

-- ============================================================================
-- STEP 3: Hard delete - Remove all stock items completely
-- WARNING: This will delete ALL stock items and related data!
-- Only run if you're absolutely sure!
-- ============================================================================

-- Step 3a: Delete all stock_ledger entries
DELETE FROM stock_ledger
WHERE item_id IN (SELECT id FROM stock_items);

-- Step 3b: Delete all stock_balances entries
DELETE FROM stock_balances
WHERE item_id IN (SELECT id FROM stock_items);

-- Step 3c: Now delete all stock_items
DELETE FROM stock_items;

-- ============================================================================
-- ALTERNATIVE: Delete specific items by IDs
-- ============================================================================

-- Replace the IDs below with the actual IDs you want to delete
-- Example: Delete items with IDs 1, 2, 3, 4, 5

-- Step 1: Delete related ledger entries
DELETE FROM stock_ledger
WHERE item_id IN (1, 2, 3, 4, 5);  -- Replace with your IDs

-- Step 2: Delete related balance entries
DELETE FROM stock_balances
WHERE item_id IN (1, 2, 3, 4, 5);  -- Replace with your IDs

-- Step 3: Delete stock items
DELETE FROM stock_items
WHERE id IN (1, 2, 3, 4, 5);  -- Replace with your IDs

-- ============================================================================
-- ALTERNATIVE: Delete by item codes
-- ============================================================================

-- Step 1: Get IDs first
SELECT id, item_code FROM stock_items
WHERE item_code IN (
    'CTN-Ro10-GM',
    'CTN-Ro12-GM',
    'CTN-Ro16-GM'
    -- Add more item codes
);

-- Step 2: Delete related data
DELETE FROM stock_ledger
WHERE item_id IN (
    SELECT id FROM stock_items
    WHERE item_code IN (
        'CTN-Ro10-GM',
        'CTN-Ro12-GM',
        'CTN-Ro16-GM'
    )
);

DELETE FROM stock_balances
WHERE item_id IN (
    SELECT id FROM stock_items
    WHERE item_code IN (
        'CTN-Ro10-GM',
        'CTN-Ro12-GM',
        'CTN-Ro16-GM'
    )
);

-- Step 3: Delete stock items
DELETE FROM stock_items
WHERE item_code IN (
    'CTN-Ro10-GM',
    'CTN-Ro12-GM',
    'CTN-Ro16-GM'
);

-- ============================================================================
-- VERIFY DELETION
-- ============================================================================

-- Check remaining stock items
SELECT COUNT(*) as remaining_items FROM stock_items;

-- Check remaining ledger entries
SELECT COUNT(*) as remaining_ledger_entries FROM stock_ledger;

-- Check remaining balances
SELECT COUNT(*) as remaining_balances FROM stock_balances;
