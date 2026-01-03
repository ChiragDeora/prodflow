# DPR Tables Migration Verification

## Overview
This migration creates a comprehensive Daily Production Report (DPR) backend structure with proper relationships, calculated fields, and summary views.

## Tables Created

### 1. `dpr_data`
**Purpose:** Main DPR table - one record per date/shift combination

**Key Fields:**
- `id` (UUID, Primary Key)
- `report_date` (DATE, NOT NULL)
- `shift` (VARCHAR, CHECK: 'DAY' or 'NIGHT')
- `shift_incharge` (VARCHAR)
- `created_by`, `created_at`, `updated_at`, `updated_by`

**Constraints:**
- UNIQUE(report_date, shift) - ensures one DPR per date/shift

### 2. `dpr_machine_entries`
**Purpose:** Machine entries - one record per machine per section (current/changeover) per DPR

**Key Fields:**
- `id` (UUID, Primary Key)
- `dpr_id` (UUID, FK to dpr_data)
- `section_type` (VARCHAR, CHECK: 'current' or 'changeover')
- `machine_no` (VARCHAR, FK to machines)
- `operator_name` (VARCHAR)
- `product` (VARCHAR)
- `cavity` (INTEGER)

**Process Parameters:**
- `trg_cycle_sec` - Target Cycle (sec)
- `trg_run_time_min` - Target Run Time (min)
- `part_wt_gm` - Part Weight (gm)
- `act_part_wt_gm` - Actual Part Weight (gm)
- `act_cycle_sec` - Actual Cycle (sec)
- `part_wt_check` - Part Weight Check ('OK', 'NOT OK', '')
- `cycle_time_check` - Cycle Time Check ('OK', 'NOT OK', '')

**No of Shots:**
- `shots_start` - No of Shots (Start)
- `shots_end` - No of Shots (End)

**Production Data:**
- `target_qty_nos` - Target Qty (Nos)
- `actual_qty_nos` - Actual Qty (Nos)
- `ok_prod_qty_nos` - Ok Prod Qty (Nos)
- `ok_prod_kgs` - Ok Prod (Kgs) - **AUTO-CALCULATED**
- `ok_prod_percent` - Ok Prod (%) - **AUTO-CALCULATED**
- `rej_kgs` - Rej (Kgs)
- `lumps_kgs` - Lumps (Kgs)

**Run Time:**
- `run_time_mins` - Run Time (mins)
- `down_time_min` - Down time (min)

**Stoppage Summary:**
- `mould_change` - Mould change
- `remark` - REMARK

**Constraints:**
- UNIQUE(dpr_id, machine_no, section_type) - ensures one entry per machine per section per DPR
- FK to machines table

### 3. `dpr_stoppage_entries`
**Purpose:** Stoppage entries - multiple stoppages per machine entry

**Key Fields:**
- `id` (UUID, Primary Key)
- `dpr_machine_entry_id` (UUID, FK to dpr_machine_entries)
- `reason` (TEXT) - Reason
- `start_time` (TIME) - Start Time
- `end_time` (TIME) - End Time
- `total_time_min` (DECIMAL) - Total Time (min) - **AUTO-CALCULATED**

## Auto-Calculated Fields

### 1. Ok Prod (Kgs)
**Formula:** `(ok_prod_qty_nos * part_wt_gm) / 1000`

**Trigger:** `trigger_update_ok_prod_kgs`
- Automatically calculates when `ok_prod_qty_nos` or `part_wt_gm` is inserted/updated

### 2. Ok Prod (%)
**Formula:** `(ok_prod_qty_nos / actual_qty_nos) * 100`

**Trigger:** `trigger_update_ok_prod_percent`
- Automatically calculates when `actual_qty_nos` or `ok_prod_qty_nos` is inserted/updated
- Returns NULL if `actual_qty_nos` is 0 or NULL

### 3. Total Time (in stoppage entries)
**Formula:** Calculated from `start_time` and `end_time` (handles next-day wrap-around)

**Trigger:** `trigger_update_stoppage_total_time`
- Automatically calculates when `start_time` or `end_time` is inserted/updated

## Summary Views

### 1. `dpr_shift_totals`
**Purpose:** Calculated shift totals from all machine entries

**Calculated Fields:**
- `shift_target_qty_nos` - Sum of all target_qty_nos
- `shift_actual_qty_nos` - Sum of all actual_qty_nos
- `shift_ok_prod_qty_nos` - Sum of all ok_prod_qty_nos
- `shift_ok_prod_kgs` - Sum of all ok_prod_kgs
- `shift_ok_prod_percent` - Calculated: `(shift_ok_prod_qty_nos / shift_actual_qty_nos) * 100`
- `shift_rej_kgs` - Sum of all rej_kgs
- `shift_lumps_kgs` - Sum of all lumps_kgs
- `shift_run_time_mins` - Sum of all run_time_mins
- `shift_down_time_min` - Sum of all down_time_min
- `shift_total_time_min` - Calculated: `shift_run_time_mins + shift_down_time_min`

