Stock Ledger and DPR Backend System
Architecture Overview
This system implements a double-entry stock ledger where every stock movement is document-driven, immutable, auditable, idempotent, and location-aware. The core principle is that stock can only move through documents - there are no manual stock adjustments except through dedicated adjustment documents. Every movement creates an immutable ledger entry that can never be deleted, only reversed through correction documents.

The system tracks stock across three physical locations: STORE (where raw materials and packing materials are received), PRODUCTION (where materials are consumed during manufacturing), and FG_STORE (where semi-finished goods and finished goods are stored).

Core Stock Ledger System
Stock Items Master Table
We need a master table that contains all items that can be tracked in stock. This includes Raw Materials (RM), Packing Materials (PM), Semi-Finished Goods (SFG), and Finished Goods (FG). Each item has a unique code, a name, a type classification, and a unit of measure (like kilograms, numbers, meters, etc.). This table will be populated by syncing data from existing master tables - raw materials from the raw_materials table, packing materials from packing_materials table, SFG codes from sfg_bom table, and FG codes from fg_bom table.

Stock Locations Table
This table defines the three physical locations where stock can exist. Each location has a code (like 'STORE', 'PRODUCTION', 'FG_STORE'), a name, and a type classification. This is a simple reference table that ensures consistency across the system.

Stock Ledger Table (The Heart of the System)
This is the immutable log of all stock movements. Every time stock moves, a new row is created here - rows are never updated or deleted. Each ledger entry records:

What item moved: Reference to the stock item
Where it moved: The location code (STORE, PRODUCTION, or FG_STORE)
How much moved: The quantity (positive for IN movements, negative for OUT movements)
When it moved: Transaction date and timestamp
Why it moved: Reference to the document that caused the movement (document type like 'GRN', 'MIS', 'DPR', etc., and the document ID)
Running balance: After this transaction, what is the new stock balance at this location
Source and destination: For transfers between locations (like STORE to PRODUCTION)
The ledger has a unique constraint that prevents the same document from posting the same item to the same location on the same date twice - this enforces idempotency. If someone tries to post a document twice, the database will reject it.

Stock Balances Cache Table (Performance Optimization)
While we can always calculate the current stock balance by summing all ledger entries, this would be slow for large datasets. So we maintain a cache table that stores the current balance for each item at each location. This table is updated every time a ledger entry is created. If the cache ever gets out of sync, we can rebuild it from the ledger.

Document Tables - Extending Existing Tables
All document forms already exist in the codebase. We're not creating new forms - we're adding status tracking and posting functionality to existing tables.

GRN (Goods Receipt Note) Tables
The store_grn and store_grn_items tables already exist. We need to add three fields: status (DRAFT, POSTED, or CANCELLED), posted_at timestamp, and posted_by user identifier. When a GRN is posted to stock, it will add RM/PM items to the STORE location.

JW Annexure GRN Tables
Similar to normal GRN, the store_jw_annexure_grn and store_jw_annexure_grn_items tables exist. We add the same status fields. When posted, it also adds items to STORE location.

Material Issue Slip (MIS) Tables
The store_mis and store_mis_items tables exist. We add status fields. When posted, it moves items from STORE location to PRODUCTION location - creating OUT entries from STORE and IN entries to PRODUCTION.

FG Transfer Note Tables
The store_fgn and store_fgn_items tables exist. We add status fields. When posted, it converts SFG items to FG items within the FG_STORE location - creating OUT entries for SFG and IN entries for FG.

Dispatch Memo Tables
The dispatch_memos and dispatch_memo_items tables exist. We add status fields. When posted, it removes FG items from FG_STORE location - creating OUT entries.

DPR (Daily Production Report) Tables
The dpr_data table exists and represents one DPR per date/shift combination. We add status fields here. However, DPR has a unique dual-entry system:

Excel Import Method: Uses the existing dpr_machine_entries table where machine_no refers to the Injection Molding Machine (IMM). This is for bulk imports from Excel files.

Manual Entry Method: Uses a new dpr_production_entries table where the machineNo field actually stores the line_id from the lines table. This is for manual entry through the "Create New DPR Entry" button.

Both methods link to the same dpr_data record. The dpr_production_entries table stores:

Line ID (which line produced)
Mold ID and mold name (which mold was used)
SFG code (determined by looking up the mold in sfg_bom table - this is critical)
Quantity produced and scrap quantity
Operator name and notes
All the extensive production data in JSONB fields (current production run details and changeover details)
Mold to SFG Code Mapping
The sfg_bom table already exists and contains SFG codes. We need to add columns to link molds to SFG codes: mold_name, mold_id, default_line_id, bom_version, and an active flag. This creates the BOM_SFG_MASTER mapping that the user mentioned.

