# STOCK LEDGER SYSTEM - COMPLETE SPECIFICATION

## CRITICAL INSTRUCTIONS FOR CURSOR

1. This document contains NO code on purpose
2. DO NOT overwrite any existing forms, pages, or components
3. DO NOT change any existing table structures except adding the three status fields mentioned
4. Use the existing database query patterns already in the codebase - DO NOT introduce Prisma or any new ORM
5. Create NEW files for stock ledger functionality
6. Read this entire document before starting implementation

---

# SECTION 1: WHAT WE ARE BUILDING

## Purpose

A stock ledger system that tracks every inventory movement in the factory. When materials come in, move between locations, get consumed in production, or go out to customers - every movement is recorded in an immutable ledger.

## Core Rules

1. Stock only changes through documents. No direct editing of stock quantities.
2. Ledger entries are permanent. Never delete them. To fix mistakes, create reversal entries.
3. Every entry must record: what item, which location, how much, which document caused it, who posted it, when.
4. Same document cannot post twice. System must check and reject duplicates.
5. Negative stock is allowed but system should log a warning.
6. Backdated entries are allowed.

---

# SECTION 2: STOCK LOCATIONS

There are exactly three locations where stock can exist:

**Location 1: STORE**
- This is the main warehouse/godown
- Stores: Raw materials (PP pellets), Packing materials (boxes, polybags, BOPP tape), Masterbatch, Regrind, Labels
- Materials enter here via GRN from suppliers
- Materials leave here via MIS to production or via FG Transfer for packing

**Location 2: PRODUCTION**
- This is the production floor where machines are
- Stores: Raw materials that have been issued from store
- Materials enter here via MIS from store
- Materials get consumed here when DPR is posted (converted to finished parts)

**Location 3: FG_STORE**
- This is the finished goods warehouse
- Stores: Semi-finished goods (molded parts) and Finished goods (packed boxes)
- SFG enters here when DPR is posted
- FG enters here when FG Transfer is posted
- FG leaves here when Dispatch is posted

---

# SECTION 3: TYPES OF ITEMS

## 3.1 Raw Materials (RM)

What they are: Plastic pellets used in injection molding machines

Item code format: PP-{TYPE}-{GRADE}
- PP-HP-HJ333MO (Homopolymer grade HJ333MO)
- PP-ICP-BJ368MO (Impact Copolymer grade BJ368MO)
- PP-RCP-RJ768MO (Random Copolymer grade RJ768MO)

Types:
- HP = Homopolymer
- ICP = Impact Copolymer
- RCP = Random Copolymer
- LDPE = Low Density Polyethylene
- GPPS = General Purpose Polystyrene

Special RM items:
- REGRIND = Recycled material from rejected production
- MB-BLACK = Black masterbatch for coloring
- MB-WHITE = White masterbatch
- LABEL-IML-xxx = Labels for in-mold labeling products

Unit of measure: KG (kilograms)

---

## 3.2 Packing Materials (PM)

What they are: Materials used to pack finished products

Categories:

Boxes/Cartons:
- Item codes like CTN-Ro10-Ex, CTN-Ro10-Gm, CTN-Ro12-Ex
- Unit: NOS (numbers/pieces)

Polybags:
- Item codes like Poly-8.5x18, Poly-10.5x18, Poly-12.5x18
- Unit: NOS (numbers/pieces)

BOPP Tape:
- Item codes like Bopp-24mm, Bopp-65mm
- Unit: METERS

---

## 3.3 Semi-Finished Goods (SFG)

What they are: Molded plastic parts before packing (containers, lids)

Item code format: 9-digit numeric codes
- 110110001, 110210001, 110310001, etc.

Examples:
- 110110001 = Container from mold RPRo10-C
- 110410001 = Lid from mold RPRo10-12-L
- 110510001 = Container from mold RPRo16-C

Unit of measure: NOS (pieces)

IMPORTANT: The SFG code is found by looking up the mold name in the sfg_bom table. The item_name column in sfg_bom contains the mold name, and sfg_code column contains the SFG code.

---

## 3.4 Finished Goods (FG)

What they are: Packed boxes ready for dispatch to customers

Item code format: 11-digit numeric codes with meaning:
- Position 1: 2 = Export, 3 = Local
- Position 2-4: Item identifier
- Position 5-6: 10 = RP, 20 = CK
- Position 7-8: 10 = Non-IML, 20 = IML (requires label)
- Position 9-11: BOM number

Examples:
- 210110101001 = Export, non-IML product
- 210110102001 = Export, IML product (needs label tracking)
- 310110101001 = Local, non-IML product

Unit of measure: NOS (boxes)

IML Detection: If positions 7-8 of the FG code equal "20", this is an IML product and requires label consumption during packing.

