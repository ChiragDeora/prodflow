# Cursor Prompt: Redesign FG Transfer Note

## Overview

Completely redesign the FG Transfer Note form with new columns, auto-calculations, and stock posting logic. The form allows packing of Semi-Finished Goods (SFG) into Finished Goods (FG) while consuming packing materials.

---

## IMPORTANT: New Backend Required

### Delete Old Backend
- Delete all existing API routes related to FG Transfer Note (store_fgn)
- Delete old database operations for store_fgn and store_fgn_items

### Create New Backend
Create completely new backend with the following naming convention:

**Database Tables:**
- production_fg_transfer_note (header table)
- production_fg_transfer_note_items (line items table)

**API Routes:**
- /api/production/fg-transfer-note (GET list, POST create)
- /api/production/fg-transfer-note/[id] (GET single, PUT update, DELETE)
- /api/production/fg-transfer-note/[id]/post (POST - post to stock)
- /api/production/fg-transfer-note/[id]/cancel (POST - cancel/reverse)
- /api/production/fg-transfer-note/generate-doc-no (GET - generate next doc number)

**File Structure:**
- /src/app/api/production/fg-transfer-note/route.js
- /src/app/api/production/fg-transfer-note/[id]/route.js
- /src/app/api/production/fg-transfer-note/[id]/post/route.js
- /src/app/api/production/fg-transfer-note/[id]/cancel/route.js
- /src/lib/production/fg-transfer-note.js (helper functions)

---

## Current Form (To Be Replaced)

Current columns: Sr. No, Item Name, No. Of Boxes, Qty. in Box, Total Qty, Received Qty, QC Check, Remarks, Action

---

## New Form Design

### Header Section
- Doc No (auto-generated)
- Date
- From Dept
- To Dept
- Date / Time

Note: Remove Transfer No. field - Doc No. is sufficient.

### New Table Columns

| Column | Type | Source/Calculation |
|--------|------|-------------------|
| SL | Auto-increment | 1, 2, 3... |
| FG Code | Dropdown with modal | FG BOM Master + LOCAL BOM Master |
| Party | Auto-fill (readonly) | From selected FG BOM party_name |
| Color | Dropdown | From color_label_master |
| Qty (in boxes) | Number input | User enters |
| Total Qty (pcs) | Auto-calculated (readonly) | pack_size × qty_in_boxes |
| Total Qty (ton) | Auto-calculated (readonly) | See formula below |
| QC Check | Checkbox | User checks |
| Remarks | Text input | User enters |
| Action | Delete button | Remove row |

---

## FG Code Dropdown - Modal Design

When user clicks on FG Code field, open a modal with:

### Modal Header
- Title: "Select Finished Good"
- Close button (X)

### Modal Filters
- Search box: Search by FG code or item name
- BOM Type toggle: "FG" | "LOCAL" | "All"
- Party filter dropdown: Filter by party name

### Modal Table Columns
- FG Code
- Item Name
- Party Name
- Pack Size
- SFG-1
- SFG-2

### Modal Behavior
- Show all FG items from fg_bom and local_bom tables
- Clicking a row selects it and closes modal
- Selected FG Code populates the table row
- Party auto-fills from selected BOM record

---

## Formulas

### Total Qty (pcs)
Total Qty (pcs) = pack_size × qty_in_boxes

Example: Pack size 1000 × 100 boxes = 100,000 pcs

### Total Qty (ton)
Need to lookup INT. WT from Mold Master for each SFG component.

**Lookup Chain:**
1. FG Code → FG BOM → Get SFG-1 code and SFG-1 qty
2. FG Code → FG BOM → Get SFG-2 code and SFG-2 qty
3. SFG-1 code → SFG BOM → Get item_name (mold name)
4. Mold name → Mold Master → Get int_wt (grams)
5. Repeat for SFG-2

**Formula:**
Total Qty (ton) = ((SFG1_qty × SFG1_int_wt) + (SFG2_qty × SFG2_int_wt)) × qty_in_boxes / 1,000,000

Example:
- SFG-1: 1000 pcs × 9.8g = 9,800g per box
- SFG-2: 1000 pcs × 8.4g = 8,400g per box
- Per box total: 18,200g = 18.2 kg
- 100 boxes: 18.2 × 100 = 1,820 kg = 1.82 ton

---

## Stock Posting Logic

When user clicks "Post to Stock" button:

