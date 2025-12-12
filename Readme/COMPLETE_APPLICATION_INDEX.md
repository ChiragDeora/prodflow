# 📚 COMPLETE APPLICATION INDEX - PRODUCTION SCHEDULER ERP

## Table of Contents
1. [Masters Module](#1-masters-module)
2. [Store & Dispatch Module](#2-store--dispatch-module)
3. [Production Planner Module](#3-production-planner-module)
4. [Production Module](#4-production-module)
5. [Quality Control Module](#5-quality-control-module)
6. [Maintenance Management Module](#6-maintenance-management-module)
7. [Approvals Module](#7-approvals-module)
8. [Reports Module](#8-reports-module)
9. [Profile Module](#9-profile-module)

---

## 1. MASTERS MODULE

**Location:** `src/components/modules/master-data/index.tsx`

**Total Tabs:** 8 tabs

### Tab 1: Machine Master
- **Component:** `MachineMaster.tsx`
- **Purpose:** Manage all production machines
- **Data Fields:**
  - Machine ID
  - Make
  - Model
  - Category (with filtering)
  - Status (Active/Inactive/Maintenance)
  - Specifications
  - Unit assignment (if unit management enabled)
- **Features:**
  - Category-based filtering
  - Sorting by multiple fields
  - Excel import/export
  - Edit/Delete operations
  - Unit management support

### Tab 2: Mold Master
- **Component:** `MoldMaster.tsx`
- **Purpose:** Manage all production molds
- **Data Fields:**
  - Mold ID
  - Mold specifications
  - Cavity count
  - Status
  - Unit assignment (if unit management enabled)
- **Features:**
  - Sorting by multiple fields
  - Excel import/export
  - Edit/Delete operations
  - Unit management support

### Tab 3: Raw Materials Master
- **Component:** `RawMaterialsMaster.tsx`
- **Purpose:** Manage raw materials inventory
- **Data Fields:**
  - Material ID
  - Material name
  - Category
  - Unit of measurement
  - Unit assignment (if unit management enabled)
- **Features:**
  - Sorting by multiple fields
  - Excel import/export
  - Edit/Delete operations
  - Unit management support

### Tab 4: Packing Materials Master
- **Component:** `PackingMaterialsMaster.tsx`
- **Purpose:** Manage packing materials inventory
- **Data Fields:**
  - Material ID
  - Material name
  - Category (with filtering)
  - Unit of measurement
  - Unit assignment (if unit management enabled)
- **Features:**
  - Category-based filtering
  - Sorting by multiple fields
  - Excel import/export
  - Edit/Delete operations
  - Unit management support

### Tab 5: Line Master
- **Component:** `LineMaster.tsx`
- **Purpose:** Manage production lines
- **Data Fields:**
  - Line ID
  - Associated machines (IM, Robot, Conveyor, Hoist)
  - Status (Active/Inactive)
  - Unit assignment (if unit management enabled)
- **Features:**
  - Sorting by multiple fields
  - Excel import/export
  - Edit/Delete operations
  - Machine association
  - Unit management support
- **Special Lines - Grinding Lines:**
  - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 4**</div> - Dedicated grinding line for material processing operations
  - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 7**</div> - Dedicated grinding line for material processing operations
  - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 14**</div> - Dedicated grinding line for material processing operations
  - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 16**</div> - Dedicated grinding line for material processing operations
  - These grinding lines are highlighted with a 2px orange border for easy identification
  - Grinding lines are used for processing raw materials and are integrated with Silo Management

### Tab 6: BOM Master
- **Component:** `BOMMaster` (from `bom-master` module)
- **Purpose:** Manage Bill of Materials
- **Sub-Categories:** 3 categories
  - **SFG (Semi-Finished Goods):**
    - Item Name
    - SFG Code
    - PCS
    - Part Weight (gm/pcs)
    - Colour
    - HP %, ICP %, RCP %, LDPE %, GPPS %, MB %
  - **FG (Finished Goods):**
    - Item Code
    - Party Name
    - Pack Size
    - SFG-1, SFG-1 Qty
    - SFG-2, SFG-2 Qty
    - Container Code, Container Qty
    - Polybag Code, Poly Qty
    - BOPP 1, Qty/Meter
    - BOPP 2, Qty/Meter 2
    - CBM
  - **LOCAL:**
    - Item Code
    - Pack Size
    - SFG-1, SFG-1 Qty
    - SFG-2, SFG-2 Qty
    - Container Code, Container Qty
    - Polybag Code, Poly Qty
    - BOPP 1, Qty/Meter
    - BOPP 2, Qty/Meter 2
    - CBM
- **Features:**
  - Version management
  - Audit trail
  - Status management (Draft/Released/Archived)
  - Excel import/export
  - Advanced filtering and sorting
  - BOM component tracking

### Tab 7: Commercial Master
- **Component:** `CommercialMaster` (from `commercial-master` module)
- **Purpose:** Manage commercial entities
- **Sub-Tabs:** 3 sub-tabs
  - **Sub-Tab 1: Customer Master**
    - Component: `CustomerMaster`
    - Purpose: Manage customer information
    - Data: Customer details, contact info, addresses
  - **Sub-Tab 2: Vendor Master**
    - Component: `VendorMaster`
    - Purpose: Manage vendor information
    - Data: Vendor details, contact info, addresses
  - **Sub-Tab 3: Vendor Registration (VRF)**
    - Component: `VendorRegistrationForm`
    - Purpose: Register new vendors
    - Data: Vendor registration details, documents

### Tab 8: Others
- **Component:** `OthersMaster.tsx`
- **Purpose:** Additional master data
- **Sections:** 2 sections (divided by separator)
  - **Section 1: Color/Label Master**
    - Component: `ColorLabelMaster.tsx`
    - Purpose: Manage color labels and their mappings
    - Data: Color names, labels, party associations
    - Features: Excel import/export
  - **Section 2: Party Name Master**
    - Component: `PartyNameMaster.tsx`
    - Purpose: Manage party names
    - Data: Party codes, names, associations
    - Features: Excel import/export

---

## 2. STORE & DISPATCH MODULE

**Location:** `src/components/modules/store-dispatch/index.tsx`

**Total Main Tabs:** 4 tabs

### Tab 1: Purchase
- **Purpose:** Material procurement and vendor management
- **Sub-Forms:** 4 forms
  - **Form 1: Material Indent Slip**
    - Component: `MaterialIndentSlipForm.tsx`
    - Purpose: Create material indent requests
    - Data Flow: Creates indent → Links to Purchase Order → Links to GRN
  - **Form 2: Purchase Order (PO)**
    - Component: `PurchaseOrderForm.tsx`
    - Purpose: Create purchase orders (Capital & Operational)
    - Data Flow: Links from Material Indent → Creates PO → Links to GRN
  - **Form 3: Open Indent**
    - Component: `OpenIndent.tsx`
    - Purpose: Track pending indent quantities
    - Data: Shows indents with pending quantities
  - **Form 4: Purchase History**
    - Component: `PurchaseHistory.tsx`
    - Purpose: View all purchase records
    - Features: Search, filter, view past purchase orders and indents

### Tab 2: Inward
- **Purpose:** Material receipt and goods received notes
- **Sub-Forms:** 3 forms
  - **Form 1: Normal GRN (Goods Receipt Note)**
    - Component: `GRNForm.tsx`
    - Purpose: Create GRN for in-house materials
    - Data Flow: Links from Material Indent Slip → Creates GRN for in-house production
    - Data: Material details, quantities, vendor info, receipt date
  - **Form 2: JW Annexure GRN (Job Work GRN)**
    - Component: `JWAnnexureGRNForm.tsx`
    - Purpose: Create GRN for outsourced job work materials
    - Data Flow: Links from Material Indent Slip → Creates GRN for job work
    - Data: Material details, quantities, job work vendor info, receipt date
  - **Form 3: Inward History**
    - Component: `StoreHistory.tsx`
    - Purpose: View all GRN records
    - Features: Search, filter, view past GRNs (both Normal and JW Annexure)

### Tab 3: Outward
- **Purpose:** Material dispatch and delivery management
- **Sub-Forms:** 4 forms
  - **Form 1: MIS (Material Issue Slip)**
    - Component: `MISForm.tsx`
    - Purpose: Issue materials from store to production departments
    - Data: Material details, quantities, department, issue date
  - **Form 2: Job Work Challan**
    - Component: `JobWorkChallanForm.tsx`
    - Purpose: Send materials for job work with GST compliance
    - Data: Material details, quantities, job work vendor, GST details, challan date
  - **Form 3: Delivery Challan**
    - Component: `DeliveryChallanForm.tsx`
    - Purpose: Generate delivery challans for dispatching finished goods
    - Data: Finished goods details, quantities, customer, delivery details
  - **Form 4: Outward History**
    - Component: `DispatchHistory.tsx`
    - Purpose: View all outward records
    - Features: Search, filter, view past MIS, Job Work Challans, Delivery Challans

### Tab 4: Sales
- **Purpose:** Order tracking and dispatch management
- **Sub-Forms:** 3 forms
  - **Form 1: Dispatch Memo**
    - Component: `DispatchMemoForm.tsx`
    - Purpose: Create and manage dispatch memos for internal tracking
    - Data: Dispatch details, memo number, internal tracking info
  - **Form 2: Order Book**
    - Component: `OrderBookForm.tsx`
    - Purpose: Track and manage customer orders
    - Data: Customer PO numbers, part codes, delivery schedules, order status
  - **Form 3: Sales History**
    - Component: `DispatchHistory.tsx`
    - Purpose: View all sales records
    - Features: Search, filter, view past dispatch memos and order book entries

---

## 3. PRODUCTION PLANNER MODULE

**Location:** `src/components/modules/prod-planner/index.tsx`

**Purpose:** Visual production planning and scheduling

**Main Features:**
- **Calendar View:**
  - Month view (default)
  - Week view (optional)
  - Day-by-day planning grid
- **Production Lines:**
  - Each line represents a production line
  - Lines can have status: Active, Inactive, Maintenance
  - Lines are associated with machines (IM, Robot, Conveyor, Hoist)
  - **Grinding Lines (Special):**
    - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 4**</div> - Grinding line for material processing
    - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 7**</div> - Grinding line for material processing
    - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 14**</div> - Grinding line for material processing
    - <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 16**</div> - Grinding line for material processing
    - Grinding lines are used for processing raw materials through grinding operations
    - These lines connect to silo management for material tracking
    - Grinding operations record input weight, output weight, waste, and efficiency
- **Production Blocks:**
  - Visual blocks on calendar grid
  - Each block represents production schedule
  - Block properties:
    - Start day, End day
    - Label/Product name
    - Color (base color)
    - Color segments (multiple colors within block)
    - Product colors with quantities
    - Party codes/names (multiple)
    - Packing materials (boxes, polybags, BOPP)
    - Mold ID and Mold Data
    - Changeover information
    - Notes
- **Changeover Management:**
  - Changeover blocks (gray blocks)
  - Changeover time (minutes or time format)
  - Changeover mold information
- **Data Sources:**
  - Lines from Line Master
  - Molds from Mold Master
  - Packing Materials from Packing Materials Master
  - Color Labels from Color Label Master
  - Party Names from Party Name Master
- **Features:**
  - Drag and drop blocks
  - Resize blocks
  - Color picker
  - Multiple colors per block
  - Party-specific color mapping
  - Packing material selection
  - Changeover time management
  - Save/Load functionality

---

## 4. PRODUCTION MODULE

**Location:** `src/components/modules/production/index.tsx`

**Total Tabs:** 4 tabs

### Tab 1: Daily Production Report (DPR)
- **Purpose:** Daily production reporting and analysis
- **Main Features:**
  - **Date & Shift Selection:**
    - Date picker
    - Shift selection (DAY/NIGHT)
  - **Excel Import:**
    - Supports 63-sheet Excel structure
    - Machine sheets format: 1a, 1b, 2a, 2b, etc.
    - Summary sheet extraction
    - Automatic date and shift extraction
  - **DPR Table:**
    - Machine-wise data display
    - Column categories:
      - **Basic Info:** Machine No., Operator Name, Product, Cavity
      - **Process Parameters:** Target Cycle, Target Run Time, Part Weight, Actual Part Weight, Actual Cycle
      - **Shots:** No of Shots (Start), No of Shots (End)
      - **Production Data:** Target Qty, Actual Qty, OK Prod Qty, OK Prod (Kgs), OK Prod (%), Rej (Kgs)
      - **Runtime:** Run Time (mins), Down time (min)
      - **Stoppage:** Reason, Start Time, End Time, Total Time, Mould change, REMARK
    - Column visibility controls
    - Per-machine data with Current Production and Changeover sections
  - **Summary Section:**
    - Shift Total metrics (configurable visibility)
    - Achievement Metrics (configurable visibility)
    - Calculated from machine data
  - **Settings Panel:**
    - Column visibility management
    - Section visibility management
    - Shift Total metrics visibility
    - Achievement metrics visibility
    - Permission-based access (super users only)
  - **Full View Mode:**
    - Expanded view for better visibility
    - All columns and sections visible

### Tab 2: Mould Loading & Unloading
- **Component:** `MouldLoadingUnloadingReport.tsx`
- **Purpose:** Mould changeover reports and procedures
- **Data:** Mould loading/unloading records, changeover times, procedures

### Tab 3: Silo Management
- **Component:** `SiloManagement.tsx`
- **Purpose:** Monitor and manage material inventory in silos
- **Data:** Silo levels, material types, inventory tracking, grinding records
- **Grinding Operations:**
  - **Grinding Lines:** <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 4**</div>, <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 7**</div>, <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 14**</div>, <div style="border: 2px solid #FF6B35; padding: 4px 8px; display: inline-block; border-radius: 4px; background-color: #FFF5F2; margin: 2px 0;">**Line 16**</div>
  - **Grinding Record Fields:**
    - Record date
    - Silo ID (links to silo)
    - Material grade (HP Grade, ICP Grade, CP Grade, LD Grade, MB)
    - Material name
    - Input weight (kg)
    - Output weight (kg)
    - Waste weight (kg)
    - Efficiency percentage (calculated)
    - Operator name
    - Supervisor name
    - Remarks
  - **Grinding Process:**
    - Materials are processed through grinding lines (4, 7, 14, 16)
    - Input materials are ground and converted to output materials
    - Waste is tracked separately
    - Efficiency is calculated as: (Output Weight / Input Weight) × 100
    - Records are stored in `silo_grinding_records` table
    - Linked to silos for inventory management

### Tab 4: FG Transfer Note
- **Component:** `FGNForm.tsx` (Finished Goods Note)
- **Purpose:** Finished Goods Transfer Note management
- **Data:** Finished goods transfer details, quantities, locations

---

## 5. QUALITY CONTROL MODULE

**Location:** `src/components/modules/quality-control/index.tsx`

**Total Tabs:** 5 tabs

### Tab 1: Quality Inspections
- **Purpose:** Quality inspection management
- **Inspection Types:** 3 types
  - **Type 1: Material Inspection**
    - Component: `IncomingMaterialInspectionForm.tsx`
    - Purpose: Incoming raw materials quality check
    - Parameters: 11+ tests
    - Samples: Dynamic sample size
    - Data: Material details, test results, pass/fail status
  - **Type 2: Container Inspection**
    - Component: `ContainerInspectionForm.tsx`
    - Purpose: Packaging containers quality verification
    - Parameters: 8+ tests
    - Samples: Dynamic sample size
    - Data: Container details, test results, pass/fail status
  - **Type 3: Custom Inspection**
    - Purpose: Create custom inspection types
    - Features: Define parameters, criteria, sample sizes
    - Builder interface for creating inspection templates

### Tab 2: Quality Standards
- **Purpose:** Quality standards management
- **Status:** Coming soon
- **Planned Features:** Standard definitions, criteria management

### Tab 3: Quality Analytics
- **Purpose:** Quality analytics and reporting
- **Status:** Coming soon
- **Planned Features:** Analytics charts, trend analysis

### Tab 4: Daily Weight Report
- **Component:** `DailyWeightReport.tsx` (from reports module)
- **Purpose:** Daily weight reporting
- **Data:** Weight measurements, product weights, daily summaries

### Tab 5: First Pieces Approval Report
- **Component:** `FirstPiecesApprovalReport.tsx` (from reports module)
- **Purpose:** First pieces approval tracking
- **Data:** First piece approvals, quality checks, approval status

---

## 6. MAINTENANCE MANAGEMENT MODULE

**Location:** `src/components/modules/maintenance-management/index.tsx`

**Total Tabs:** 3 tabs

### Tab 1: Preventive Maintenance
- **Component:** `LineMaintenance.tsx`
- **Purpose:** Preventive maintenance management
- **Features:**
  - Line-based maintenance
  - Machine-based maintenance
  - Checklist management
  - Frequency selection (Day, Week, Month, etc.)
  - Equipment categories:
    - Machine Check Points
    - Robot Check Points
    - Chiller Check Points
    - Compressor Check Points
    - Blower Systems
    - Electrical Panels
    - Granulator Systems
  - Checklist types:
    - Daily Check List
    - Weekly Compressor Check Sheet
    - Weekly Magnate Check Sheet
    - Monthly Robot Check List
    - Monthly Machine Check List
    - Quarterly Machine Check List
    - Semi Annual Machine Check List
    - Annual Machine Check List
    - PM Plan for 2022(SEP.)

### Tab 2: Breakdown
- **Purpose:** Breakdown maintenance management
- **Features:**
  - Task creation
  - Priority levels (Low, Medium, High, Critical)
  - Status tracking (Pending, In Progress, Completed, Overdue)
  - Machine assignment
  - Due date management
  - Maintenance type (Preventive, Corrective, Emergency)
  - Search and filtering
  - Task assignment

### Tab 3: Report
- **Purpose:** Maintenance reports view
- **Status:** Coming soon
- **Planned Features:** Maintenance reports, analytics

---

## 7. APPROVALS MODULE

**Location:** `src/components/modules/approvals/index.tsx`

**Purpose:** Job approval management

**Sections:** 2 sections (side-by-side layout)

### Section 1: Pending Approvals
- **Purpose:** Jobs awaiting approval
- **Data:**
  - Schedule jobs with `is_done = true` and `approval_status = 'pending'`
  - Machine ID, Mold ID
  - Date, Shift
  - Color, Expected pieces
  - Completion timestamp
- **Actions:**
  - Approve button for each job
  - Approves job and updates approval status

### Section 2: Recent Approvals
- **Purpose:** Recently approved jobs
- **Data:**
  - Schedule jobs with `approval_status = 'approved'`
  - Machine ID, Mold ID
  - Date, Shift
  - Approved by
  - Approval timestamp
- **Display:** Shows last 5 approved jobs

---

## 8. REPORTS MODULE

**Location:** `src/components/modules/reports/index.tsx`

**Purpose:** Reports and analytics

**Report Cards:** 4 cards (all coming soon)

### Card 1: Production Overview
- **Purpose:** Production metrics and charts
- **Status:** Coming soon
- **Planned Features:** Production metrics, charts, summaries

### Card 2: Efficiency Reports
- **Purpose:** Machine efficiency analytics
- **Status:** Coming soon
- **Planned Features:** Efficiency metrics, machine performance

### Card 3: Operator Performance
- **Purpose:** Operator productivity metrics
- **Status:** Coming soon
- **Planned Features:** Operator performance tracking, productivity metrics

### Card 4: Time Analysis
- **Purpose:** Downtime and cycle time analysis
- **Status:** Coming soon
- **Planned Features:** Time analysis, downtime tracking, cycle time metrics

---

## 9. PROFILE MODULE

**Location:** `src/components/modules/profile/index.tsx`

**Total Tabs:** 4 tabs

### Tab 1: Profile Information
- **Purpose:** Manage personal information and account details
- **Sections:**
  - **Profile Card:**
    - User avatar
    - Full name
    - Email
    - Role (Owner/Root Admin/User)
    - Department
    - Member since
    - Last updated
  - **Edit Form:**
    - Full name (editable)
    - Email (read-only)
    - Department (editable)
    - Role (editable: User/Admin/Operator)
    - Save/Cancel buttons

### Tab 2: User Management
- **Purpose:** Approve users, reset passwords, and manage accounts
- **Access:** Admin only
- **Component:** `AdminDashboard.tsx`
- **Features:**
  - User approval
  - Password reset
  - Account management
  - User list
  - Role assignment

### Tab 3: Unit Management
- **Purpose:** Configure units and unit management settings
- **Access:** Admin only
- **Sections:**
  - **Unit Management Settings:**
    - Enable/Disable unit management toggle
    - Default unit selection
    - Settings affect all master data forms
  - **Unit Management:**
    - Unit list
    - Add/Edit/Delete units
    - Unit properties:
      - Name
      - Description
      - Location
      - Status (Active/Inactive/Maintenance)
    - Unit modal for creation/editing

### Tab 4: Account Actions
- **Purpose:** Account security and session management
- **Sections:**
  - **Session Management:**
    - Sign out button
    - Session information
  - **Account Information:**
    - User ID
    - Email
    - Role
    - Account details

---

## 10. PRODUCTION SCHEDULE MODULE

**Location:** `src/components/modules/production-schedule/index.tsx`

**Purpose:** Production scheduling interface

**Features:**
- **Machine List:** Left sidebar with all machines
- **Timeline Grid:** Right side with 24-hour timeline
- **Machine Rows:** Each machine has its own row
- **Job Cards:** Visual representation of scheduled jobs
- **Job Properties:**
  - Machine ID
  - Mold ID
  - Color
  - Expected pieces
  - Start time
  - End time
  - Status (Done/Approved/Pending)
- **Status Colors:**
  - Green: Job done
  - Blue: Job approved
  - Gray: Job pending
- **Machine Status:**
  - Active (green)
  - Maintenance (red)
  - Idle (yellow)
- **Interactions:**
  - Click machine to view details
  - Click job to view/edit schedule
  - Visual timeline representation

---

## DATA FLOW SUMMARY

### Purchase Flow:
1. **Material Indent Slip** → Creates indent request
2. **Purchase Order** → Links from indent, creates PO
3. **GRN (Normal/JW Annexure)** → Links from indent, creates receipt
4. **Open Indent** → Tracks pending quantities

### Production Flow:
1. **Production Planner** → Creates production schedule
2. **Production Schedule** → Visual timeline of jobs
3. **Daily Production Report** → Records actual production
4. **Approvals** → Approves completed jobs

### Quality Flow:
1. **Material Inspection** → Inspects incoming materials
2. **Container Inspection** → Inspects containers
3. **First Pieces Approval** → Approves first pieces
4. **Daily Weight Report** → Tracks weight measurements

### Maintenance Flow:
1. **Preventive Maintenance** → Scheduled maintenance tasks
2. **Breakdown** → Emergency/corrective maintenance
3. **Reports** → Maintenance analytics

### Master Data Flow:
- All master data modules feed into:
  - Production Planner (Lines, Molds, Packing Materials, Colors, Party Names)
  - Production Module (Machines, Molds)
  - Store & Dispatch (Materials, Vendors, Customers)
  - Quality Control (Materials, Containers)
  - Maintenance (Machines, Lines)

---

## MODULE DEPENDENCIES

### Core Dependencies:
- **Masters** → Used by all other modules
- **Production Planner** → Feeds into Production Schedule
- **Production Schedule** → Feeds into Production Module
- **Production Module** → Feeds into Approvals
- **Store & Dispatch** → Uses Masters (Materials, Vendors, Customers)
- **Quality Control** → Uses Masters (Materials, Containers)
- **Maintenance** → Uses Masters (Machines, Lines)

### Data Relationships:
- Machines → Lines → Production Planner
- Molds → Production Planner → Production Schedule
- Materials → Store & Dispatch → Production
- Packing Materials → Production Planner → Production
- Color Labels → Production Planner → Production
- Party Names → Production Planner → Production
- BOM → Production Planner → Production

---

## PERMISSIONS & ACCESS CONTROL

### Super Users:
- Yogesh Deora (email contains 'yogesh' or 'deora')
- Root Admins
- Users with `canManageSettings` permission

### Admin-Only Features:
- User Management (Profile Tab 2)
- Unit Management (Profile Tab 3)
- DPR Settings Management (Production Module)

### User Permissions:
- DPR Permissions API: `/api/user/dpr-permissions`
- Column visibility permissions
- Section visibility permissions
- Settings management permissions

---

## EXCEL IMPORT STRUCTURES

### Production Module (DPR):
- **Format:** 63-sheet Excel file
- **Summary Sheet:** Contains date, shift, shift incharge
- **Machine Sheets:** Named as 1a, 1b, 2a, 2b, etc.
- **Data Extraction:**
  - Date from summary sheet
  - Shift (DAY/NIGHT) from summary sheet
  - Machine data from numbered sheets
  - Automatic summary calculation

### Master Data:
- **Machine Master:** Excel import supported
- **Mold Master:** Excel import supported
- **Raw Materials:** Excel import supported
- **Packing Materials:** Excel import supported
- **Line Master:** Excel import supported
- **Color Label Master:** Excel import supported
- **Party Name Master:** Excel import supported
- **BOM Master:** Excel import supported (SFG/FG/LOCAL)

---

## DATABASE TABLES REFERENCED

### Master Data Tables:
- `machines`
- `molds`
- `raw_materials`
- `packing_materials`
- `lines`
- `bom_master_trial`
- `bom_versions`
- `bom_components`
- `color_label_master`
- `party_name_master`
- `units`
- `unit_management_settings`

### Production Tables:
- `schedule_jobs`
- `dpr_data` (implied)
- `silo_grinding_records`
- `mould_loading_unloading`

### Store & Dispatch Tables:
- `material_indent_slips`
- `purchase_orders`
- `grn` (goods receipt notes)
- `jw_annexure_grn`
- `mis` (material issue slips)
- `job_work_challans`
- `delivery_challans`
- `dispatch_memos`
- `order_book`
- `vendor_registrations`

### Quality Tables:
- `incoming_material_inspections`
- `container_inspections`
- `first_pieces_approvals`
- `daily_weight_reports`

### Maintenance Tables:
- `maintenance_tasks`
- `checklists`
- `checklist_sections`
- `line_maintenance`

### User Management:
- `users`
- `user_permissions`
- `dpr_permissions`

---

## END OF DOCUMENT

This document provides a complete index of all modules, tabs, sections, forms, and data flows in the Production Scheduler ERP system. For detailed implementation, refer to the respective component files in the `src/components/modules/` directory.