Critical Business Rule: Only root admin can create BOM entries. When a mold is added to the mold master, only a root admin can create a corresponding BOM entry in sfg_bom that links that mold to an SFG code. When users create DPR entries, they can only select molds that already have BOM mappings - they cannot create new mappings.

BOM Materials Consumption Table
This table defines how much of each raw material or packing material is consumed to produce one unit of SFG. Each record links an SFG code to a stock item (RM or PM) and specifies the quantity per unit, unit of measure, and wastage percentage. When a DPR is posted, the system calculates consumption by multiplying the quantity produced by the quantity per unit, adjusted for wastage.

Stock Movement Flow (Visual Explanation)
1. GRN/JW (Goods Receipt Note / Job Work Annexure GRN):
When goods are received from suppliers or job work partners, the GRN or JW Annexure GRN is posted. This creates IN movements in the STORE location for all RM/PM items listed in the document. Stock increases in STORE.

2. Material Issue Slip (MIS):
When materials are issued from store to production, the MIS is posted. This creates OUT movements from STORE (stock decreases) and IN movements to PRODUCTION (stock increases) for the same items. This is a transfer between locations.

3. DPR (Daily Production Report):
This is the most complex movement. When a DPR is posted:

First, the system determines which SFG code was produced by looking up the mold in sfg_bom
Then, it gets all the BOM materials for that SFG code
For each BOM material, it calculates how much is consumed: quantity produced × quantity per unit × (1 + wastage percentage)
It validates that enough stock exists in PRODUCTION location
It creates OUT movements from PRODUCTION for each consumed material (stock decreases)
Finally, it creates an IN movement to FG_STORE for the produced SFG (stock increases)
4. FG Transfer Note:
When SFG is converted to FG, the FG Transfer Note is posted. This creates OUT movements for SFG items from FG_STORE and IN movements for FG items to FG_STORE. Both happen in the same location (FG_STORE) but different item types. This supports 1-to-1, many-to-1, and 1-to-many conversions.

5. Dispatch:
When finished goods are dispatched to customers, the Dispatch Memo is posted. This creates OUT movements from FG_STORE for all FG items listed. Stock decreases in FG_STORE.

DPR Dual Entry System - Detailed Explanation
Excel Import Method
When users import DPR data from Excel files, the system uses the existing dpr_machine_entries table. In this method:

The machine_no field refers to the Injection Molding Machine (IMM) number
The product field contains the mold name
The system has extensive calculations and headers as mentioned by the user
When posting to stock, the system must look up the mold name in sfg_bom to find the corresponding SFG code
If no mapping exists, posting fails with an error
Manual Entry Method (Create New DPR Entry Button)
When users click "Create New DPR Entry", they use the ManualDPREntryForm component. In this method:

The machineNo field actually stores the line_id (not a machine number)
Users select a line from the lines table
Users select a mold from the molds table
Critical: When a mold is selected, the system immediately looks up the sfg_bom table using the mold_name or mold_id
If a match is found, the sfg_code is automatically populated (can be a hidden field)
If no match is found, an error is shown: "No BOM_SFG_MASTER mapping found for this mold. Only root admin can create BOM entries. Please contact administrator."
The form cannot be saved if sfg_code is missing
All the extensive calculations happen in the form (as they already do)
When saved, the data goes into dpr_production_entries table with the sfg_code already determined
Posting DPR to Stock
When posting a DPR, the system must handle both entry methods:

Read all manual entries from dpr_production_entries (these already have sfg_code)
Read all Excel import entries from dpr_machine_entries (these need sfg_code lookup via mold)
Group all entries by sfg_code and sum the quantities produced
For each unique sfg_code, get the BOM materials and post stock movements
API Endpoints - Posting Documents to Stock
All document creation forms already exist. We're creating POSTING endpoints that link existing documents to the stock ledger.

GRN Posting Endpoint
When a GRN is posted, the endpoint reads the GRN and its items, maps each item description to a stock item, validates the mapping exists, and then creates IN ledger entries to the STORE location for each item. The GRN status is updated to POSTED.

JW Annexure GRN Posting Endpoint
Similar to normal GRN, but reads from the JW Annexure GRN tables. Posts items to STORE location.

MIS Posting Endpoint
Reads the MIS and its items. For each item, validates that enough stock exists in STORE, then creates OUT entries from STORE and IN entries to PRODUCTION. Updates MIS status to POSTED.

DPR Posting Endpoint
This is the most complex. It:

Validates DPR status is DRAFT
Checks idempotency (hasn't been posted before)
Aggregates production data from both manual entries and Excel import entries
For manual entries: uses the sfg_code already stored
For Excel entries: looks up sfg_code from mold via sfg_bom
Groups by sfg_code and calculates total quantities
For each sfg_code: gets BOM materials, calculates consumption, validates stock, posts RM/PM OUT from PRODUCTION, posts SFG IN to FG_STORE
Updates DPR status to POSTED
FG Transfer Note Posting Endpoint
Reads the transfer note and items. Validates SFG availability in FG_STORE, creates OUT entries for SFG, creates IN entries for FG (both in FG_STORE location). Supports various conversion ratios. Updates status to POSTED.

Dispatch Posting Endpoint
Reads the dispatch memo and items. Maps item names to stock items, validates FG availability in FG_STORE, creates OUT entries, updates status to POSTED.

Stock Read Endpoints
Get Stock Balance
Returns current stock balance for items at locations. Can filter by item, location, or date. Uses the stock_balances cache table for fast responses.

Get Stock Ledger
Returns ledger entries with full filtering - by item, location, document type, date range, etc. This is the audit trail.

Implementation Details
Transaction Safety
All posting operations happen inside database transactions. If any step fails, everything rolls back. This ensures data consistency.

Idempotency Enforcement
Before posting, the system checks if ledger entries already exist for this document. If they do, posting is rejected. The unique constraint on the ledger table also prevents duplicates at the database level.

Concurrency Handling
When posting a document, the system locks the document row using SELECT FOR UPDATE. This prevents two users from posting the same document simultaneously.

Stock Balance Cache Updates
After each ledger entry is created, the corresponding balance cache entry is updated. This happens in the same transaction, so cache and ledger are always in sync.

Item Mapping Challenge
Documents use item descriptions or codes that may not exactly match stock_items table. We need a mapping utility that can:

Match item descriptions from GRN/MIS to stock item codes
Handle variations in naming
Allow manual mapping if automatic matching fails
Store mappings for future use
Mold-SFG Linking in Manual Entry Form
When a user selects a mold in the ManualDPREntryForm:

The form calls a utility function that queries sfg_bom table
It searches by mold_name first, then by mold_id
If found, it extracts the sfg_code and stores it in form state
If not found, it shows an error and prevents form submission
The sfg_code is saved with the dpr_production_entries record
Files to Create/Modify
Database Migration
Create a comprehensive migration that:

Creates all stock ledger tables (stock_items, stock_locations, stock_ledger, stock_balances)
Adds status fields to all existing document tables
Adds mold linking fields to sfg_bom table
Creates bom_materials table
Creates helper functions for balance calculation and cache updates
Creates stored procedures for posting each document type
Sets up all necessary indexes for performance
API Routes
Create posting endpoints for each document type:

POST /api/store/grn/[id]/post
POST /api/store/jw-grn/[id]/post
POST /api/store/mis/[id]/post
POST /api/store/fgn/[id]/post
POST /api/store/dispatch/[id]/post
POST /api/production/dpr/[id]/post
Create read endpoints:

GET /api/stock/balance
GET /api/stock/ledger
Utility Functions
Stock item mapper: Maps document item descriptions to stock_items
Mold-SFG linker: Looks up sfg_code from mold via sfg_bom
Stock posting helpers: Reusable functions for creating ledger entries
Form Updates
Update existing forms to add "Post to Stock" buttons:

GRNForm.tsx
JWAnnexureGRNForm.tsx
MISForm.tsx
FGNForm.tsx
DispatchMemoForm.tsx
Critical Update for ManualDPREntryForm:

Add mold-SFG lookup when mold is selected
Store sfg_code in form state
Show error if no BOM mapping exists
Prevent save if sfg_code missing
Add "Post DPR to Stock" button
Save to dpr_production_entries table with sfg_code
Key Assumptions and Business Rules
BOM Consumption: We use the bom_materials table with explicit quantity per unit. If percentage-based consumption is needed later, we can calculate from sfg_bom percentage fields.
Mold-SFG Mapping: Only root admin can create BOM entries. Molds must exist in mold master before BOM entries can be created. Users can only select molds that have BOM mappings.
DPR Dual Entry: Both Excel import and manual entry methods are supported. Manual entry uses line numbers, Excel import uses machine numbers. Both aggregate to the same stock movements.
Idempotency: Documents can only be posted once. Attempting to post twice is rejected.
No Stock Teleports: All movements are source → destination with ledger entries. Stock cannot appear or disappear without a document.
Audit Trail: Every movement is recorded with document reference, timestamp, and user. Full traceability is maintained.
Stock Balances Cache: Maintained for performance but can be rebuilt from ledger if needed.