---

# SECTION 4: DOCUMENT TYPES AND THEIR STOCK EFFECTS

## 4.1 GRN (Goods Receipt Note)

What it does: Records materials received from suppliers

Stock effect: Adds items to STORE location

Fields needed for stock posting:
- grn_date: Use as the transaction date in ledger
- grn_no: Use as document number in ledger
- From items table: description (item name), grn_qty (quantity received)

How to post:
1. Check if this GRN exists
2. Check if stock_status is DRAFT. If already POSTED, reject with error.
3. For each item in the GRN items:
   - Find the matching stock item by mapping the description to item_code
   - Get the current balance of this item at STORE location
   - Calculate new balance by adding grn_qty to current balance
   - Create a ledger entry with movement type IN at STORE
   - Update the balance cache for this item at STORE
4. Change the GRN stock_status to POSTED
5. Record who posted it and when

---

## 4.2 JW GRN (Job Work Annexure GRN)

What it does: Records materials received from job work partners

Stock effect: Same as GRN - adds items to STORE location

Posting logic: Identical to GRN, just uses different source tables

---

## 4.3 MIS (Material Issue Slip)

What it does: Issues raw materials from store to production floor

Stock effect: 
- Removes items from STORE location (OUT movement)
- Adds same items to PRODUCTION location (IN movement)

Fields needed for stock posting:
- date: Transaction date
- issue_no: Document number
- From items table: item_code, issue_qty

How to post:
1. Check if MIS exists and stock_status is DRAFT
2. For each item in MIS items:
   - Find the matching stock item
   - Get current balance at STORE
   - If balance is less than issue_qty, log a WARNING but continue (negative stock allowed)
   - Calculate new STORE balance = current balance minus issue_qty
   - Create ledger entry at STORE with movement type OUT, note that counterpart location is PRODUCTION
   - Update STORE balance cache
   - Get current balance at PRODUCTION
   - Calculate new PRODUCTION balance = current balance plus issue_qty
   - Create ledger entry at PRODUCTION with movement type IN, note that counterpart location is STORE
   - Update PRODUCTION balance cache
3. Change MIS stock_status to POSTED

---

## 4.4 DPR (Daily Production Report) - MOST COMPLEX

This is the most complex document. Read this section carefully.

### What DPR Does

Records daily production from all machines. When posted to stock:
- Consumes raw materials from PRODUCTION location
- Creates semi-finished goods in FG_STORE location
- Creates regrind from rejected material back to STORE location

### DPR Data Structure

**Header Table (dpr_data) Fields:**
- id: Unique identifier for this DPR
- date: Production date (use as transaction date)
- shift: Either "DAY" or "NIGHT"
- shift_incharge: Name of supervisor
- stock_status: To be added - DRAFT, POSTED, or CANCELLED
- posted_to_stock_at: To be added - timestamp
- posted_to_stock_by: To be added - user ID

**Production Entries Table (dpr_production_entries) - TO BE CREATED**

This table stores production data for each machine. Each row represents one machine's production for the shift.

Fields to create:

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| id | Integer, auto-increment | Primary key |
| dpr_id | Integer | Foreign key linking to dpr_data |
| machine_no | Text | Machine number (M/c No.) |
| operator_name | Text | Operator name (Opt Name) |
| product | Text | **MOLD NAME - CRITICAL FOR SFG LOOKUP** |
| cavity | Integer | Number of cavities |
| trg_cycle | Decimal | Target cycle time in seconds |
| trg_run_time | Decimal | Target run time in minutes |
| part_wt | Decimal | Target part weight in grams |
| act_part_wt | Decimal | Actual part weight in grams |
| act_cycle | Decimal | Actual cycle time in seconds |
| part_wt_check | Text | OK or NOT OK |
| cycle_time_check | Text | OK or NOT OK |
| shots_start | Integer | Starting shot count |
| shots_end | Integer | Ending shot count |
| target_qty | Integer | Target quantity in pieces |
| actual_qty | Integer | Actual quantity in pieces |
| ok_prod_qty | Integer | **Good production quantity in pieces - USED FOR SFG** |
| ok_prod_kgs | Decimal | **Good production weight in kg - USED FOR RM CONSUMPTION** |
| ok_prod_percent | Decimal | OK production percentage |
| rej_kgs | Decimal | **Rejected weight in kg - USED FOR RM CONSUMPTION AND REGRIND** |
| lumps_kgs | Decimal | Lumps weight in kg (informational only, not used for stock) |
| run_time | Decimal | Actual run time in minutes |
| down_time | Decimal | Downtime in minutes |
| stoppage_reason | Text | Reason for any stoppage |
| stoppage_start | Time | When stoppage started |
| stoppage_end | Time | When stoppage ended |
| stoppage_total | Decimal | Total stoppage time in minutes |
| mould_change | Text | Mould change information |
| remarks | Text | Additional remarks |
| is_changeover | Boolean | True if this is a changeover entry, False if current production |