### Validations Before Posting
1. All rows must have FG Code selected
2. All rows must have Color selected
3. All rows must have Qty (in boxes) greater than 0
4. Check SFG-1 stock availability in FG_STORE
5. Check SFG-2 stock availability in FG_STORE
6. Check Carton stock availability in STORE
7. Check Polybag stock availability in STORE
8. Check BOPP stock availability in STORE
9. If any component insufficient, show error with details and reject posting

### Stock Deductions (for each row)

**From FG_STORE (Semi-Finished Goods):**
| Item | Formula |
|------|---------|
| SFG-1 | sfg1_qty × qty_in_boxes |
| SFG-2 | sfg2_qty × qty_in_boxes |

**From STORE (Packing Materials):**
| Item | Formula |
|------|---------|
| Carton | cnt_qty × qty_in_boxes |
| Polybag | poly_qty × qty_in_boxes |
| BOPP-1 | bopp1_qty_per_meter × qty_in_boxes |
| BOPP-2 (if exists) | bopp2_qty_per_meter × qty_in_boxes |

### Stock Addition

**To FG_STORE (Finished Goods):**
| Item | Formula |
|------|---------|
| FG (by FG Code + Color) | pack_size × qty_in_boxes |

---

## Example Scenario

**User enters:**
- FG Code: 310110101001 (RP-Ro10-Gm)
- Color: Red
- Qty (boxes): 100

**BOM lookup returns:**
- Pack Size: 1000
- SFG-1: 110110001, Qty: 1000
- SFG-2: 110410001, Qty: 1000
- Carton: CTN-Ro10-Gm, Qty: 1
- Polybag: Poly-8.5x18, Qty: 40
- BOPP-1: Bopp-65mm, Qty: 1.50 meters

**Mold Master lookup returns:**
- SFG 110110001 → Mold RPRo10-C → INT. WT: 9.8g
- SFG 110410001 → Mold RPRo10-12-L → INT. WT: 8.4g

**Auto-calculations:**
- Total Qty (pcs) = 1000 × 100 = 100,000 pcs
- Total Qty (ton) = ((1000 × 9.8) + (1000 × 8.4)) × 100 / 1,000,000 = 1.82 ton

**Stock movements on posting:**

Deductions:
- SFG 110110001: -100,000 pcs from FG_STORE
- SFG 110410001: -100,000 pcs from FG_STORE
- CTN-Ro10-Gm: -100 pcs from STORE
- Poly-8.5x18: -4,000 pcs from STORE
- Bopp-65mm: -150 meters from STORE

Addition:
- FG 310110101001 (Red): +100,000 pcs to FG_STORE

---

## Database Tables Involved

### Read From:
- fg_bom (FG BOM Master) - FG codes, party, pack size, SFG codes, PM codes
- local_bom (LOCAL BOM Master) - Same structure as fg_bom
- sfg_bom (SFG BOM Master) - SFG code to mold name mapping
- mold_master - Mold name to INT. WT mapping
- color_label_master - Color options
- party_master - Party names (if separate from BOM)

### Write To:
- production_fg_transfer_note (header) - doc_no, date, from_dept, to_dept, shift_incharge, qc_inspector, fg_received_by, stock_status, posted_at, posted_by, created_at, updated_at
- production_fg_transfer_note_items (line items) - transfer_note_id, sl_no, fg_code, bom_type, party, color, qty_boxes, pack_size, total_qty_pcs, total_qty_ton, sfg1_code, sfg1_qty, sfg2_code, sfg2_qty, qc_check, remarks
- stock_ledger - Stock movements for SFG, PM, FG
- stock_balances - Updated balances

