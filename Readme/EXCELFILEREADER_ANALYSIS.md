# ExcelFileReader Component - Comprehensive Analysis

## Overview
The `ExcelFileReader` is a React component designed to import and export Excel files for the Production Scheduler ERP system. It supports 11 different data types and provides a comprehensive UI for data import/export operations.

## Location
`/src/components/ExcelFileReader.tsx` (2,100 lines)

## Key Features

### 1. **Supported Data Types** (11 types)
- `machines` - Injection molding machines
- `molds` - Mold specifications
- `schedules` - Production schedules
- `raw_materials` - Raw material inventory
- `packing_materials` - Packing material inventory
- `lines` - Production lines
- `maintenance_checklists` - Maintenance task lists
- `bom_masters` - Bill of Materials (legacy)
- `sfg_bom` - Semi-Finished Goods BOM
- `fg_bom` - Finished Goods BOM
- `local_bom` - Local BOM

### 2. **Core Functionality**

#### **File Parsing**
- Uses `XLSX` library (SheetJS) to parse Excel files
- Reads first sheet of workbook by default
- Supports both `.xlsx` and `.xls` formats
- Dual parsing approach: `raw=true` and `raw=false` to preserve decimal formatting for `qty_meter` fields

#### **Auto-Detection**
- Intelligent header matching via `scoreHeaders()` function
- Scores each data type based on header matches
- Special boost logic for BOM types (fg_bom, local_bom, sfg_bom)
- Auto-detects data type unless user manually selects one

#### **Flexible Column Mapping**
- `CANONICAL_HEADERS` - Single source of truth for expected headers
- `TEMPLATE_MAPPINGS` - Maps Excel headers to database fields
- Case-insensitive matching
- Supports header variations (e.g., "Item Code", "ItemCode", "item_code")
- Handles legacy column names

#### **Data Transformation**
- Type conversion (strings → numbers, dates, booleans)
- Date parsing from Excel serial numbers or ISO strings
- Decimal precision handling for `qty_meter` fields (2 decimal places, floor not round)
- Default value assignment
- Data validation and filtering

### 3. **Special Data Processing**

#### **Raw Materials**
- Handles category headers in Excel (e.g., "PP (Polypropylene)")
- Filters out category header rows
- Maintains category context across rows

#### **Packing Materials**
- Auto-generates `item_code` if missing using pattern: `CATEGORY-TYPE-INDEX`
- Validates that at least one field has data before including row

#### **Maintenance Checklists**
- Groups rows by checklist name and line/machine
- Converts flat Excel rows into nested checklist structure with items
- Creates checklist items from task descriptions

#### **Molds**
- Updates existing molds by `sr_no` instead of creating duplicates
- Handles compatible machines as comma-separated array

#### **Lines**
- Validates machine references exist in database
- Automatically assigns machines to lines after import
- Updates machine `line` field dynamically

### 4. **Duplicate Detection**

Each data type has specific duplicate detection logic:

- **Machines**: By `machine_id` OR combination of `make-model-inj_serial_no`
- **Molds**: By `sr_no` (updates instead of creating duplicate)
- **Schedules**: By `machine_id-mold_id-start_time` combination
- **Raw Materials**: By `type-grade-supplier` combination
- **Packing Materials**: By `item_code`
- **Lines**: By `line_id`
- **Maintenance Checklists**: By `name-line_id` or `name-machine_id`
- **BOM Types**: By `sfg_code` (SFG) or `item_code` (FG/LOCAL)

### 5. **Import Process Flow**

1. **File Selection** → User selects Excel file
2. **Parse Excel** → Extract headers and data rows
3. **Auto-Detect Type** → Score headers to determine data type
4. **Map Columns** → Match Excel columns to DB fields
5. **Transform Data** → Convert types, apply defaults
6. **Filter Invalid** → Remove rows missing required fields
7. **Check Duplicates** → Compare against existing records
8. **Bulk Create** → Import new records via API
9. **Show Results** → Display success/error with counts

### 6. **Export Functionality**

- Exports all existing records for selected data type
- Uses canonical headers for consistent format
- Generates timestamped filename (e.g., `machines_export_2025-01-15.xlsx`)
- Formats data appropriately (booleans as "Yes/No", dates, etc.)