### Current Production vs Changeover

Each machine can have TWO production entries in the same shift:
1. Current Production: The main product being made
2. Changeover: A different product made during the same shift (optional)

If is_changeover is true, it means this entry is for the changeover product.
Both entries are processed the same way for stock - the product field will map to different SFG codes.

### THE CRITICAL MAPPING: Product Field to SFG Code

The "product" field in DPR entries contains the MOLD NAME (like "RPRo10-12-L").

To find the SFG code:
1. Look in the sfg_bom table
2. Find the row where item_name equals the product value
3. The sfg_code column in that row is the SFG item code

Example:
- DPR entry has product = "RPRo10-12-L"
- Find row in sfg_bom where item_name = "RPRo10-12-L"
- That row has sfg_code = "110410001"
- So SFG item 110410001 should be added to stock

If no matching row is found in sfg_bom, the posting must FAIL with an error message saying which mold name has no BOM mapping.

### BOM Percentages for RM Consumption

The sfg_bom table also contains the raw material composition percentages:
- hp_percent: Percentage of HP type raw material
- icp_percent: Percentage of ICP type raw material
- rcp_percent: Percentage of RCP type raw material
- ldpe_percent: Percentage of LDPE type raw material
- gpps_percent: Percentage of GPPS type raw material
- mb_percent: Percentage of Masterbatch

These percentages should add up to 100.

Example from sfg_bom:
- RPRo10-C (SFG 110110001): HP 79%, ICP 20%, MB 1%
- RPRo10-12-L (SFG 110410001): HP 75%, ICP 12.5%, RCP 12.5%

### DPR Stock Effects - Three Things Happen

**Effect 1: Consume Raw Materials from PRODUCTION**

Total weight consumed = ok_prod_kgs PLUS rej_kgs

Both good production and rejected production used raw material, so both must be counted in consumption.

For each RM type with percentage greater than zero:
- Calculate consumption = total weight multiplied by (percentage divided by 100)
- Deduct this amount from PRODUCTION location
- Use FIFO: deduct from oldest stock first (based on which MIS brought it in)

Example calculation:
- ok_prod_kgs = 144.46, rej_kgs = 117.62
- Total consumption = 262.08 kg
- BOM says: HP 75%, ICP 12.5%, RCP 12.5%
- HP consumed = 262.08 × 0.75 = 196.56 kg
- ICP consumed = 262.08 × 0.125 = 32.76 kg
- RCP consumed = 262.08 × 0.125 = 32.76 kg

**Effect 2: Add SFG to FG_STORE**

- Use the SFG code from the mold lookup
- Quantity = ok_prod_qty (only good pieces, not rejected)
- Create IN ledger entry at FG_STORE

**Effect 3: Create Regrind from Rejected**

- 100% of rejected material becomes regrind
- Quantity = rej_kgs
- Item code = "REGRIND"
- Create IN ledger entry at STORE location (regrind goes back to store for reuse)

### DPR Posting Step by Step

1. Get the DPR by its ID
2. Check that stock_status is DRAFT. If POSTED, reject with error.
3. Get all production entries for this DPR (both current production and changeover entries)
4. Create a temporary collection to aggregate production by SFG code
5. For each production entry:
   - Look up sfg_bom where item_name equals the product field
   - If not found, STOP and return error "No BOM mapping found for mold: {product}"
   - Get the sfg_code from the lookup result
   - Add this entry's ok_prod_qty to the total pieces for this SFG
   - Add this entry's ok_prod_kgs to the total good kg for this SFG
   - Add this entry's rej_kgs to the total rejected kg for this SFG
   - Store the BOM percentages for this SFG
6. For each unique SFG code in the collection:
   - Calculate total consumption = total good kg plus total rejected kg
   - For each RM type (HP, ICP, RCP, LDPE, GPPS, MB):
     - If percentage greater than zero:
       - Calculate kg to consume = total consumption multiplied by percentage divided by 100
       - Find RM items of this type in PRODUCTION location
       - Deduct the required kg using FIFO (oldest first)
       - Create OUT ledger entries
       - Update balance caches
       - If not enough stock, log WARNING but continue (will go negative)
   - Create IN ledger entry for SFG at FG_STORE with quantity = total pieces
   - Update SFG balance cache
   - If total rejected kg greater than zero:
     - Get or create the REGRIND item in stock_items
     - Create IN ledger entry for REGRIND at STORE with quantity = total rejected kg
     - Update REGRIND balance cache
7. Update DPR stock_status to POSTED
8. Record posted_to_stock_at and posted_to_stock_by

