Add SPARE Item Type to Stock Ledger System
Overview
Add support for spare parts / maintenance items to the existing Stock Ledger system. Spare parts follow (PO → GRN → MIS) but are tracked separately via a new item type.

Task 1: Database Schema Updates
1.1 Modify stock_items table
Add new columns for spare parts management:
ColumnTypePurposecategoryVARCHAR(50)Category: BEARING, SEAL, ELECTRICAL, HYDRAULIC, etc.sub_categoryVARCHAR(50)Sub-category for more specific groupingfor_machineVARCHAR(50)Which machine this spare is used in (optional)for_moldVARCHAR(50)Which mold this spare is used in (optional)min_stock_levelDECIMAL(15,3)Minimum stock level for alerts (default 0)reorder_qtyDECIMAL(15,3)Suggested reorder quantity (default 0)
1.2 item_type values
Ensure item_type column accepts these values:

RM (Raw Material)
PM (Packing Material)
SFG (Semi-Finished Goods)
FG (Finished Goods)
SPARE (Spare Parts) ← NEW


Task 2: Spare Parts Categories
Create constants file at /src/lib/constants/spare-categories.js
Categories and Subcategories:
CategorySubcategoriesBEARINGBALL_BEARING, ROLLER_BEARING, THRUST_BEARING, BUSHSEALO_RING, OIL_SEAL, GASKET, PACKINGELECTRICALMOTOR, RELAY, SENSOR, SWITCH, CONTACTOR, FUSEHYDRAULICPUMP, VALVE, CYLINDER, HOSE, FITTINGPNEUMATICCYLINDER, VALVE, FRL, FITTING, TUBINGHEATINGHEATER_BAND, THERMOCOUPLE, CARTRIDGE_HEATER, NOZZLE_HEATERMECHANICALGEAR, SHAFT, COUPLING, BELT, CHAIN, SPROCKETMOLD_PARTSEJECTOR_PIN, GUIDE_PIN, GUIDE_BUSH, SPRING, COOLING_FITTINGCONSUMABLELUBRICANT, COOLANT, FILTER, GREASEFASTENERBOLT, NUT, SCREW, WASHER, ALLEN_KEYOTHERGENERAL
Also export ITEM_TYPES array: RM, PM, SFG, FG, SPARE

Task 3: Update Stock Ledger UI
3.1 Item Type Filter
Location: Stock Ledger page - Item Type filter section
Add SPARE button alongside existing buttons: All | RM | PM | SFG | FG | SPARE
3.2 Current Stock Tab
Same update - add SPARE to the item type filter buttons.

Task 4: Update PO Form
Location: Purchase Order form
4.1 Add Item Type Toggle
Add a toggle at the top of the form with two options:

Production Materials (default) - shows RM and PM items
Spare Parts - shows only SPARE items

4.2 Filter Items in Dropdown
When Production Materials selected → filter to show only RM and PM items
When Spare Parts selected → filter to show only SPARE items

Task 5: Update GRN Form
Location: GRN form (both Normal GRN and JW Annexure GRN)
5.1 Add Item Type Toggle
Same toggle as PO: Production Materials | Spare Parts
5.2 Filter Items Based on Toggle
Same filtering logic as PO form.
5.3 Auto-detect from PO
If GRN is linked to a PO, auto-detect the item type from PO items and set the toggle accordingly.

Task 6: Update MIS Form
Location: Material Issue Slip form
6.1 Add Item Type Toggle
Same toggle: Production Materials | Spare Parts
6.2 Filter Available Items
Only show items that:

Match the selected type (RM/PM for Production, SPARE for Spare Parts)
Have stock balance > 0 in STORE location


Task 7: Create Spare Parts Master Page
Location: /src/app/masters/spare-parts/page.js
7.1 Page Layout
ElementDescriptionTitle"Spare Parts Master"Add Button"+ Add Spare Part" (top right)SearchSearch by code or nameCategory FilterDropdown to filter by categoryTable ColumnsCode, Name, Category, Sub-Category, Machine, Mold, UOM, Min Stock, Current Stock, Actions
7.2 Add/Edit Spare Part Modal
FieldTypeRequiredNotesItem CodeAuto-generatedYesFormat: SPARE-{CAT}-{SEQ} (e.g., SPARE-BRG-001)Item NameText inputYesCategoryDropdownYesFrom SPARE_CATEGORIESSub-CategoryDropdownNoBased on selected categoryFor MachineDropdownNoFrom machines tableFor MoldDropdownNoFrom molds tableUOMDropdownYesPCS, KG, LTR, MTR, SET, etc.Min Stock LevelNumber inputNoDefault 0Reorder QtyNumber inputNoDefault 0DescriptionTextareaNoAdditional notes
7.3 API Endpoints
MethodEndpointPurposeGET/api/masters/spare-partsList all spare partsPOST/api/masters/spare-partsCreate spare partPUT/api/masters/spare-parts/[id]Update spare partDELETE/api/masters/spare-parts/[id]Delete spare part (soft delete)
7.4 Item Code Generation
Auto-generate code when creating: SPARE-{CATEGORY_SHORT_3_CHARS}-{SEQUENCE_3_DIGITS}
Example: SPARE-BRG-001, SPARE-BRG-002, SPARE-ELE-001
7.5 On Create
Insert into stock_items table with item_type = 'SPARE'

Task 8: Add Sidebar Link
Location: Sidebar component, under Masters section
Add new menu item:

Icon: Wrench icon
Label: "Spare Parts"
Link: /masters/spare-parts


Task 9: Low Stock Alerts (Optional)
9.1 API Endpoint
GET /api/stock/low-stock-alerts?item_type=SPARE
Returns spare parts where current_balance < min_stock_level
Response fields: item_code, item_name, category, for_machine, min_stock_level, reorder_qty, current_stock
9.2 Dashboard Card (Optional)
Add "Low Stock Alerts" card on home dashboard showing count of spare parts below minimum level with link to view details.

Task 10: Validation Updates
10.1 Stock Posting Helpers
Update validation in stock helpers to include SPARE in valid item types list.
Valid types: RM, PM, SFG, FG, SPARE


Summary of Changes
AreaChangeDatabaseAdd 6 columns to stock_items: category, sub_category, for_machine, for_mold, min_stock_level, reorder_qtyConstantsAdd SPARE to ITEM_TYPES, create SPARE_CATEGORIES listStock Ledger UIAdd SPARE button to Item Type filterPO FormAdd Production/Spare toggle, filter items accordinglyGRN FormAdd Production/Spare toggle, filter items accordinglyMIS FormAdd Production/Spare toggle, filter items accordinglyMastersCreate Spare Parts Master page with CRUDSidebarAdd link to Spare Parts MasterAlertsLow stock alerts for spare parts (optional)

Testing Checklist

 Can create new spare part in Spare Parts Master
 Spare part appears in stock_items with item_type='SPARE'
 Item code auto-generates correctly (SPARE-XXX-NNN)
 Stock Ledger shows SPARE filter button
 Filtering by SPARE shows only spare parts
 PO form toggle shows/hides correctly
 PO form filters items based on toggle selection
 Can create PO for spare parts
 GRN form toggle works correctly
 Can create GRN for spare parts → stock adds to STORE
 MIS form toggle works correctly
 MIS form shows only SPARE items with stock when toggle is on Spare Parts
 Can create MIS for spare parts → stock moves from STORE to PRODUCTION
 Stock balance updates correctly for spare parts
 Low stock alert works (if implemented)