### 7. **Template Generation**

- Downloads Excel template with canonical headers
- Includes 2-3 sample rows with realistic data
- Uses `file-saver` library for download

### 8. **UI Features**

- **Type Selector**: Buttons to switch between data types
- **File Upload**: Drag-and-drop or click to select
- **Preview Table**: Sortable table showing first 5 rows
- **Status Messages**: Success/error/info notifications
- **Loading States**: Spinners during parsing and import
- **Validation Warnings**: Alerts when detected type doesn't match selection

### 9. **State Management**

```typescript
- file: Selected Excel file
- dataType: Currently selected data type
- headers: Extracted column headers
- fullRows: Complete dataset (not just preview)
- mappedData: Transformed data ready for import
- loading: File parsing state
- importing: Import operation state
- showPreview: UI toggle for preview table
- importStatus: Success/error messages
- sortField/sortDirection: Preview table sorting
```

### 10. **API Integration**

Uses APIs from `../lib/supabase`:
- `machineAPI.getAll()`, `bulkCreate()`, `update()`
- `moldAPI.getAll()`, `bulkCreate()`, `update()`
- `scheduleAPI.getAll()`, `bulkCreate()`
- `rawMaterialAPI.getAll()`, `bulkCreate()`, `create()`
- `packingMaterialAPI.getAll()`, `bulkCreate()`
- `lineAPI.getAll()`, `bulkCreate()`
- `maintenanceChecklistAPI.getAll()`, `bulkCreate()`
- `bomMasterAPI.getAll()`, `getByCategory()`, `create()`

### 11. **Where It's Used**

1. **ProductionSchedulerERP.tsx** - Main ERP component (machines, molds, schedules, lines)
2. **modules/master-data/index.tsx** - Master data management
3. **modules/maintenance-management/LineChecklists.tsx** - Maintenance checklists
4. **modules/maintenance-management/checklist/index.tsx** - Maintenance management
5. **modules/bom-master/index.tsx** - BOM management

### 12. **Key Technical Details**

#### **Decimal Precision Handling**
- Special handling for `qty_meter` and `qty_meter_2` fields
- Uses `Math.floor(parsed * 100) / 100` to preserve exactly 2 decimal places
- Reads both raw and text versions to preserve formatting

#### **Date Handling**
- Supports Excel serial date numbers (using `XLSX.SSF.parse_date_code`)
- Also supports ISO date strings
- Converts to ISO format for database storage

#### **Error Handling**
- Try-catch blocks around bulk operations
- Fallback to individual creates for raw materials if bulk fails
- Silent error handling for updates (logs but doesn't throw)

### 13. **Code Structure**

```
1. Imports & Dependencies (lines 1-17)
2. Type Definitions (lines 19-62)
3. Canonical Headers (lines 64-106)
4. Template Mappings (lines 108-361)
5. Auto-Detection Logic (lines 363-427)
6. Main Component (lines 429-2098)
   - State Management
   - File Parsing
   - Data Mapping
   - Import Logic
   - Export Logic
   - Template Download
   - UI Rendering
```

### 14. **Performance Considerations**

- Stores full dataset separately from preview (`fullRows` vs `preview`)
- Re-maps data when type changes without re-parsing file
- Bulk operations preferred over individual creates
- Efficient duplicate detection using Sets

### 15. **Notable Features**

- **Unit Support**: All types support unit field (defaults to 'Unit 1')
- **Auth Integration**: Uses `useAuth()` hook for user context
- **Modal UI**: Fixed overlay with close functionality
- **Responsive Design**: Max-width container with scrollable content
- **Accessibility**: Proper button labels and keyboard navigation

## Dependencies

- `react` - UI framework
- `xlsx` - Excel file parsing/generation
- `file-saver` - File download
- `lucide-react` - Icons
- `../lib/supabase` - Database APIs
- `./auth/AuthProvider` - Authentication

## Potential Improvements

1. **Multi-sheet support**: Currently only reads first sheet
2. **Progress indicator**: For large imports
3. **Undo functionality**: Revert last import
4. **Import history**: Track what was imported when
5. **Validation preview**: Show errors before import
6. **Custom mappings**: Allow users to define column mappings
7. **Batch size**: Process large imports in chunks
8. **Error recovery**: Better partial success handling