---

## 4.5 FG Transfer Note

What it does: Packs SFG (molded parts) into FG (finished boxes)

Stock effects:
- Removes SFG items from FG_STORE (containers and lids consumed)
- Removes PM items from STORE (boxes, polybags, BOPP consumed)
- Removes Labels from STORE (if IML product)
- Adds FG items to FG_STORE (packed boxes created)

### FG BOM Lookup

The fg_bom table tells us what components make up each FG:

| Field | What it is |
|-------|------------|
| item_code | The FG item code being created |
| item_name | Name of the FG |
| pack_size | How many pieces per box |
| sfg_1 | First SFG code (usually container) |
| sfg_1_qty | How many of sfg_1 per box |
| sfg_2 | Second SFG code (usually lid) - can be empty |
| sfg_2_qty | How many of sfg_2 per box |
| cnt_code | Carton box code |
| cnt_qty | Cartons per box (usually 1) |
| polybag_code | Polybag code |
| poly_qty | Polybags per box |
| bopp_1 | First BOPP tape code |
| qty_meter_1 | Meters of bopp_1 per box |
| bopp_2 | Second BOPP tape code - can be empty |
| qty_meter_2 | Meters of bopp_2 per box |

### IML Label Handling

If the FG code has "20" in positions 7-8, it is an IML product.

IML products require labels to be consumed during packing.

Configuration needed (to be filled in later):
- How to determine which label item code to use
- How many labels per box or per piece

For now, create a placeholder configuration that can be updated later.

### QC Hold Status

The FG Transfer form has a QC check field.

If QC fails:
- Still add the FG to stock
- But include "QC_HOLD" in the remarks of the ledger entry
- This is just a flag, not a separate location

### Partial Packing NOT Allowed

Before posting, check that ALL components are available:
- All required SFG pieces in FG_STORE
- All required cartons in STORE
- All required polybags in STORE
- All required BOPP meters in STORE
- All required labels in STORE (if IML)

If ANY component is short, REJECT the entire posting. Return a detailed error saying which component is short, how much is available, and how much is needed.

### FG Transfer Posting Step by Step

1. Get the FG Transfer by its ID
2. Check stock_status is DRAFT
3. For each line item in the transfer:
   - Get the number of boxes being packed
   - Look up fg_bom to find all component requirements
   - Calculate total requirement for each component (multiply by number of boxes)
   - Check if FG code indicates IML (positions 7-8 = "20"), add label requirement if so
   - Validate ALL components are available:
     - Check sfg_1 quantity at FG_STORE
     - Check sfg_2 quantity at FG_STORE (if not empty)
     - Check carton quantity at STORE
     - Check polybag quantity at STORE
     - Check bopp_1 meters at STORE
     - Check bopp_2 meters at STORE (if not empty)
     - Check label quantity at STORE (if IML)
   - If any component short, STOP and return detailed error
   - Create OUT ledger entries for all components from their respective locations
   - Update all component balance caches
   - Create IN ledger entry for FG at FG_STORE
   - Update FG balance cache
4. Update FG Transfer stock_status to POSTED

---

## 4.6 Dispatch / Delivery Challan

What it does: Records shipment of finished goods to customers

Stock effect: Removes FG from FG_STORE

Fields needed:
- dc_date: Transaction date
- dc_no: Document number
- party_name: Customer name (for remarks)
- From items: item_code (FG code), no_of_pcs (this is actually boxes, not pieces)

How to post:
1. Check dispatch exists and stock_status is DRAFT
2. For each item:
   - Find the stock item
   - Get current balance at FG_STORE
   - If balance less than quantity, log WARNING (negative allowed)
   - Calculate new balance = current minus quantity
   - Create OUT ledger entry at FG_STORE
   - Update balance cache
3. Update dispatch stock_status to POSTED

---

## 4.7 Customer Return (New Document Type)

What it does: Records goods returned by customers

Stock effect: Adds FG back to FG_STORE

New tables needed:
- customer_returns (header table)
- customer_return_items (line items table)

Header table fields:
- id: Primary key
- return_no: Unique document number
- return_date: Date of return
- party_name: Customer name
- original_dispatch_id: Optional link to original dispatch document
- reason: Why goods were returned
- status: DRAFT, POSTED, or CANCELLED
- created_by, created_at, posted_to_stock_at, posted_to_stock_by

Items table fields:
- id: Primary key
- return_id: Foreign key to header
- item_code: FG item code
- quantity: Number of boxes returned
- remarks: Any notes about this line item

How to post:
1. Check return exists and status is DRAFT
2. For each item:
   - Find the stock item
   - Get current balance at FG_STORE
   - Calculate new balance = current plus quantity
   - Create IN ledger entry at FG_STORE
   - Update balance cache
