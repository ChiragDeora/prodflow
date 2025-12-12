# Database Migration Instructions

## Mould Loading Reports - Line Number Update

To complete the update from machine numbers to line numbers, you need to run the database migration:

### Step 1: Run the Migration
```bash
# Connect to your database and run the migration
psql $DATABASE_URL -f update_mould_reports_to_use_lines.sql
```

### Step 2: Verify the Changes
After running the migration, verify that:
1. The `line_no` column has been added to `mould_loading_unloading_reports` table
2. The foreign key constraint to the `lines` table is in place
3. The stored function `create_mould_report_with_procedures` has been updated

### Step 3: Optional Data Migration
If you have existing data in the `machine_no` column, you may want to migrate it to the new `line_no` column by mapping machines to their respective production lines.

### What Changed in the Code:
1. ✅ Updated form to use production line dropdown instead of machine number input
2. ✅ Added line fetching functionality using `lineAPI.getAll()`
3. ✅ Updated form state to use `line_no` instead of `machine_no`
4. ✅ Updated API endpoints to handle `line_no` parameter
5. ✅ Updated table display to show "Line" instead of "Machine"
6. ✅ Updated search functionality to filter by line number

### Benefits:
- More accurate representation of production structure
- Better integration with existing line management system
- Clearer relationship between reports and production lines
- Dropdown selection prevents typos and ensures valid line references