**Note:** Aggregates both 'current' and 'changeover' sections

### 2. `dpr_achievement_metrics`
**Purpose:** Calculated achievement metrics

**Calculated Fields:**
- `actual_vs_target_percent` - `(shift_actual_qty_nos / shift_target_qty_nos) * 100`
- `rej_vs_ok_prod_percent` - `(shift_rej_kgs / shift_ok_prod_kgs) * 100`
- `run_time_vs_total_percent` - `(shift_run_time_mins / shift_total_time_min) * 100`
- `down_time_vs_total_percent` - `(shift_down_time_min / shift_total_time_min) * 100`

## Helper Functions

### 1. `calculate_ok_prod_kgs(ok_prod_qty, part_wt_gm)`
Calculates Ok Prod (Kgs) from quantity and part weight

### 2. `calculate_ok_prod_percent(actual_qty, ok_prod_qty)`
Calculates Ok Prod (%) from actual and ok production quantities

### 3. `calculate_total_time_min(start_time, end_time)`
Calculates total time in minutes from start and end times (handles next-day wrap-around)

### 4. `calculate_down_time_from_stoppages(p_dpr_machine_entry_id)`
Calculates total down time from all stoppage entries for a machine entry

## Indexes

### Performance Indexes:
- `idx_dpr_data_date` - On dpr_data(report_date)
- `idx_dpr_data_shift` - On dpr_data(shift)
- `idx_dpr_data_date_shift` - On dpr_data(report_date, shift)
- `idx_dpr_machine_entries_dpr_id` - On dpr_machine_entries(dpr_id)
- `idx_dpr_machine_entries_machine_no` - On dpr_machine_entries(machine_no)
- `idx_dpr_machine_entries_section_type` - On dpr_machine_entries(section_type)
- `idx_dpr_machine_entries_dpr_machine` - On dpr_machine_entries(dpr_id, machine_no)
- `idx_dpr_stoppage_entries_machine_entry_id` - On dpr_stoppage_entries(dpr_machine_entry_id)

## RLS Policies

All tables have RLS enabled with policy:
- "Allow all for authenticated users" - Allows all operations for authenticated users

## Usage Examples

### Insert a DPR
```sql
INSERT INTO dpr_data (report_date, shift, shift_incharge, created_by)
VALUES ('2025-02-16', 'DAY', 'John Doe', 'admin');
```

### Insert a Machine Entry
```sql
INSERT INTO dpr_machine_entries (
    dpr_id, section_type, machine_no, operator_name, product, cavity,
    target_qty_nos, actual_qty_nos, ok_prod_qty_nos, part_wt_gm
)
VALUES (
    'dpr-uuid', 'current', 'IMM-01', 'Operator 1', 'Product A', 8,
    1000, 950, 900, 25.5
);
-- ok_prod_kgs and ok_prod_percent will be auto-calculated
```

### Insert a Stoppage Entry
```sql
INSERT INTO dpr_stoppage_entries (
    dpr_machine_entry_id, reason, start_time, end_time
)
VALUES (
    'machine-entry-uuid', 'Mould Change', '10:00:00', '10:30:00'
);
-- total_time_min will be auto-calculated (30 minutes)
```

### Query Shift Totals
```sql
SELECT * FROM dpr_shift_totals WHERE dpr_id = 'dpr-uuid';
```

### Query Achievement Metrics
```sql
SELECT * FROM dpr_achievement_metrics WHERE dpr_id = 'dpr-uuid';
```

## Verification Checklist

- [x] All required fields from user requirements are included
- [x] Foreign key relationships are properly set up
- [x] Auto-calculation triggers are working
- [x] Summary views calculate correctly
- [x] Indexes are created for performance
- [x] RLS policies are configured
- [x] All calculations are accurate
- [x] Supports both current and changeover sections
- [x] Supports multiple stoppages per machine

## Notes

1. **Section Type:** Each machine can have both 'current' and 'changeover' entries in the same DPR
2. **Calculations:** All calculations handle NULL values gracefully
3. **Time Calculations:** Stoppage time calculations handle next-day wrap-around (e.g., 23:00 to 01:00)
4. **Down Time:** Can be entered manually or calculated from stoppage entries using the helper function
5. **Shift Totals:** Aggregates both current and changeover sections for complete shift metrics