3. Update return status to POSTED

---

## 4.8 Stock Adjustment (New Document Type)

What it does: Adjusts stock for discrepancies, damages, or opening balances

Stock effect: Adds or removes stock at any location

Types of adjustments:
- INCREASE: Add stock (creates IN ledger entry)
- DECREASE: Remove stock (creates OUT ledger entry)
- OPENING: Initial stock when system goes live (creates IN ledger entry)

New tables needed:
- stock_adjustments (header table)
- stock_adjustment_items (line items table)

Header table fields:
- id: Primary key
- adjustment_no: Unique document number
- adjustment_date: Date
- adjustment_type: INCREASE, DECREASE, or OPENING
- reason: Why adjustment is needed
- status: DRAFT, POSTED, or CANCELLED
- created_by, created_at, posted_to_stock_at, posted_to_stock_by

Items table fields:
- id: Primary key
- adjustment_id: Foreign key to header
- item_code: Stock item code
- location_code: Which location to adjust (STORE, PRODUCTION, or FG_STORE)
- quantity: Amount to adjust (always positive)
- remarks: Notes

How to post:
1. Check adjustment exists and status is DRAFT
2. For each item:
   - Find the stock item
   - Get current balance at specified location
   - If type is INCREASE or OPENING:
     - New balance = current plus quantity
     - Movement type = IN
   - If type is DECREASE:
     - New balance = current minus quantity
     - Movement type = OUT
   - Create ledger entry
   - Update balance cache
3. Update adjustment status to POSTED

---

# SECTION 5: NEW DATABASE TABLES TO CREATE

## 5.1 stock_items

Purpose: Master list of all trackable items

Fields:
- id: Auto-increment integer, primary key
- item_code: Text, unique, not null - The unique identifier for this item
- item_name: Text, not null - Human readable name
- item_type: Text, not null - Must be one of: RM, PM, SFG, FG
- category: Text - Grouping like PP, MB, REGRIND, LABEL, BOPP, Boxes, Polybags
- sub_category: Text - Sub-grouping like HP, ICP, RCP for PP items
- unit_of_measure: Text, not null - KG, NOS, or METERS
- is_active: Boolean, default true
- created_at: Timestamp, default now
- updated_at: Timestamp, default now

Unique constraint on item_code

Create indexes on: item_type, item_code, category

---

## 5.2 stock_locations

Purpose: Reference table for valid stock locations

Fields:
- id: Auto-increment integer, primary key
- location_code: Text, unique, not null
- location_name: Text, not null
- location_type: Text - WAREHOUSE or PRODUCTION
- is_active: Boolean, default true

Seed with three rows:
1. STORE, Main Store, WAREHOUSE
2. PRODUCTION, Production Floor, PRODUCTION
3. FG_STORE, Finished Goods Store, WAREHOUSE

---

## 5.3 stock_ledger

Purpose: Immutable log of all stock movements - the core of the system

Fields:
- id: Auto-increment big integer, primary key
- item_id: Integer, foreign key to stock_items, not null
- item_code: Text, not null - Denormalized for quick queries
- location_code: Text, not null - Where the movement happened
- quantity: Decimal with 4 decimal places, not null - Positive for IN, negative for OUT
- unit_of_measure: Text, not null
- balance_after: Decimal with 4 decimal places, not null - Running balance after this entry
- transaction_date: Date, not null - Date from the source document
- transaction_timestamp: Timestamp, default now - When entry was created
- document_type: Text, not null - GRN, MIS, DPR, etc.
- document_id: Integer, not null - ID of source document
- document_number: Text - Human readable document number
- movement_type: Text, not null - Must be IN or OUT
- counterpart_location: Text - For transfers, the other location
- posted_by: Text - User who posted
- posted_at: Timestamp, default now
- remarks: Text - Any notes

Unique constraint on combination of: document_type, document_id, item_code, location_code, movement_type
This prevents posting the same document twice.

Create indexes on:
- item_code and location_code together
- document_type and document_id together
- transaction_date
- item_code and transaction_date together

---

## 5.4 stock_balances

Purpose: Cache of current balances for quick lookup

Fields:
- id: Auto-increment integer, primary key
- item_id: Integer, foreign key to stock_items, not null
- item_code: Text, not null
- location_code: Text, not null
- current_balance: Decimal with 4 decimal places, not null, default 0
- unit_of_measure: Text, not null
- last_updated: Timestamp, default now

Unique constraint on: item_code and location_code together

Create indexes on: location_code, item_code

---

## 5.5 stock_item_mappings

Purpose: Maps document descriptions to stock item codes when they don't match exactly

