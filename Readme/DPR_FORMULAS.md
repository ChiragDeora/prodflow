# DPR (Daily Production Report) Formulas

This document lists all formulas used in the DPR system for calculations.

## 1. Machine-Level Calculations

### 1.1 Ok Prod (Kgs) - Auto-calculated in Database
**Formula:**
```
ok_prod_kgs = (ok_prod_qty_nos * act_part_wt_gm) / 1000
```

**Description:** Converts good production quantity (pieces) to kilograms by multiplying with **actual part weight** (grams) and dividing by 1000.

**Location:** Database trigger `trigger_update_ok_prod_kgs` in `dpr_machine_entries` table

**Implementation:**
```sql
calculate_ok_prod_kgs(ok_prod_qty_nos, act_part_wt_gm) = (ok_prod_qty_nos * act_part_wt_gm) / 1000.0
```

**Note:** Updated to use `act_part_wt_gm` (actual part weight) instead of `part_wt_gm` (target part weight) for accurate calculations.

---

### 1.2 Ok Prod (%) - Auto-calculated in Database
**Formula:**
```
ok_prod_percent = (ok_prod_qty_nos / actual_qty_nos) * 100
```

**Description:** Calculates the percentage of good production out of actual production quantity.

**Location:** Database trigger `trigger_update_ok_prod_percent` in `dpr_machine_entries` table

**Implementation:**
```sql
calculate_ok_prod_percent(actual_qty_nos, ok_prod_qty_nos) = (ok_prod_qty_nos::DECIMAL / actual_qty_nos::DECIMAL) * 100.0
```

**Note:** Returns NULL if `actual_qty_nos` is 0 or NULL.

---

### 1.3 Ok Prod (%) - Display Calculation (Frontend)
**Formula:**
```
ok_prod_percent_display = (ok_prod_qty_nos / target_qty_nos) * 100
```

**Description:** Alternative calculation used in frontend display when target quantity is available. Shows OK production as percentage of target.

**Location:** `src/components/modules/production/index.tsx` (line ~2499)

**Implementation:**
```typescript
machine.currentProduction.targetQty > 0 
  ? Math.round((machine.currentProduction.okProdQty / machine.currentProduction.targetQty) * 100)
  : Math.round(machine.currentProduction.okProdPercent)
```

---

### 1.4 Total Time (Stoppage) - Auto-calculated in Database
**Formula:**
```
total_time_min = EXTRACT(EPOCH FROM (end_time - start_time)) / 60
```

**Description:** Calculates stoppage duration in minutes from start and end times. Handles next-day wrap-around.

**Location:** Database trigger `trigger_update_stoppage_total_time` in `dpr_stoppage_entries` table

**Implementation:**
```sql
-- If end_time < start_time, it means end time is next day
IF end_time < start_time THEN
    total_time_min = ((24 * 60) - EXTRACT(EPOCH FROM (start_time - end_time)) / 60)
ELSE
    total_time_min = EXTRACT(EPOCH FROM (end_time - start_time)) / 60
END IF
```

---

### 1.5 Rej (Kgs) - Auto-calculated in Frontend (Manual Entry)
**Formula:**
```
rej_kgs = (actual_qty_nos - ok_prod_qty_nos) * act_part_wt_gm / 1000
```

**Description:** Calculates rejected quantity in kilograms. The rejected quantity is the difference between actual production and good production, converted to kilograms using **actual part weight**.

**Location:** `src/components/modules/production/index.tsx` (line ~3796-3802)

**Implementation:**
```typescript
      case 'rejKgs':
        // Formula: (Actual Qty (Nos) - Ok Prod Qty (Nos)) * Act Part Wt (gm) / 1000
        if (prod.actualQty !== undefined && prod.okProdQty !== undefined && prod.actualPartWeight !== undefined && prod.actualPartWeight > 0) {
          const diff = (prod.actualQty || 0) - (prod.okProdQty || 0);
          return (diff * prod.actualPartWeight) / 1000;
        }
        return 0;
```

**Important Notes:**
- **Auto-calculated in frontend** when manually entering DPR data through the form
- **NOT auto-calculated in database** - there is no database trigger for `rej_kgs` like there is for `ok_prod_kgs`
- **Can be manually entered** when importing from Excel files (read directly from "Rej Kgs" column)
- **Used for stock posting**: 
  - Total RM consumption = `ok_prod_kgs + rej_kgs` (both good and rejected material consumed raw material)
  - Creates REGRIND in STORE location with quantity = `rej_kgs`

