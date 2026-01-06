# Cursor Prompt: Fix DPR Stock Ledger Posting Issues

## Problem Summary

The DPR (Daily Production Report) posting to Stock Ledger has multiple bugs that need fixing.

---

## ANALYSIS RESULTS (Added by Cursor)

### Bug 1: Only Last Mold Being Posted
**Status: ✅ NOT FOUND IN STOCK CODE**

The stock posting code in `post-dpr.ts` correctly processes ALL entries:
- `aggregateProductionBySfg()` loops through ALL `dpr_machine_entries` (lines 348-418)
- Entries are aggregated by SFG code and totals are summed correctly
- **If this is happening, the issue is likely in how DPR entries are SAVED (frontend), not in stock posting**

### Bug 2: Second Line Posting Reverses First Line Data
**Status: ✅ FIXED - ROOT CAUSE FOUND**

**Root Cause:** The DPR API had **AUTO-POSTING** logic in PUT and POST endpoints!

In `/src/app/api/dpr/[id]/route.ts` (lines 240-299):
- When DPR was saved/updated, it automatically checked if DPR was already posted
- If yes, it called `cancelStockPosting()` to CREATE REVERSAL ENTRIES
- Then it re-posted the DPR

This means:
1. User saves DPR with LINE-001 → auto-posts to stock
2. User saves same DPR again (adding LINE-002) → system CANCELS ALL ENTRIES → re-posts
3. This created +/- reversal entries every time DPR was saved!

**Fix Applied:**
- Removed auto-posting from PUT endpoint (`/api/dpr/[id]/route.ts`)
- Removed auto-posting from POST endpoint (`/api/dpr/route.ts`)
- Stock posting now only happens when user explicitly clicks "Post to Stock" button

### Bug 3: React Key Error for Changeover Entries
**Status: ✅ FIXED**

Changed React keys from `machine.machineNo` to `${machine.machineNo}-${machine.currentProduction.product || 'current'}` at lines 2396 and 3380.

### Cleanup SQL
**Status: ✅ CREATED**

Created migration: `20260106000004_cleanup_jan5_dpr_stock_entries.sql`

---

## Bug 1: Only Last Mold Being Posted

**Current Behavior:**
When a DPR has multiple production entries (multiple molds on same line, or changeover entries), only the LAST mold's data is being posted to stock ledger. Previous entries are being ignored or overwritten.

**Expected Behavior:**
ALL production entries in the DPR should be posted to stock ledger. A single DPR can have:
- Multiple lines (LINE-001, LINE-002, etc.)
- Multiple molds per line (changeover - same line runs different molds in one shift)
- Each entry should create its own stock movements

**What to Fix:**
- Loop through ALL dpr_production_entries for the given DPR
- Process each entry independently
- Do not skip or overwrite previous entries
- Handle changeover entries (is_changeover = true) the same as regular entries
- Each mold should create: SFG in FG_STORE, REGRIND in STORE, RM consumption from PRODUCTION

---

## Bug 2: Second Line Posting Reverses First Line Data

**Current Behavior:**
When I post DPR data for LINE-002, it is reversing/cancelling the stock entries that were created for LINE-001. The system seems to be treating a new entry as a cancellation of previous entries.

**Expected Behavior:**
Each line's DPR posting should ADD to the existing stock movements, not replace or reverse them. Stock ledger entries should accumulate throughout the day.

**What to Fix:**
- Check the document_id generation - ensure each entry has unique identifier
- Do not call cancel/reversal logic when posting new entries
- Only create reversal entries when user explicitly clicks "Cancel" on a posted DPR
- Verify the unique constraint on stock_ledger is not causing conflicts
- The document reference should include both the DPR ID and the entry ID or line number to make each posting unique

---

## Bug 3: React Key Error for Changeover Entries

**Current Behavior:**
Console shows error: "Encountered two children with the same key `LINE-001`. Keys should be unique so that components maintain their identity across updates."

This happens because LINE-001 can have two entries (regular + changeover) but the React key is using machine_no which is not unique.

**Expected Behavior:**
Each row in the DPR table should have a unique React key.

**What to Fix:**
- Find the map function that renders DPR production entries in the table
- Change the key from machine_no or line_no to a unique identifier
- Use one of these as key:
  - entry.id (database primary key - best option)
  - Combination: machine_no + product name
  - Combination: machine_no + index
  - Combination: line_no + "-" + index

---

## Task: Cleanup SQL Script

Generate SQL statements to clean up the corrupted data from January 5th, 2026. This should:

1. Delete all stock_ledger entries where document_id contains 'DPR-2026-01-05'
2. Delete all stock_ledger entries where document_id contains 'DPR-2026-01-05-DAY-CANCEL'
3. Recalculate stock_balances after deletion (or delete and let system rebuild)
4. Reset the stock_status of dpr_data for date 2026-01-05 back to 'DRAFT' so it can be re-posted
5. Delete any entries from dpr_production_entries if needed for a clean slate

The cleanup should remove these specific entries:
- REGRIND: +8.30 KG and -8.30 KG (reversal)
- 110410001 (SFG): +11000.00 NOS and -11000.00 NOS (reversal)
- RM-ICP: -0.12 KG and +0.12 KG (reversal)
- RM-HP: -0.75 KG and +0.75 KG (reversal)

After cleanup, stock_balances should show only the MIS entries:
- STORE: RM-HP 150 KG, RM-ICP 25 KG
- PRODUCTION: RM-HP 100 KG, RM-ICP 25 KG
- FG STORE: empty (0 items)

---

## Summary of Changes Required

| Area                          | Issue                             | Fix |
|------                        |-------                             |-----|
| DPR Posting Logic | Only processes last entry | Loop through ALL dpr_production_entries |
| DPR Posting Logic | New entry reverses old entries | Generate unique document references per entry |
| DPR Posting Logic | Changeover entries skipped | Process is_changeover entries same as regular |
| Stock Ledger | Duplicate entries causing reversals | Ensure unique constraint allows multiple entries per DPR |
| React Component | Duplicate key error | Use entry.id as React key instead of machine_no |
| Database | Corrupted data from Jan 5 | Provide cleanup SQL script |

---

## Testing After Fix

1. Create DPR with LINE-001 having two products (changeover)
2. Add LINE-002 with one product
3. Save DPR
4. Click "Post to Stock"
5. Verify in Stock Ledger:
   - All 3 products created SFG entries in FG STORE
   - All 3 products created REGRIND entries in STORE (based on rejection)
   - RM consumption entries created for all 3 products in PRODUCTION
   - No reversal/cancel entries unless explicitly cancelled
6. Verify no React console errors about duplicate keys