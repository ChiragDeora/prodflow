-- ============================================================================
-- BULK DELETE STOCK ITEMS
-- Use this SQL to delete/deactivate multiple stock items at once
-- ============================================================================
-- 
-- IMPORTANT: Stock items that have entries in stock_ledger cannot be hard deleted
-- due to foreign key constraints. Use SOFT DELETE (Option 1-3) instead.
-- ============================================================================

-- Option 1: Soft delete (RECOMMENDED) - Sets is_active to false
-- This is safe and preserves data integrity
-- Replace the IDs with the actual IDs you want to deactivate
UPDATE stock_items
SET is_active = false,
    updated_at = NOW()
WHERE id IN (
    -- Example: Deactivate items with specific IDs
    1, 2, 3, 4, 5
    -- Add more IDs here
);

-- Option 2: Soft delete by item codes
UPDATE stock_items
SET is_active = false,
    updated_at = NOW()
WHERE item_code IN (
    'CTN-Ro10-GM',
    'CTN-Ro12-GM',
    'CTN-Ro16-GM'
    -- Add more item codes here
);

-- Option 3: Soft delete by item type
UPDATE stock_items
SET is_active = false,
    updated_at = NOW()
WHERE item_type = 'PM'  -- or 'RM', 'SFG', 'FG'
AND is_active = true;

-- ============================================================================
-- HARD DELETE OPTIONS (Use with extreme caution!)
-- ============================================================================
-- WARNING: These will permanently delete records and may break referential integrity
-- Only use if you're absolutely sure and have backups!
-- ============================================================================

-- Option 4: Hard delete with ledger cleanup (2-step process)
-- Step 1: Delete related stock_ledger entries first
DELETE FROM stock_ledger
WHERE item_id IN (
    -- Replace with actual IDs you want to delete
    1, 2, 3
);

-- Step 2: Delete related stock_balances
DELETE FROM stock_balances
WHERE item_id IN (
    -- Same IDs as above
    1, 2, 3
);

-- Step 3: Now you can delete stock_items
DELETE FROM stock_items
WHERE id IN (
    -- Same IDs as above
    1, 2, 3
);

-- Option 5: Hard delete using CASCADE (if foreign key allows it)
-- This will automatically delete related records in stock_ledger and stock_balances
-- WARNING: This is dangerous! Check your foreign key constraints first.
-- Most likely this will FAIL unless CASCADE is enabled on the foreign key.
DELETE FROM stock_items
WHERE id IN (
    -- Replace with actual IDs
    1, 2, 3
);

-- Option 6: Delete all inactive items (cleanup - only if no ledger entries)
-- This will only work for items that have NO entries in stock_ledger
DELETE FROM stock_items
WHERE is_active = false
AND id NOT IN (
    SELECT DISTINCT item_id 
    FROM stock_ledger 
    WHERE item_id IS NOT NULL
);

-- ============================================================================
-- VERIFY BEFORE DELETING
-- ============================================================================

-- Check which items will be affected (run this first!)
SELECT id, item_code, item_name, item_type, is_active
FROM stock_items
WHERE id IN (
    -- Your IDs here
    1, 2, 3
);

-- Count items that will be deleted
SELECT COUNT(*) as items_to_delete
FROM stock_items
WHERE id IN (
    -- Your IDs here
    1, 2, 3
);

-- Check if items have ledger entries (will prevent hard delete)
SELECT 
    si.id,
    si.item_code,
    si.item_name,
    COUNT(sl.id) as ledger_entries_count,
    COUNT(sb.id) as balance_entries_count
FROM stock_items si
LEFT JOIN stock_ledger sl ON sl.item_id = si.id
LEFT JOIN stock_balances sb ON sb.item_id = si.id
WHERE si.id IN (
    -- Your IDs here
    1, 2, 3
)
GROUP BY si.id, si.item_code, si.item_name
ORDER BY ledger_entries_count DESC;

-- Find items that CAN be safely hard deleted (no ledger entries)
SELECT id, item_code, item_name, item_type
FROM stock_items
WHERE is_active = false
AND id NOT IN (
    SELECT DISTINCT item_id 
    FROM stock_ledger 
    WHERE item_id IS NOT NULL
)
AND id NOT IN (
    SELECT DISTINCT item_id 
    FROM stock_balances 
    WHERE item_id IS NOT NULL
);
