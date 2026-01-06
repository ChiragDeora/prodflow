# STOCK LEDGER CALCULATIONS - COMPLETE REFERENCE

This document details all stock additions and subtractions for each of the three stores: **STORE**, **PRODUCTION**, and **FG_STORE**.

---

## STORE LOCATION CALCULATIONS

### ADDITIONS (IN movements) to STORE:

#### 1. **GRN (Goods Receipt Note)**
- **Calculation:** `quantity = grn_qty` (from GRN items table)
- **Formula:** `New Balance = Current Balance + grn_qty`
- **Source Field:** `store_grn_items.total_qty`
- **Movement Type:** IN
- **Example:** If current balance is 1000 kg and GRN adds 500 kg, new balance = 1500 kg

#### 2. **JW GRN (Job Work Annexure GRN)**
- **Calculation:** `quantity = grn_qty` (from JW GRN items table)
- **Formula:** `New Balance = Current Balance + grn_qty`
- **Source Field:** `store_jw_annexure_grn_items.grn_qty`
- **Movement Type:** IN
- **Same logic as GRN**

#### 3. **DPR - REGRIND Creation**
- **Calculation:** `quantity = rej_kgs` (rejected kilograms from production)
- **Formula:** `New Balance = Current Balance + rej_kgs`
- **Source Field:** `dpr_machine_entries.rej_kgs` (aggregated by SFG)
- **Movement Type:** IN
- **Item Code:** "REGRIND"
- **Example:** If rej_kgs = 117.62 kg, adds 117.62 kg of REGRIND to STORE

#### 4. **Stock Adjustment (INCREASE/OPENING)**
- **Calculation:** `quantity = adjustment_quantity` (from adjustment items)
- **Formula:** `New Balance = Current Balance + adjustment_quantity`
- **Source Field:** `stock_adjustment_items.quantity`
- **Movement Type:** IN

### SUBTRACTIONS (OUT movements) from STORE:

#### 1. **MIS (Material Issue Slip)**
- **Calculation:** `quantity = issue_qty` (from MIS items table)
- **Formula:** `New Balance = Current Balance - issue_qty`
- **Source Field:** `store_mis_items.issue_qty`
- **Movement Type:** OUT
- **Counterpart Location:** PRODUCTION (items move to PRODUCTION)
- **Example:** If current balance is 1000 kg and MIS issues 300 kg, new balance = 700 kg

#### 2. **FG Transfer - Packing Materials Consumption**
- **Calculation:** Multiple components consumed based on FG BOM:
  - **Carton:** `quantity = boxes × cnt_qty` (from fg_bom)
  - **Polybag:** `quantity = boxes × poly_qty` (from fg_bom)
  - **BOPP Tape 1:** `quantity = boxes × qty_meter` (from fg_bom, in METERS)
  - **BOPP Tape 2:** `quantity = boxes × qty_meter_2` (from fg_bom, in METERS)
  - **Labels (if IML):** `quantity = calculated_label_qty` (based on IML config)
- **Formula:** `New Balance = Current Balance - component_quantity`
- **Source Fields:** 
  - `store_fgn_items.no_of_boxes`
  - `fg_bom.cnt_qty`, `fg_bom.poly_qty`, `fg_bom.qty_meter`, `fg_bom.qty_meter_2`
- **Movement Type:** OUT
- **Example:** If packing 10 boxes and BOM says 1 carton per box, consumes 10 cartons

#### 3. **Stock Adjustment (DECREASE)**
- **Calculation:** `quantity = adjustment_quantity` (from adjustment items)
- **Formula:** `New Balance = Current Balance - adjustment_quantity`
- **Source Field:** `stock_adjustment_items.quantity`
- **Movement Type:** OUT

---

## PRODUCTION LOCATION CALCULATIONS

### ADDITIONS (IN movements) to PRODUCTION:

#### 1. **MIS (Material Issue Slip)**
- **Calculation:** `quantity = issue_qty` (from MIS items table)
- **Formula:** `New Balance = Current Balance + issue_qty`
- **Source Field:** `store_mis_items.issue_qty`
- **Movement Type:** IN
- **Counterpart Location:** STORE (items received from STORE)
- **Example:** If current balance is 200 kg and MIS issues 300 kg, new balance = 500 kg

### SUBTRACTIONS (OUT movements) from PRODUCTION:

#### 1. **DPR - Raw Material Consumption**
- **Calculation:** Complex calculation based on BOM percentages
- **Total Consumption Formula:** 
  ```
  Total Consumption (kg) = ok_prod_kgs + rej_kgs
  ```
- **Per RM Type Formula:**
  ```
  RM Consumption (kg) = Total Consumption × BOM Percentage
  ```
- **Note:** BOM percentages are stored as decimals (e.g., 0.75 for 75%, 0.125 for 12.5%)
- **Source Fields:**
  - `dpr_machine_entries.ok_prod_kgs` (good production kg)
  - `dpr_machine_entries.rej_kgs` (rejected kg)
  - `sfg_bom.hp_percentage`, `icp_percentage`, `rcp_percentage`, `ldpe_percentage`, `gpps_percentage`, `mb_percentage`
- **Movement Type:** OUT
- **FIFO Logic:** Deducts from oldest stock first (based on MIS that brought it in)
- **Example Calculation:**
  ```
  ok_prod_kgs = 144.46 kg
  rej_kgs = 117.62 kg
  Total Consumption = 144.46 + 117.62 = 262.08 kg
  
  BOM percentages (stored as decimals): HP 0.75, ICP 0.125, RCP 0.125
  
  HP consumed = 262.08 × 0.75 = 196.56 kg
  ICP consumed = 262.08 × 0.125 = 32.76 kg
  RCP consumed = 262.08 × 0.125 = 32.76 kg
  ```

#### 2. **Stock Adjustment (DECREASE)**
- **Calculation:** `quantity = adjustment_quantity` (from adjustment items)
- **Formula:** `New Balance = Current Balance - adjustment_quantity`
- **Source Field:** `stock_adjustment_items.quantity`
- **Movement Type:** OUT

---

## FG_STORE LOCATION CALCULATIONS

### ADDITIONS (IN movements) to FG_STORE:

#### 1. **DPR - Semi-Finished Goods (SFG) Creation**
- **Calculation:** `quantity = ok_prod_qty_nos` (good production pieces)
- **Formula:** `New Balance = Current Balance + ok_prod_qty_nos`
- **Source Field:** `dpr_machine_entries.ok_prod_qty_nos` (aggregated by SFG code)
- **Movement Type:** IN
- **SFG Code Lookup:** Mold name (from `product` field) → `sfg_bom.item_name` → `sfg_bom.sfg_code`
- **Unit:** NOS (pieces)
- **Example:** If ok_prod_qty_nos = 5000 pieces, adds 5000 pieces of SFG to FG_STORE

#### 2. **FG Transfer - Finished Goods Creation**
- **Calculation:** `quantity = no_of_boxes` (from FG Transfer items)
- **Formula:** `New Balance = Current Balance + no_of_boxes`
- **Source Field:** `store_fgn_items.no_of_boxes`
- **Movement Type:** IN
- **Unit:** NOS (boxes)
- **Example:** If packing 50 boxes, adds 50 boxes of FG to FG_STORE

#### 3. **Customer Return**
- **Calculation:** `quantity = return_quantity` (from customer return items)
- **Formula:** `New Balance = Current Balance + return_quantity`
- **Source Field:** `customer_return_items.quantity`
- **Movement Type:** IN
- **Unit:** NOS (boxes)

#### 4. **Stock Adjustment (INCREASE/OPENING)**
- **Calculation:** `quantity = adjustment_quantity` (from adjustment items)
- **Formula:** `New Balance = Current Balance + adjustment_quantity`
- **Source Field:** `stock_adjustment_items.quantity`
- **Movement Type:** IN

### SUBTRACTIONS (OUT movements) from FG_STORE:

#### 1. **FG Transfer - SFG Consumption**
- **Calculation:** Multiple SFG components consumed based on FG BOM:
  - **SFG 1 (usually container):** `quantity = boxes × sfg_1_qty` (from fg_bom)
  - **SFG 2 (usually lid):** `quantity = boxes × sfg_2_qty` (from fg_bom, if exists)
- **Formula:** `New Balance = Current Balance - sfg_quantity`
- **Source Fields:**
  - `store_fgn_items.no_of_boxes`
  - `fg_bom.sfg_1_qty`, `fg_bom.sfg_2_qty`