Fields:
- id: Auto-increment integer, primary key
- source_table: Text, not null - Which document type (grn, mis, dispatch)
- source_description: Text, not null - The description used in the document
- stock_item_code: Text, not null - The matching stock item code
- is_active: Boolean, default true
- created_at: Timestamp, default now

Unique constraint on: source_table and source_description together

---

## 5.6 dpr_production_entries (if not exists)

Purpose: Stores production data from DPR for each machine

See Section 4.4 for complete field list.

This table links to dpr_data via dpr_id foreign key.

---

## 5.7 stock_adjustments

Purpose: Header for stock adjustment documents

Fields:
- id: Auto-increment integer, primary key
- adjustment_no: Text, unique, not null
- adjustment_date: Date, not null
- adjustment_type: Text, not null - Must be INCREASE, DECREASE, or OPENING
- reason: Text
- status: Text, default DRAFT - Must be DRAFT, POSTED, or CANCELLED
- created_by: Text
- created_at: Timestamp, default now
- posted_to_stock_at: Timestamp
- posted_to_stock_by: Text

---

## 5.8 stock_adjustment_items

Purpose: Line items for stock adjustments

Fields:
- id: Auto-increment integer, primary key
- adjustment_id: Integer, foreign key to stock_adjustments, not null
- item_code: Text, not null
- location_code: Text, not null
- quantity: Decimal, not null
- unit_of_measure: Text, not null
- remarks: Text

---

## 5.9 customer_returns

Purpose: Header for customer return documents

Fields:
- id: Auto-increment integer, primary key
- return_no: Text, unique, not null
- return_date: Date, not null
- party_name: Text
- original_dispatch_id: Integer - Optional link to dispatch
- reason: Text
- status: Text, default DRAFT - Must be DRAFT, POSTED, or CANCELLED
- created_by: Text
- created_at: Timestamp, default now
- posted_to_stock_at: Timestamp
- posted_to_stock_by: Text

---

## 5.10 customer_return_items

Purpose: Line items for customer returns

Fields:
- id: Auto-increment integer, primary key
- return_id: Integer, foreign key to customer_returns, not null
- item_code: Text, not null
- quantity: Decimal, not null
- unit_of_measure: Text, default NOS
- remarks: Text

---

# SECTION 6: FIELDS TO ADD TO EXISTING TABLES

Add these THREE fields to each of these existing tables:
- store_grn
- store_jw_annexure_grn
- store_mis
- store_fgn
- dispatch_memos (or whatever the dispatch table is called)
- dpr_data

Fields to add:
1. stock_status: Text, default 'DRAFT', allowed values: DRAFT, POSTED, CANCELLED
2. posted_to_stock_at: Timestamp, nullable
3. posted_to_stock_by: Text, nullable

Also add to store_fgn_items (FG Transfer line items):
- qc_status: Text, default 'PASSED', allowed values: PASSED, QC_HOLD

---

# SECTION 7: API ENDPOINTS TO CREATE

## Posting Endpoints

Create POST endpoints for posting each document type to stock:

- POST /api/stock/post/grn/{id}
- POST /api/stock/post/jw-grn/{id}
- POST /api/stock/post/mis/{id}
- POST /api/stock/post/dpr/{id}
- POST /api/stock/post/fg-transfer/{id}
- POST /api/stock/post/dispatch/{id}
- POST /api/stock/post/customer-return/{id}
- POST /api/stock/post/adjustment/{id}

Each endpoint should:
- Accept the document ID as a URL parameter
- Get the user ID from the session/auth
- Call the appropriate posting logic
- Return success with details, or error with message

## Cancellation Endpoint

Create POST endpoint for cancelling posted documents:

- POST /api/stock/cancel/{documentType}/{id}

documentType can be: GRN, JW_GRN, MIS, DPR, FG_TRANSFER, DISPATCH, CUSTOMER_RETURN, ADJUSTMENT

This should:
- Find all ledger entries for this document
- Create reversal entries (opposite quantities)
- Update document status to CANCELLED

## Query Endpoints

Create GET endpoints for viewing stock data:

- GET /api/stock/balance
  - Query parameters: item_code (optional), location (optional), item_type (optional)
  - Returns current balances matching the filters

- GET /api/stock/ledger
  - Query parameters: item_code (optional), location (optional), document_type (optional), from (date, optional), to (date, optional)
  - Returns ledger entries matching the filters

---

# SECTION 8: CANCELLATION LOGIC

When a posted document needs to be cancelled:

1. Find all ledger entries where document_type equals the document type and document_id equals the document id
2. If no entries found, return error "Document was not posted to stock"
3. For each entry found:
   - Get current balance for this item at this location
   - Calculate reversal quantity as negative of the original quantity
   - Calculate new balance as current balance plus reversal quantity
   - Create a new ledger entry with:
     - Same item, same location
     - Quantity = reversal quantity
     - Document type = original type plus "_CANCEL" (like GRN_CANCEL)
     - Movement type = opposite of original (if original was IN, use OUT)
     - Remarks = "Reversal of {document type} #{document id}"
   - Update the balance cache