### New Table Schema: production_fg_transfer_note

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| doc_no | VARCHAR | Auto-generated document number |
| date | DATE | Transfer date |
| from_dept | VARCHAR | Source department |
| to_dept | VARCHAR | Destination department |
| shift_incharge | VARCHAR | Shift incharge name |
| qc_inspector | VARCHAR | QC inspector name |
| fg_received_by | VARCHAR | FG receiver name |
| stock_status | VARCHAR | DRAFT / POSTED / CANCELLED |
| posted_at | TIMESTAMP | When posted to stock |
| posted_by | VARCHAR | Who posted |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### New Table Schema: production_fg_transfer_note_items

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| transfer_note_id | UUID | FK to production_fg_transfer_note |
| sl_no | INTEGER | Serial number |
| fg_code | VARCHAR | Selected FG code |
| bom_type | VARCHAR | FG or LOCAL |
| party | VARCHAR | selected Party name |
| color | VARCHAR | Selected color |
| qty_boxes | INTEGER | Number of boxes |
| pack_size | INTEGER | Pack size from BOM |
| total_qty_pcs | INTEGER | Calculated: pack_size × qty_boxes |
| total_qty_ton | DECIMAL | Calculated weight in tons |
| sfg1_code | VARCHAR | SFG-1 code from BOM |
| sfg1_qty | INTEGER | SFG-1 qty per box from BOM |
| sfg1_deduct | INTEGER | Calculated: sfg1_qty × qty_boxes |
| sfg2_code | VARCHAR | SFG-2 code from BOM |
| sfg2_qty | INTEGER | SFG-2 qty per box from BOM |
| sfg2_deduct | INTEGER | Calculated: sfg2_qty × qty_boxes |
| cnt_code | VARCHAR | Carton code from BOM |
| cnt_qty | INTEGER | Carton qty per box |
| cnt_deduct | INTEGER | Calculated deduction |
| polybag_code | VARCHAR | Polybag code from BOM |
| polybag_qty | INTEGER | Polybag qty per box |
| polybag_deduct | INTEGER | Calculated deduction |
| bopp1_code | VARCHAR | BOPP-1 code from BOM |
| bopp1_qty | DECIMAL | BOPP-1 meters per box |
| bopp1_deduct | DECIMAL | Calculated deduction |
| bopp2_code | VARCHAR | BOPP-2 code (if any) |
| bopp2_qty | DECIMAL | BOPP-2 meters per box |
| bopp2_deduct | DECIMAL | Calculated deduction |
| qc_check | BOOLEAN | QC passed or not |
| remarks | TEXT | Optional remarks |
| created_at | TIMESTAMP | Record creation time |

---

## UI/UX Requirements

### FG Code Modal
- Should be searchable
- Should support filtering by BOM type (FG/LOCAL)
- Should support filtering by party
- Should show pack size and SFG details for reference
- Should highlight selected row
- Should close on selection or clicking outside

### Color Dropdown
- Simple dropdown from color_label_master
- Show color name
- Optionally show color swatch/preview

### Qty (in boxes) Field
- Number input with validation (positive integers only)
- On change, trigger recalculation of Total Qty (pcs) and Total Qty (ton)

### Calculated Fields
- Should be readonly (greyed out background)
- Should update instantly when qty changes
- Should show appropriate decimal places (pcs: 0 decimals, ton: 2 decimals)

### Add Row Button
- Adds new empty row at bottom
- Auto-increments SL number

### Action Column
- Delete button to remove row
- Confirm before delete if row has data

---

## Buttons at Bottom

| Button | Action |
|--------|--------|
| Print | Print the transfer note |
| Save | Save as draft (no stock movement) |
| Post to Stock | Validate and create stock movements |

---

## Stock Status Field

The production_fg_transfer_note table includes stock_status field:
- DRAFT: Saved but not posted
- POSTED: Stock movements created
- CANCELLED: Reversed

Also includes posted_at and posted_by fields to track when and who posted.

---

## Summary of Changes

| Area | Change |
|------|--------|
| Table columns | Replace old columns with: SL, FG Code, Party, Color, Qty (boxes), Total Qty (pcs), Total Qty (ton), QC Check, Remarks, Action |
| FG Code selection | Add modal with search and filters instead of simple dropdown |
| Party field | fetched from party master  |
| Color field | New dropdown from color_label_master |
| Calculations | Add Total Qty (pcs) and Total Qty (ton) auto-calculations |
| Stock posting | Deduct SFG from FG_STORE, deduct PM from STORE, add FG to FG_STORE |
| Validation | Check all component availability before posting |

---

## Testing Checklist

- [ ] FG Code modal opens on click
- [ ] Modal search filters FG codes correctly
- [ ] Modal BOM type filter works (FG/LOCAL/All)
- [ ] Selecting FG Code populates row 
        Party should be fetch from partymaster 
- [ ] Color dropdown shows all colors from color_label_master
- [ ] Qty (boxes) input accepts only positive numbers
- [ ] Total Qty (pcs) calculates correctly: pack_size × boxes
- [ ] Total Qty (ton) calculates correctly using INT. WT from Mold Master
- [ ] Add Row adds new row with incremented SL
- [ ] Delete row removes row and reorders SL numbers
- [ ] Save creates draft record without stock movement
- [ ] Post to Stock validates component availability
- [ ] Post to Stock shows error if any component insufficient
- [ ] Post to Stock creates correct deduction entries for SFG-1, SFG-2
- [ ] Post to Stock creates correct deduction entries for Carton, Polybag, BOPP
- [ ] Post to Stock creates correct addition entry for FG
- [ ] Same FG Code with different colors creates separate entries
- [ ] Print generates correct document