**Calculation Logic:**
1. Calculate rejected quantity (pieces): `actual_qty_nos - ok_prod_qty_nos`
2. Convert to kilograms: `rejected_qty_nos * part_wt_gm / 1000`

**Example:**
- Actual Qty: 1000 pieces
- Ok Prod Qty: 850 pieces
- Part Weight: 150 gm
- Rej Kgs = (1000 - 850) * 150 / 1000 = 150 * 150 / 1000 = 22.5 kg

---

## 2. Shift-Level Summary Calculations

### 2.1 Shift Totals (Aggregated from All Machines)
**Formulas:**
```
shift_target_qty_nos = SUM(target_qty_nos) [all machines, current + changeover]
shift_actual_qty_nos = SUM(actual_qty_nos) [all machines, current + changeover]
shift_ok_prod_qty_nos = SUM(ok_prod_qty_nos) [all machines, current + changeover]
shift_ok_prod_kgs = SUM(ok_prod_kgs) [all machines, current + changeover]
shift_rej_kgs = SUM(rej_kgs) [all machines, current + changeover]
shift_lumps_kgs = SUM(lumps_kgs) [all machines, current + changeover]
shift_run_time_mins = SUM(run_time_mins) [all machines, current + changeover]
shift_down_time_min = SUM(down_time_min) [all machines, current + changeover]
```

**Location:** Database view `dpr_shift_totals`

---

### 2.2 Shift Ok Prod (%) - Calculated from Aggregates
**Formula:**
```
shift_ok_prod_percent = (shift_ok_prod_qty_nos / shift_actual_qty_nos) * 100
```

**Description:** Calculates overall OK production percentage for the shift.

**Location:** Database view `dpr_shift_totals`

**Implementation:**
```sql
CASE 
    WHEN COALESCE(SUM(m.actual_qty_nos), 0) > 0
    THEN (COALESCE(SUM(m.ok_prod_qty_nos), 0)::DECIMAL / 
          COALESCE(SUM(m.actual_qty_nos), 0)::DECIMAL) * 100.0
    ELSE NULL
END
```

---

### 2.3 Shift Total Time
**Formula:**
```
shift_total_time_min = shift_run_time_mins + shift_down_time_min
```

**Description:** Total time for the shift (run time + down time).

**Location:** Database view `dpr_shift_totals`

---

### 2.4 Target Qty (Kgs) - Frontend Calculation
**Formula:**
```
target_qty_kgs = Σ[(target_qty_nos * part_wt_gm) / 1000] [for all machines, current + changeover]
```

**Description:** Calculates total target quantity in kilograms by converting each machine's target quantity using its part weight.

**Location:** `src/components/modules/production/index.tsx` (line ~648-652)

**Implementation:**
```typescript
const targetQtyKgs = finalMachines.reduce((sum, m) => {
  const current = (m.currentProduction.targetQty || 0) * (m.currentProduction.partWeight || 0) / 1000;
  const changeover = (m.changeover.targetQty || 0) * (m.changeover.partWeight || 0) / 1000;
  return sum + current + changeover;
}, 0);
```

---

### 2.5 Summary Ok Prod (%) - Frontend Calculation
**Formula:**
```
summary_ok_prod_percent = (summary_ok_prod_kgs / target_qty_kgs) * 100
```

**Description:** Calculates OK production percentage based on weight (kg) comparison with target weight.

**Location:** `src/components/modules/production/index.tsx` (line ~655)

**Implementation:**
```typescript
summary.okProdPercent = targetQtyKgs > 0 ? (summary.okProdKgs / targetQtyKgs * 100) : 0;
```

**Note:** This is different from the database calculation which uses quantity (nos). This uses weight (kgs).

---

## 3. Achievement Metrics Calculations

### 3.1 Actual vs Target Percent
**Formula:**
```
actual_vs_target_percent = (shift_actual_qty_nos / shift_target_qty_nos) * 100
```

**Description:** Shows how much actual production achieved compared to target.

**Location:** Database view `dpr_achievement_metrics`

**Implementation:**
```sql
CASE 
    WHEN st.shift_target_qty_nos > 0
    THEN (st.shift_actual_qty_nos::DECIMAL / st.shift_target_qty_nos::DECIMAL) * 100.0
    ELSE NULL
END
```

---

### 3.2 Rej vs Ok Prod Percent
**Formula:**
```
rej_vs_ok_prod_percent = (shift_rej_kgs / shift_ok_prod_kgs) * 100
```

**Description:** Shows rejection rate as percentage of good production.