- **Movement Type:** OUT
- **Unit:** NOS (pieces)
- **Example:** If packing 10 boxes and BOM says 1 container + 1 lid per box:
  - Consumes 10 containers (SFG 1)
  - Consumes 10 lids (SFG 2)

#### 2. **Dispatch/Delivery Challan**
- **Calculation:** `quantity = qty` (from dispatch items, this is boxes)
- **Formula:** `New Balance = Current Balance - qty`
- **Source Field:** `dispatch_items.qty` (or `dispatch_memo_items.qty`)
- **Movement Type:** OUT
- **Unit:** NOS (boxes)
- **Example:** If dispatching 100 boxes, subtracts 100 boxes from FG_STORE

#### 3. **Stock Adjustment (DECREASE)**
- **Calculation:** `quantity = adjustment_quantity` (from adjustment items)
- **Formula:** `New Balance = Current Balance - adjustment_quantity`
- **Source Field:** `stock_adjustment_items.quantity`
- **Movement Type:** OUT

---

## SUMMARY BY DOCUMENT TYPE

### GRN (Goods Receipt Note)
- **STORE:** +grn_qty (IN)
- **PRODUCTION:** No change
- **FG_STORE:** No change

### JW GRN (Job Work Annexure GRN)
- **STORE:** +grn_qty (IN)
- **PRODUCTION:** No change
- **FG_STORE:** No change

### MIS (Material Issue Slip)
- **STORE:** -issue_qty (OUT)
- **PRODUCTION:** +issue_qty (IN)
- **FG_STORE:** No change

### DPR (Daily Production Report)
- **STORE:** +rej_kgs (IN) as REGRIND
- **PRODUCTION:** -(ok_prod_kgs + rej_kgs) × BOM% for each RM type (OUT)
- **FG_STORE:** +ok_prod_qty_nos (IN) as SFG

### FG Transfer (Finished Goods Transfer Note)
- **STORE:** 
  - -boxes × cnt_qty (cartons, OUT)
  - -boxes × poly_qty (polybags, OUT)
  - -boxes × qty_meter (BOPP 1, OUT)
  - -boxes × qty_meter_2 (BOPP 2, OUT)
  - -label_qty (labels if IML, OUT)
- **PRODUCTION:** No change
- **FG_STORE:** 
  - -boxes × sfg_1_qty (SFG 1, OUT)
  - -boxes × sfg_2_qty (SFG 2, OUT)
  - +boxes (FG, IN)

### Dispatch/Delivery Challan
- **STORE:** No change
- **PRODUCTION:** No change
- **FG_STORE:** -qty (OUT)

### Customer Return
- **STORE:** No change
- **PRODUCTION:** No change
- **FG_STORE:** +return_quantity (IN)

### Stock Adjustment
- **STORE:** +quantity (INCREASE/OPENING) or -quantity (DECREASE)
- **PRODUCTION:** +quantity (INCREASE/OPENING) or -quantity (DECREASE)
- **FG_STORE:** +quantity (INCREASE/OPENING) or -quantity (DECREASE)

---

## KEY FORMULAS REFERENCE

### DPR Raw Material Consumption
```
Total Consumption = ok_prod_kgs + rej_kgs
RM Type Consumption = Total Consumption × BOM Percentage
```
**Note:** BOM percentages are stored as decimals (e.g., 0.75 for 75%, 0.125 for 12.5%)

### DPR SFG Creation
```
SFG Quantity = ok_prod_qty_nos (pieces)
```

### DPR REGRIND Creation
```
REGRIND Quantity = rej_kgs (kilograms)
```

### FG Transfer Component Consumption
```
Component Quantity = boxes × (component_qty_per_box from fg_bom)
```

### Balance Update Formula (All Locations)
```
New Balance = Current Balance + quantity (for IN)
New Balance = Current Balance - quantity (for OUT)
```

---

## NOTES

1. **Negative Stock:** System allows negative stock but logs warnings
2. **FIFO:** Raw material consumption in DPR uses FIFO (oldest stock first)
3. **Partial Packing:** FG Transfer requires ALL components available before posting
4. **BOM Lookup:** DPR uses mold name → sfg_bom lookup to find SFG code and RM percentages
5. **IML Products:** FG codes with "20" in positions 7-8 require label consumption
6. **Units:** 
   - Raw materials: KG
   - SFG/FG: NOS (pieces/boxes)
   - BOPP tape: METERS
   - Packing materials: NOS

