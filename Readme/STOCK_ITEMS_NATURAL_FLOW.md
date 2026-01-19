# Stock Items Creation in Natural Business Flow

## Overview

This document explains how stock items are created and managed when using the natural business flow (GRN, MIS, DPR, etc.) vs. manual creation.

## How Stock Items Are Created

### 1. **Automatic Creation (RM Types Only)**

When posting GRN, MIS, or other documents to stock, the system **automatically creates stock items** for **Raw Material (RM) types** if they don't exist:

**Auto-created RM Types:**
- `RM-HP` (Homo Polymer)
- `RM-ICP` (Impact Copolymer)
- `RM-RCP` (Random Copolymer)
- `RM-LDPE` (Low-Density Polyethylene)
- `RM-GPPS` (General Purpose Polystyrene)
- `RM-MB` (Masterbatch)

**How it works:**
1. When GRN/MIS is posted, it calls `mapItemToStockItem()`
2. If description matches an RM type (e.g., "HP", "ICP"), it looks for `RM-HP`, `RM-ICP`, etc.
3. If not found, it **automatically creates** the stock item with:
   - `item_code`: `RM-{TYPE}` (e.g., `RM-HP`)
   - `item_name`: `Raw Material - {TYPE}`
   - `item_type`: `RM`
   - `category`: `PP`
   - `sub_category`: `{TYPE}`
   - `unit_of_measure`: `KG`
   - `is_active`: `true`

**Example:**
- GRN has item "HP" → System creates `RM-HP` stock item automatically
- MIS issues "ICP" → System creates `RM-ICP` stock item automatically

### 2. **Manual Creation Required (PM & SFG)**

**Packing Materials (PM)** and **Semi-Finished Goods (SFG)** are **NOT auto-created**. They must exist in `stock_items` before posting:

**PM Items:**
- Must be created manually or via bulk upload
- System only **maps** to existing PM items by:
  - Item code match
  - Item name match
  - Category match (e.g., "Boxes", "BOPP", "Polybags")

**SFG Items:**
- Must be created manually or via bulk upload
- System only **maps** to existing SFG items by:
  - SFG code match (from `sfg_bom` table)
  - Item name match

### 3. **Item Mappings**

The system uses `stock_item_mappings` table to map document descriptions to stock items:

```sql
-- Example mappings
source_table: 'grn'
source_description: 'CTN-Ro10-GM'
stock_item_code: 'CTN-Ro10-GM'
```

If a mapping exists, it uses that. Otherwise, it tries direct matches.

## Complete Flow Example

### Scenario: Posting a GRN

1. **User creates GRN** with items:
   - "HP" (Raw Material)
   - "CTN-Ro10-GM" (Packing Material)

2. **User clicks "Post to Stock"**

3. **System processes each item:**

   **For "HP":**
   - Looks for `RM-HP` stock item
   - If not found → **Creates it automatically** ✅
   - Creates ledger entry
   - Updates stock balance

   **For "CTN-Ro10-GM":**
   - Looks for `CTN-Ro10-GM` stock item
   - If not found → **Skips with warning** ⚠️
   - User must create stock item first

4. **Result:**
   - RM items are auto-created and posted ✅
   - PM items must exist first, or they're skipped

## Best Practices

### For Opening Stock Setup:

1. **Create all stock items first:**
   - Use "Bulk Upload Opening Stock" to create PM and SFG items
   - Or manually create them via "Add New Stock Item"

2. **Then add opening stock:**
   - Use "Add All Opening Stock" with actual quantities
   - Or use "Bulk Upload Opening Stock" from Excel

3. **Then use natural flow:**
   - GRN/MIS/DPR will work correctly
   - RM items will auto-create if needed
   - PM/SFG items must already exist

### For Daily Operations:

1. **RM items:** Can be created automatically during GRN/MIS posting
2. **PM items:** Must be created before first use
3. **SFG items:** Must be created before DPR posting

## Summary

| Item Type | Auto-Created? | When Created |
|-----------|---------------|--------------|
| **RM (Standard Types)** | ✅ Yes | During GRN/MIS posting if not exists |
| **RM (Custom Grades)** | ❌ No | Must create manually |
| **PM (All)** | ❌ No | Must create manually before use |
| **SFG (All)** | ❌ No | Must create manually before use |
| **FG** | ❌ No | Must create manually |

## Delete Options

### 1. **Soft Delete** (Recommended)
- Sets `is_active = false`
- Preserves all data
- Items won't show in active lists
- Can be reactivated later

### 2. **Hard Delete**
- Permanently removes stock items
- **Fails if items have ledger entries** (foreign key constraint)
- Removes from `stock_items` and `stock_balances`
- **Does NOT remove ledger entries**

### 3. **Delete + Ledger** (Nuclear Option)
- Permanently removes:
  - Stock items
  - **ALL ledger entries** (transaction history)
  - **ALL balance entries**
- **Use with extreme caution!**
- **Cannot be undone!**