4. Update the document's stock_status to CANCELLED
5. Return success with count of reversed entries

---

# SECTION 9: HELPER FUNCTIONS NEEDED

Create these helper functions to be used by the posting logic:

## Get Balance

Input: item_code, location_code
Output: current balance as number

Look up the stock_balances table. If no record exists, return 0.

## Update Balance (Upsert)

Input: item details (id, code, unit), location_code, new_balance
Action: If balance record exists, update it. If not, create it.

## Create Ledger Entry

Input: All ledger entry fields
Action: Insert new row into stock_ledger table

## Map Item to Stock Item

Input: source_table name, description from document
Output: stock item record or null

First check stock_item_mappings for an explicit mapping.
If found, return the corresponding stock_items record.
If not found, try to find a direct match in stock_items by item_code or item_name.
If still not found, return null.

## Get or Create Regrind Item

Action: Check if item with code "REGRIND" exists in stock_items.
If not, create it with type RM, category REGRIND, unit KG.
Return the item record.

## Consume RM using FIFO

Input: RM category, RM sub_category (optional), required quantity, location
Action: 
- Find all RM items matching the category and sub_category
- For each item, check balance at the location
- Deduct from items that have stock, oldest first
- Create OUT ledger entries for each deduction
- If total available is less than required, make one item go negative (with warning)
- Update balance caches

## Check if IML Product

Input: FG item code
Output: true or false

Check if characters at positions 7-8 (0-indexed: positions 6-7) equal "20".
If yes, return true. Otherwise return false.

## Get IML Label Requirement

Input: FG item code, number of boxes
Output: label requirement object with item_code, quantity, location, unit, name - or null if not IML

Check if FG is IML product.
If not, return null.
If yes, calculate label requirement based on configuration.
Return the requirement.

Note: The exact label configuration will be filled in later. For now, create a configurable placeholder.

---

# SECTION 10: SEED SCRIPT REQUIREMENTS

Create a script to populate the stock_items table from existing master tables:

## From raw_materials table:
- For each row, create stock item with:
  - item_code = "PP-" + type field + "-" + grade field
  - item_name = category + " " + type + " " + grade
  - item_type = "RM"
  - category = "PP"
  - sub_category = type field value
  - unit_of_measure = "KG"

## Special RM items to create:
- REGRIND: item_type RM, category REGRIND, unit KG
- MB-BLACK: item_type RM, category MB, unit KG
- LABEL-IML-001: item_type RM, category LABEL, unit NOS

## From packing_materials table:
- For each row, create stock item with:
  - item_code = item_code field value
  - item_name = item_code field value
  - item_type = "PM"
  - category = category field value
  - unit_of_measure = "METERS" if category is BOPP, otherwise "NOS"

## From sfg_bom table:
- For each row, create stock item with:
  - item_code = sfg_code field value
  - item_name = item_name field value (the mold name)
  - item_type = "SFG"
  - category = empty
  - unit_of_measure = "NOS"

## From fg_bom table:
- For each row, create stock item with:
  - item_code = item_code field value
  - item_name = item_name field value
  - item_type = "FG"
  - category = empty
  - unit_of_measure = "NOS"

---

# SECTION 11: CONFIGURATION PLACEHOLDERS

## IML Label Configuration

Create a configuration structure (can be a separate config file or database table) with these fields:

- enabled: Boolean - whether IML tracking is active (default false for now)
- detection_method: How to detect IML - "CODE_PATTERN" (check FG code positions)
- code_position: Which position in FG code to check (default 6, 0-indexed)
- code_length: How many characters (default 2)
- iml_value: What value indicates IML (default "20")
- label_unit: "PER_BOX" or "PER_PIECE"
- label_qty_per_unit: How many labels per box or per piece (default 1)
- default_label_code: Default label item code (default "LABEL-IML-001")

These values can be updated later when the information is available.

## Silo Configuration (Future Phase 2)

Create a placeholder configuration for future silo integration:

- enabled: Boolean (default false)
- silo_material_mapping: Object mapping silo codes to material types
- machine_silo_mapping: Object mapping machine numbers to silo codes

This is not implemented now, just a placeholder for future.

---

# SECTION 12: ERROR MESSAGES

Use these consistent error codes and messages:

| Situation | Error Code | Message |
|-----------|------------|---------|
| Document not found | DOCUMENT_NOT_FOUND | Document with ID {id} not found |
| Already posted | ALREADY_POSTED | Document has already been posted to stock |
| Cannot map item | MAPPING_FAILED | Cannot map item "{description}" to stock item |
| No BOM for mold | BOM_NOT_FOUND | No BOM mapping found for mold: {product} |
| No FG BOM | FG_BOM_NOT_FOUND | No FG BOM found for: {itemName} |
| Insufficient stock | INSUFFICIENT_STOCK | Insufficient {itemCode} at {location}. Available: {available}, Required: {required} |
| Stock item missing | STOCK_ITEM_NOT_FOUND | Stock item not found: {itemCode} |
| No RM of type | NO_RM_FOUND | No raw material found for type: {type} |
| Cannot cancel | NO_ENTRIES_FOUND | No ledger entries found for this document |
| Components short | PARTIAL_NOT_ALLOWED | Cannot complete FG Transfer - missing components: {list} |

For INSUFFICIENT_STOCK, this should be a WARNING, not an error. Log it but continue processing.

---

# SECTION 13: DOCUMENT TYPE CODES FOR LEDGER

Use these exact values for document_type in the stock_ledger table:

| Document | document_type | Cancel type |
|----------|---------------|-------------|
| GRN | GRN | GRN_CANCEL |
| JW GRN | JW_GRN | JW_GRN_CANCEL |
| MIS | MIS | MIS_CANCEL |
| DPR | DPR | DPR_CANCEL |
| FG Transfer | FG_TRANSFER | FG_TRANSFER_CANCEL |
| Dispatch | DISPATCH | DISPATCH_CANCEL |
| Customer Return | CUSTOMER_RETURN | CUSTOMER_RETURN_CANCEL |
| Stock Adjustment (increase/decrease) | ADJUSTMENT | ADJUSTMENT_CANCEL |
| Opening Balance | OPENING_BALANCE | OPENING_BALANCE_CANCEL |

---

# SECTION 14: FILE STRUCTURE

Create these new files/folders:

```
/src/lib/stock/
  - helpers.js (or .ts) - All helper functions
  - post-grn.js - GRN posting logic
  - post-jw-grn.js - JW GRN posting logic
  - post-mis.js - MIS posting logic
  - post-dpr.js - DPR posting logic
  - post-fg-transfer.js - FG Transfer posting logic
  - post-dispatch.js - Dispatch posting logic
  - post-customer-return.js - Customer Return posting logic
  - post-adjustment.js - Stock Adjustment posting logic
  - cancel.js - Cancellation logic
  - queries.js - Balance and ledger queries
  - config/
    - iml-config.js - IML label configuration
    - silo-config.js - Silo configuration placeholder

/src/app/api/stock/
  - post/
    - grn/[id]/route.js
    - jw-grn/[id]/route.js
    - mis/[id]/route.js
    - dpr/[id]/route.js
    - fg-transfer/[id]/route.js
    - dispatch/[id]/route.js
    - customer-return/[id]/route.js
    - adjustment/[id]/route.js
  - cancel/
    - [documentType]/[id]/route.js
  - balance/
    - route.js
  - ledger/
    - route.js

/scripts/
  - seed-stock-items.js - Script to populate stock_items
```

---

# SECTION 15: TESTING CHECKLIST

After implementation, verify each scenario works:

**GRN:**
- Posting GRN adds items to STORE
- Posting same GRN twice gives ALREADY_POSTED error
- Stock status changes to POSTED

**MIS:**
- Posting MIS removes from STORE and adds to PRODUCTION
- Both OUT and IN ledger entries are created
- Works even when stock goes negative (with warning)

**DPR:**
- Product field (mold name) correctly maps to SFG code via sfg_bom lookup
- Fails with clear error if mold not found in sfg_bom
- Consumes RM from PRODUCTION based on BOM percentages
- Total consumption = ok_prod_kgs + rej_kgs
- Handles multiple RM types correctly
- Adds SFG to FG_STORE (quantity = ok_prod_qty)
- Creates REGRIND in STORE (quantity = rej_kgs)
- Handles both current production and changeover entries
- Aggregates multiple entries for same SFG correctly

**FG Transfer:**
- Looks up FG BOM correctly
- Consumes all SFG from FG_STORE
- Consumes all PM from STORE
- Handles IML labels when configured
- Rejects if any component is short
- Creates FG in FG_STORE
- QC_HOLD status is recorded in remarks

**Dispatch:**
- Removes FG from FG_STORE
- Quantity is in boxes

**Customer Return:**
- Adds FG back to FG_STORE

**Stock Adjustment:**
- INCREASE adds stock correctly
- DECREASE removes stock correctly
- OPENING works for initial setup

**Cancellation:**
- Creates correct reversal entries
- Updates document status to CANCELLED

**Balance Cache:**
- Sum of ledger entries equals cached balance

---

END OF SPECIFICATION DOCUMENT