**Location:** Database view `dpr_achievement_metrics`

**Implementation:**
```sql
CASE 
    WHEN st.shift_ok_prod_kgs > 0
    THEN (st.shift_rej_kgs::DECIMAL / st.shift_ok_prod_kgs::DECIMAL) * 100.0
    ELSE NULL
END
```

---

### 3.3 Run Time vs Total Percent
**Formula:**
```
run_time_vs_total_percent = (shift_run_time_mins / shift_total_time_min) * 100
```

**Description:** Shows what percentage of total time was productive (run time).

**Location:** Database view `dpr_achievement_metrics`

**Implementation:**
```sql
CASE 
    WHEN st.shift_total_time_min > 0
    THEN (st.shift_run_time_mins::DECIMAL / st.shift_total_time_min::DECIMAL) * 100.0
    ELSE NULL
END
```

---

### 3.4 Down Time vs Total Percent
**Formula:**
```
down_time_vs_total_percent = (shift_down_time_min / shift_total_time_min) * 100
```

**Description:** Shows what percentage of total time was downtime.

**Location:** Database view `dpr_achievement_metrics`

**Implementation:**
```sql
CASE 
    WHEN st.shift_total_time_min > 0
    THEN (st.shift_down_time_min::DECIMAL / st.shift_total_time_min::DECIMAL) * 100.0
    ELSE NULL
END
```

---

## 4. Frontend Summary Calculations

### 4.1 Summary Aggregations (Frontend)
**Formulas:**
```typescript
summary.targetQty = Σ(targetQty) [all machines, current + changeover]
summary.actualQty = Σ(actualQty) [all machines, current + changeover]
summary.okProdQty = Σ(okProdQty) [all machines, current + changeover]
summary.okProdKgs = Σ(okProdKgs) [all machines, current + changeover]
summary.rejKgs = Σ(rejKgs) [all machines, current + changeover]
summary.runTime = Σ(runTime) [all machines, current + changeover]
summary.downTime = Σ(downTime) [all machines, current + changeover]
```

**Location:** `src/components/modules/production/index.tsx` (line ~627-636)

---

### 4.2 Ok Prod % of Actual (Display)
**Formula:**
```
ok_prod_percent_of_actual = (ok_prod_qty_nos / actual_qty_nos) * 100
```

**Description:** Used in frontend display to show OK production as percentage of actual production.

**Location:** `src/components/modules/production/index.tsx` (line ~2816)

**Implementation:**
```typescript
currentData.summary.actualQty > 0 
  ? Math.round(currentData.summary.okProdQty / currentData.summary.actualQty * 100 * 10) / 10 
  : 0
```

---

## 5. Notes

### Important Distinctions:

1. **Ok Prod (%) - Database vs Frontend:**
   - **Database:** Uses `(ok_prod_qty_nos / actual_qty_nos) * 100`
   - **Frontend Summary:** Uses `(ok_prod_kgs / target_qty_kgs) * 100` (weight-based)
   - **Frontend Display:** Uses `(ok_prod_qty_nos / target_qty_nos) * 100` (quantity-based, target comparison)

2. **Target Qty Kgs Calculation:**
   - Only calculated in frontend, not stored in database
   - Used specifically for summary OK Prod % calculation
   - Formula: Sum of `(target_qty_nos * part_wt_gm / 1000)` for all machines

3. **Section Types:**
   - All calculations aggregate both 'current' and 'changeover' sections
   - Each machine can have separate entries for current production and changeover

4. **Null Handling:**
   - Most formulas return NULL or 0 when denominator is 0 or NULL
   - Frontend uses `|| 0` to default to 0 for display purposes

---

## 6. Database Functions Reference

### `calculate_ok_prod_kgs(ok_prod_qty, part_wt_gm)`
Returns: `DECIMAL(10, 3)`
Formula: `(ok_prod_qty * part_wt_gm) / 1000.0`

### `calculate_ok_prod_percent(actual_qty, ok_prod_qty)`
Returns: `DECIMAL(5, 2)`
Formula: `(ok_prod_qty::DECIMAL / actual_qty::DECIMAL) * 100.0`

### `calculate_total_time_min(start_time, end_time)`
Returns: `DECIMAL(10, 2)`
Formula: Handles time wrap-around for next-day calculations

### `calculate_down_time_from_stoppages(dpr_machine_entry_id)`
Returns: `DECIMAL(10, 2)`
Formula: `SUM(total_time_min)` from all stoppage entries for the machine entry

