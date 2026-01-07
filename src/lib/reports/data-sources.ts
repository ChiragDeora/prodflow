// ============================================================================
// DATA SOURCES CONFIGURATION
// ============================================================================
// Comprehensive configuration for all available data sources in the ERP system
// 
// PROCUREMENT FLOW:
//   Material Indent → Purchase Order (PO) → GRN → Stock (Store)
//
// PRODUCTION FLOW:
//   MIS (Store→Production) → DPR (makes SFG) → FG Transfer (SFG→FG) → Dispatch
//
// SPARE PARTS FLOW:
//   PO → GRN → Store → Issue Slip (MIS) → Maintenance/Production

export type DataSourceId = 
  | 'production'
  | 'material_indent'
  | 'purchase_order'
  | 'grn'
  | 'jw_grn'
  | 'mis'
  | 'dispatch'
  | 'delivery_challan'
  | 'job_work_challan'
  | 'fg_transfer'
  | 'stock'
  | 'spare_parts'
  | 'spare_movements'
  // Maintenance
  | 'preventive_maintenance'
  | 'maintenance_schedules'
  | 'machine_breakdown'
  | 'mold_breakdown'
  // Quality
  | 'daily_weight_report'
  | 'first_pieces_approval';

export interface DataSourceField {
  id: string;
  name: string;
  type: 'number' | 'text' | 'date' | 'boolean';
  aggregatable: boolean;
  description?: string;
  column: string;  // Actual DB column
  table?: string;  // If from a joined table
}

export interface DataSource {
  id: DataSourceId;
  name: string;
  description: string;
  mainTable: string;
  joins: string[];
  dateColumn: string;
  stockStatusColumn?: string;
  fields: DataSourceField[];
}

// ============================================================================
// DATA SOURCE DEFINITIONS - Following Your Stock Flow
// ============================================================================

export const DATA_SOURCES: Record<DataSourceId, DataSource> = {
  
  // =========================================================================
  // 1. MATERIAL INDENT SLIP - Request RM and PM
  // =========================================================================
  material_indent: {
    id: 'material_indent',
    name: 'Material Indent Slip',
    description: 'Material requests for RM and PM procurement',
    mainTable: 'purchase_material_indent_slip_items',
    joins: ['LEFT JOIN purchase_material_indent_slip ON purchase_material_indent_slip_items.indent_id = purchase_material_indent_slip.id'],
    dateColumn: 'purchase_material_indent_slip.date',
    stockStatusColumn: 'purchase_material_indent_slip.status',
    fields: [
      { id: 'indent_qty', name: 'Indent Qty', type: 'number', aggregatable: true, column: 'indent_qty', description: 'Requested quantity' },
      { id: 'pending_qty', name: 'Pending Qty', type: 'number', aggregatable: true, column: 'pending_qty', description: 'Pending quantity' },
      { id: 'received_qty', name: 'Received Qty', type: 'number', aggregatable: true, column: 'received_qty', description: 'Received quantity' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Material code' },
      { id: 'item_name', name: 'Item Name', type: 'text', aggregatable: false, column: 'item_name', description: 'Material name' },
      { id: 'uom', name: 'UOM', type: 'text', aggregatable: false, column: 'uom', description: 'Unit of measure' },
      { id: 'party_name', name: 'Supplier', type: 'text', aggregatable: false, column: 'purchase_material_indent_slip.party_name', table: 'purchase_material_indent_slip', description: 'Supplier name' },
      { id: 'ident_no', name: 'Indent No', type: 'text', aggregatable: false, column: 'purchase_material_indent_slip.ident_no', table: 'purchase_material_indent_slip', description: 'Indent document number' },
      { id: 'status', name: 'Status', type: 'text', aggregatable: false, column: 'purchase_material_indent_slip.status', table: 'purchase_material_indent_slip', description: 'Indent status' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'purchase_material_indent_slip.date', table: 'purchase_material_indent_slip', description: 'Indent date' },
    ],
  },

  // =========================================================================
  // 2. PURCHASE ORDER (PO) - Order placed with supplier
  // =========================================================================
  purchase_order: {
    id: 'purchase_order',
    name: 'Purchase Order (PO)',
    description: 'Orders placed with suppliers for RM, PM, Spares',
    mainTable: 'purchase_purchase_order_items',
    joins: ['LEFT JOIN purchase_purchase_order ON purchase_purchase_order_items.purchase_order_id = purchase_purchase_order.id'],
    dateColumn: 'purchase_purchase_order.date',
    fields: [
      { id: 'qty', name: 'Order Qty', type: 'number', aggregatable: true, column: 'qty', description: 'Ordered quantity' },
      { id: 'unit_price', name: 'Unit Price', type: 'number', aggregatable: true, column: 'unit_price', description: 'Price per unit' },
      { id: 'total_price', name: 'Total Price', type: 'number', aggregatable: true, column: 'total_price', description: 'Line total' },
      { id: 'description', name: 'Description', type: 'text', aggregatable: false, column: 'description', description: 'Item description' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Item code (for operational PO)' },
      { id: 'unit', name: 'Unit', type: 'text', aggregatable: false, column: 'unit', description: 'Unit of measure' },
      { id: 'party_name', name: 'Supplier', type: 'text', aggregatable: false, column: 'purchase_purchase_order.party_name', table: 'purchase_purchase_order', description: 'Supplier name' },
      { id: 'po_no', name: 'PO No', type: 'text', aggregatable: false, column: 'purchase_purchase_order.po_no', table: 'purchase_purchase_order', description: 'Purchase order number' },
      { id: 'po_type', name: 'PO Type', type: 'text', aggregatable: false, column: 'purchase_purchase_order.po_type', table: 'purchase_purchase_order', description: 'CAPITAL or OPERATIONAL' },
      { id: 'total_amt', name: 'PO Total', type: 'number', aggregatable: true, column: 'purchase_purchase_order.total_amt', table: 'purchase_purchase_order', description: 'Total PO amount' },
      { id: 'final_amt', name: 'Final Amount', type: 'number', aggregatable: true, column: 'purchase_purchase_order.final_amt', table: 'purchase_purchase_order', description: 'Final amount with GST' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'purchase_purchase_order.date', table: 'purchase_purchase_order', description: 'PO date' },
    ],
  },

  // =========================================================================
  // 3. GRN (Normal) - RM and PM into Store (against PO)
  // =========================================================================
  grn: {
    id: 'grn',
    name: 'GRN (Goods Receipt Note)',
    description: 'RM/PM/Spares received into Store against PO',
    mainTable: 'store_grn_items',
    joins: ['LEFT JOIN store_grn ON store_grn_items.grn_id = store_grn.id'],
    dateColumn: 'store_grn.grn_date',
    stockStatusColumn: 'store_grn.stock_status',
    fields: [
      { id: 'total_qty', name: 'Received Qty', type: 'number', aggregatable: true, column: 'total_qty', description: 'Received quantity' },
      { id: 'total_price', name: 'Total Value', type: 'number', aggregatable: true, column: 'total_price', description: 'Total value' },
      { id: 'rate', name: 'Rate', type: 'number', aggregatable: true, column: 'rate', description: 'Per unit rate' },
      { id: 'item_description', name: 'Item Description', type: 'text', aggregatable: false, column: 'item_description', description: 'Item name' },
      { id: 'uom', name: 'UOM', type: 'text', aggregatable: false, column: 'uom', description: 'Unit of measure' },
      { id: 'party_name', name: 'Supplier', type: 'text', aggregatable: false, column: 'store_grn.party_name', table: 'store_grn', description: 'Supplier name' },
      { id: 'type_of_material', name: 'Material Type', type: 'text', aggregatable: false, column: 'store_grn.type_of_material', table: 'store_grn', description: 'RM/PM/STORE' },
      { id: 'grn_no', name: 'GRN No', type: 'text', aggregatable: false, column: 'store_grn.grn_no', table: 'store_grn', description: 'GRN document number' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'store_grn.grn_date', table: 'store_grn', description: 'GRN date' },
    ],
  },

  // =========================================================================
  // 4. JW ANNEXURE GRN - RM and PM from Job Work
  // =========================================================================
  jw_grn: {
    id: 'jw_grn',
    name: 'JW Annexure GRN',
    description: 'Materials received from outsourced Job Work',
    mainTable: 'store_jw_annexure_grn_items',
    joins: ['LEFT JOIN store_jw_annexure_grn ON store_jw_annexure_grn_items.jw_annexure_grn_id = store_jw_annexure_grn.id'],
    dateColumn: 'store_jw_annexure_grn.date',
    stockStatusColumn: 'store_jw_annexure_grn.stock_status',
    fields: [
      { id: 'rcd_qty', name: 'Received Qty', type: 'number', aggregatable: true, column: 'rcd_qty', description: 'Received quantity' },
      { id: 'indent_qty', name: 'Indent Qty', type: 'number', aggregatable: true, column: 'indent_qty', description: 'Indent quantity' },
      { id: 'item_name', name: 'Item Name', type: 'text', aggregatable: false, column: 'item_name', description: 'Item name' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Item code' },
      { id: 'rate', name: 'Rate', type: 'number', aggregatable: true, column: 'rate', description: 'Rate per unit' },
      { id: 'net_value', name: 'Net Value', type: 'number', aggregatable: true, column: 'net_value', description: 'Net value' },
      { id: 'party_name', name: 'Job Worker', type: 'text', aggregatable: false, column: 'store_jw_annexure_grn.party_name', table: 'store_jw_annexure_grn', description: 'Job worker name' },
      { id: 'doc_no', name: 'Doc No', type: 'text', aggregatable: false, column: 'store_jw_annexure_grn.doc_no', table: 'store_jw_annexure_grn', description: 'Document number' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'store_jw_annexure_grn.date', table: 'store_jw_annexure_grn', description: 'GRN date' },
    ],
  },

  // =========================================================================
  // 5. MIS (Material Issue Slip) - RM/PM from Store to Production
  // =========================================================================
  mis: {
    id: 'mis',
    name: 'Material Issue Slip (MIS)',
    description: 'RM and PM issued from Store to Production',
    mainTable: 'store_mis_items',
    joins: ['LEFT JOIN store_mis ON store_mis_items.mis_id = store_mis.id'],
    dateColumn: 'store_mis.date',
    stockStatusColumn: 'store_mis.stock_status',
    fields: [
      { id: 'issue_qty', name: 'Issue Qty', type: 'number', aggregatable: true, column: 'issue_qty', description: 'Issued quantity' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Material code' },
      { id: 'item_description', name: 'Item Description', type: 'text', aggregatable: false, column: 'item_description', description: 'Item name' },
      { id: 'uom', name: 'UOM', type: 'text', aggregatable: false, column: 'uom', description: 'Unit of measure' },
      { id: 'department', name: 'To Department', type: 'text', aggregatable: false, column: 'store_mis.department', table: 'store_mis', description: 'Receiving department' },
      { id: 'doc_no', name: 'MIS No', type: 'text', aggregatable: false, column: 'store_mis.doc_no', table: 'store_mis', description: 'MIS document number' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'store_mis.date', table: 'store_mis', description: 'Issue date' },
    ],
  },

  // =========================================================================
  // 6. DPR (Daily Production Report) - RM/PM → SFG
  // =========================================================================
  production: {
    id: 'production',
    name: 'Production (DPR)',
    description: 'Daily Production - Uses RM/PM to make SFG',
    mainTable: 'dpr_production_entries',
    joins: ['LEFT JOIN dpr_data ON dpr_production_entries.dpr_id = dpr_data.id'],
    dateColumn: 'dpr_data.date',
    stockStatusColumn: 'dpr_data.stock_status',
    fields: [
      { id: 'ok_prod_qty', name: 'OK Production Qty (Nos)', type: 'number', aggregatable: true, column: 'ok_prod_qty', description: 'Good production quantity in pieces' },
      { id: 'ok_prod_kgs', name: 'OK Production (Kgs)', type: 'number', aggregatable: true, column: 'ok_prod_kgs', description: 'Good production weight' },
      { id: 'rej_kgs', name: 'Rejection (Kgs)', type: 'number', aggregatable: true, column: 'rej_kgs', description: 'Rejected weight' },
      { id: 'lumps_kgs', name: 'Lumps (Kgs)', type: 'number', aggregatable: true, column: 'lumps_kgs', description: 'Lumps weight' },
      { id: 'target_qty', name: 'Target Qty', type: 'number', aggregatable: true, column: 'target_qty', description: 'Target production' },
      { id: 'actual_qty', name: 'Actual Qty', type: 'number', aggregatable: true, column: 'actual_qty', description: 'Actual production' },
      { id: 'run_time', name: 'Run Time (mins)', type: 'number', aggregatable: true, column: 'run_time', description: 'Machine run time' },
      { id: 'down_time', name: 'Down Time (mins)', type: 'number', aggregatable: true, column: 'down_time', description: 'Machine down time' },
      { id: 'product', name: 'Mold/Product', type: 'text', aggregatable: false, column: 'product', description: 'Mold or product name' },
      { id: 'machine_no', name: 'Machine No', type: 'text', aggregatable: false, column: 'machine_no', description: 'Machine number' },
      { id: 'line_id', name: 'Line', type: 'text', aggregatable: false, column: 'line_id', description: 'Production line' },
      { id: 'sfg_code', name: 'SFG Code', type: 'text', aggregatable: false, column: 'sfg_code', description: 'Semi-finished goods code' },
      { id: 'cavity', name: 'Cavity', type: 'number', aggregatable: true, column: 'cavity', description: 'Mold cavity count' },
      { id: 'is_changeover', name: 'Changeover', type: 'boolean', aggregatable: false, column: 'is_changeover', description: 'Is changeover entry' },
      { id: 'shift', name: 'Shift', type: 'text', aggregatable: false, column: 'dpr_data.shift', table: 'dpr_data', description: 'DAY or NIGHT shift' },
      { id: 'shift_incharge', name: 'Shift Incharge', type: 'text', aggregatable: false, column: 'dpr_data.shift_incharge', table: 'dpr_data', description: 'Shift supervisor' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'dpr_data.date', table: 'dpr_data', description: 'Production date' },
    ],
  },

  // =========================================================================
  // 7. FG TRANSFER NOTE - SFG → FG
  // =========================================================================
  fg_transfer: {
    id: 'fg_transfer',
    name: 'FG Transfer Note',
    description: 'SFG to FG conversion and transfer',
    mainTable: 'production_fg_transfer_note',
    joins: [],
    dateColumn: 'date',
    stockStatusColumn: 'stock_status',
    fields: [
      { id: 'total_qty', name: 'Total Qty (Pcs)', type: 'number', aggregatable: true, column: 'total_qty', description: 'Transferred quantity in pieces' },
      { id: 'total_boxes', name: 'Total Boxes', type: 'number', aggregatable: true, column: 'total_boxes', description: 'Number of boxes' },
      { id: 'from_dept', name: 'From Dept', type: 'text', aggregatable: false, column: 'from_dept', description: 'Source department' },
      { id: 'to_dept', name: 'To Dept', type: 'text', aggregatable: false, column: 'to_dept', description: 'Destination department' },
      { id: 'party_name', name: 'Party', type: 'text', aggregatable: false, column: 'party_name', description: 'Party name' },
      { id: 'doc_no', name: 'Doc No', type: 'text', aggregatable: false, column: 'doc_no', description: 'Document number' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'date', description: 'Transfer date' },
    ],
  },

  // =========================================================================
  // 8. DISPATCH MEMO - FG to Customer (Internal tracking)
  // =========================================================================
  dispatch: {
    id: 'dispatch',
    name: 'Dispatch Memo',
    description: 'Internal dispatch tracking to customers',
    mainTable: 'dispatch_memo_items',
    joins: ['LEFT JOIN dispatch_memos ON dispatch_memo_items.memo_id = dispatch_memos.id'],
    dateColumn: 'dispatch_memos.date',
    stockStatusColumn: 'dispatch_memos.stock_status',
    fields: [
      { id: 'no_of_pcs', name: 'No. of Pieces', type: 'number', aggregatable: true, column: 'no_of_pcs', description: 'Dispatched pieces' },
      { id: 'no_of_boxes', name: 'No. of Boxes', type: 'number', aggregatable: true, column: 'no_of_boxes', description: 'Dispatched boxes' },
      { id: 'item_name', name: 'Item Name', type: 'text', aggregatable: false, column: 'item_name', description: 'Item description' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'FG item code' },
      { id: 'party_name', name: 'Customer', type: 'text', aggregatable: false, column: 'dispatch_memos.party_name', table: 'dispatch_memos', description: 'Customer name' },
      { id: 'location', name: 'Location', type: 'text', aggregatable: false, column: 'dispatch_memos.location', table: 'dispatch_memos', description: 'Dispatch location' },
      { id: 'memo_no', name: 'Memo No', type: 'text', aggregatable: false, column: 'dispatch_memos.memo_no', table: 'dispatch_memos', description: 'Memo number' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'dispatch_memos.date', table: 'dispatch_memos', description: 'Dispatch date' },
    ],
  },

  // =========================================================================
  // 9. DELIVERY CHALLAN - FG to Customer (GST compliant)
  // =========================================================================
  delivery_challan: {
    id: 'delivery_challan',
    name: 'Delivery Challan',
    description: 'GST compliant delivery to customers',
    mainTable: 'dispatch_delivery_challan_items',
    joins: ['LEFT JOIN dispatch_delivery_challan ON dispatch_delivery_challan_items.challan_id = dispatch_delivery_challan.id'],
    dateColumn: 'dispatch_delivery_challan.date',
    stockStatusColumn: 'dispatch_delivery_challan.stock_status',
    fields: [
      { id: 'no_of_pcs', name: 'No of Pieces', type: 'number', aggregatable: true, column: 'no_of_pcs', description: 'Number of pieces' },
      { id: 'value', name: 'Value', type: 'number', aggregatable: true, column: 'value', description: 'Item value' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Item code' },
      { id: 'item_description', name: 'Item Description', type: 'text', aggregatable: false, column: 'item_description', description: 'Item name' },
      { id: 'hsn_code', name: 'HSN Code', type: 'text', aggregatable: false, column: 'hsn_code', description: 'HSN code' },
      { id: 'pack_size', name: 'Pack Size', type: 'text', aggregatable: false, column: 'pack_size', description: 'Pack size' },
      { id: 'box_no', name: 'Box No', type: 'text', aggregatable: false, column: 'box_no', description: 'Box number' },
      { id: 'uom', name: 'UOM', type: 'text', aggregatable: false, column: 'uom', description: 'Unit of measure' },
      { id: 'party_name', name: 'Customer', type: 'text', aggregatable: false, column: 'dispatch_delivery_challan.party_name', table: 'dispatch_delivery_challan', description: 'Customer name' },
      { id: 'doc_no', name: 'Doc No', type: 'text', aggregatable: false, column: 'dispatch_delivery_challan.doc_no', table: 'dispatch_delivery_challan', description: 'Document number' },
      { id: 'dc_no', name: 'DC No', type: 'text', aggregatable: false, column: 'dispatch_delivery_challan.dc_no', table: 'dispatch_delivery_challan', description: 'Delivery challan number' },
      { id: 'dc_date', name: 'DC Date', type: 'date', aggregatable: false, column: 'dispatch_delivery_challan.dc_date', table: 'dispatch_delivery_challan', description: 'DC date' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'dispatch_delivery_challan.date', table: 'dispatch_delivery_challan', description: 'Record date' },
      { id: 'po_no', name: 'PO No', type: 'text', aggregatable: false, column: 'dispatch_delivery_challan.po_no', table: 'dispatch_delivery_challan', description: 'PO number' },
      { id: 'vehicle_no', name: 'Vehicle No', type: 'text', aggregatable: false, column: 'dispatch_delivery_challan.vehicle_no', table: 'dispatch_delivery_challan', description: 'Vehicle number' },
      { id: 'state', name: 'State', type: 'text', aggregatable: false, column: 'dispatch_delivery_challan.state', table: 'dispatch_delivery_challan', description: 'State' },
      { id: 'returnable', name: 'Returnable', type: 'text', aggregatable: false, column: 'dispatch_delivery_challan.returnable', table: 'dispatch_delivery_challan', description: 'Whether returnable' },
    ],
  },

  // =========================================================================
  // 10. JOB WORK CHALLAN - Materials sent for Job Work
  // =========================================================================
  job_work_challan: {
    id: 'job_work_challan',
    name: 'Job Work Challan',
    description: 'Materials sent to external job workers',
    mainTable: 'store_job_work_challan_items',
    joins: ['LEFT JOIN store_job_work_challan ON store_job_work_challan_items.challan_id = store_job_work_challan.id'],
    dateColumn: 'store_job_work_challan.date',
    stockStatusColumn: 'store_job_work_challan.stock_status',
    fields: [
      { id: 'qty', name: 'Quantity (Kg)', type: 'number', aggregatable: true, column: 'qty', description: 'Sent quantity in kg' },
      { id: 'qty_pcs', name: 'Quantity (Pcs)', type: 'number', aggregatable: true, column: 'qty_pcs', description: 'Sent quantity in pieces' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Item code' },
      { id: 'item_name', name: 'Item Name', type: 'text', aggregatable: false, column: 'item_name', description: 'Item name' },
      { id: 'material_description', name: 'Material Description', type: 'text', aggregatable: false, column: 'material_description', description: 'Material description' },
      { id: 'uom', name: 'UOM', type: 'text', aggregatable: false, column: 'uom', description: 'Unit of measure' },
      { id: 'remarks', name: 'Remarks', type: 'text', aggregatable: false, column: 'remarks', description: 'Remarks' },
      { id: 'party_name', name: 'Job Worker', type: 'text', aggregatable: false, column: 'store_job_work_challan.party_name', table: 'store_job_work_challan', description: 'Job worker name' },
      { id: 'doc_no', name: 'Doc No', type: 'text', aggregatable: false, column: 'store_job_work_challan.doc_no', table: 'store_job_work_challan', description: 'Document number' },
      { id: 'date', name: 'Date', type: 'date', aggregatable: false, column: 'store_job_work_challan.date', table: 'store_job_work_challan', description: 'Challan date' },
      { id: 'vehicle_no', name: 'Vehicle No', type: 'text', aggregatable: false, column: 'store_job_work_challan.vehicle_no', table: 'store_job_work_challan', description: 'Vehicle number' },
      { id: 'challan_no', name: 'Challan No', type: 'text', aggregatable: false, column: 'store_job_work_challan.challan_no', table: 'store_job_work_challan', description: 'Original challan number' },
      { id: 'challan_date', name: 'Challan Date', type: 'date', aggregatable: false, column: 'store_job_work_challan.challan_date', table: 'store_job_work_challan', description: 'Challan date' },
    ],
  },

  // =========================================================================
  // 11. STOCK LEDGER - All stock movements consolidated
  // =========================================================================
  stock: {
    id: 'stock',
    name: 'Stock Ledger',
    description: 'All stock movements (GRN, MIS, DPR, Dispatch, etc.)',
    mainTable: 'stock_ledger',
    joins: ['LEFT JOIN stock_items ON stock_ledger.item_code = stock_items.item_code'],
    dateColumn: 'stock_ledger.transaction_date',
    fields: [
      { id: 'quantity', name: 'Quantity', type: 'number', aggregatable: true, column: 'quantity', description: 'Movement quantity' },
      { id: 'balance_after', name: 'Balance After', type: 'number', aggregatable: false, column: 'balance_after', description: 'Balance after transaction' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Stock item code' },
      { id: 'item_name', name: 'Item Name', type: 'text', aggregatable: false, column: 'stock_items.item_name', table: 'stock_items', description: 'Item name' },
      { id: 'item_type', name: 'Item Type', type: 'text', aggregatable: false, column: 'stock_items.item_type', table: 'stock_items', description: 'RM/PM/SFG/FG/SPARE' },
      { id: 'location_code', name: 'Location', type: 'text', aggregatable: false, column: 'location_code', description: 'STORE/PRODUCTION/FG_STORE' },
      { id: 'movement_type', name: 'Movement Type', type: 'text', aggregatable: false, column: 'movement_type', description: 'IN or OUT' },
      { id: 'document_type', name: 'Document Type', type: 'text', aggregatable: false, column: 'document_type', description: 'GRN/MIS/DPR/DISPATCH etc.' },
      { id: 'document_no', name: 'Document No', type: 'text', aggregatable: false, column: 'document_no', description: 'Reference document number' },
      { id: 'transaction_date', name: 'Date', type: 'date', aggregatable: false, column: 'transaction_date', description: 'Transaction date' },
    ],
  },

  // =========================================================================
  // 12. SPARE PARTS MASTER (Current Stock View)
  // =========================================================================
  spare_parts: {
    id: 'spare_parts',
    name: 'Spare Parts (Master)',
    description: 'Spare parts inventory with current stock levels',
    mainTable: 'spare_parts_with_stock',
    joins: [],
    dateColumn: 'created_at',
    fields: [
      { id: 'store_balance', name: 'Store Balance', type: 'number', aggregatable: true, column: 'store_balance', description: 'Current stock at Store' },
      { id: 'production_balance', name: 'Production Balance', type: 'number', aggregatable: true, column: 'production_balance', description: 'Current stock at Production' },
      { id: 'total_balance', name: 'Total Balance', type: 'number', aggregatable: true, column: 'total_balance', description: 'Total stock across all locations' },
      { id: 'min_stock_level', name: 'Min Stock Level', type: 'number', aggregatable: true, column: 'min_stock_level', description: 'Minimum stock threshold' },
      { id: 'reorder_qty', name: 'Reorder Qty', type: 'number', aggregatable: true, column: 'reorder_qty', description: 'Suggested reorder quantity' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'item_code', description: 'Spare part code (SPARE-XXX-NNN)' },
      { id: 'item_name', name: 'Item Name', type: 'text', aggregatable: false, column: 'item_name', description: 'Spare part name' },
      { id: 'category', name: 'Category', type: 'text', aggregatable: false, column: 'category', description: 'BEARING, SEAL, ELECTRICAL, etc.' },
      { id: 'sub_category', name: 'Sub Category', type: 'text', aggregatable: false, column: 'sub_category', description: 'Sub-category' },
      { id: 'for_machine', name: 'For Machine', type: 'text', aggregatable: false, column: 'for_machine', description: 'Machine this spare is for' },
      { id: 'for_mold', name: 'For Mold', type: 'text', aggregatable: false, column: 'for_mold', description: 'Mold this spare is for' },
      { id: 'unit_of_measure', name: 'UOM', type: 'text', aggregatable: false, column: 'unit_of_measure', description: 'Unit of measure' },
      { id: 'is_low_stock', name: 'Low Stock Alert', type: 'boolean', aggregatable: false, column: 'is_low_stock', description: 'True if below min stock' },
    ],
  },

  // =========================================================================
  // 13. SPARE PARTS MOVEMENTS (Stock Ledger filtered for SPARE)
  // =========================================================================
  spare_movements: {
    id: 'spare_movements',
    name: 'Spare Parts (Movements)',
    description: 'Spare parts IN/OUT movements from Stock Ledger',
    mainTable: 'stock_ledger',
    joins: ['INNER JOIN stock_items ON stock_ledger.item_code = stock_items.item_code AND stock_items.item_type = \'SPARE\''],
    dateColumn: 'stock_ledger.transaction_date',
    fields: [
      { id: 'quantity', name: 'Quantity', type: 'number', aggregatable: true, column: 'quantity', description: 'Movement quantity (+IN, -OUT)' },
      { id: 'balance_after', name: 'Balance After', type: 'number', aggregatable: false, column: 'balance_after', description: 'Balance after transaction' },
      { id: 'item_code', name: 'Item Code', type: 'text', aggregatable: false, column: 'stock_ledger.item_code', table: 'stock_ledger', description: 'Spare part code' },
      { id: 'item_name', name: 'Item Name', type: 'text', aggregatable: false, column: 'stock_items.item_name', table: 'stock_items', description: 'Spare part name' },
      { id: 'category', name: 'Category', type: 'text', aggregatable: false, column: 'stock_items.category', table: 'stock_items', description: 'Spare category' },
      { id: 'for_machine', name: 'For Machine', type: 'text', aggregatable: false, column: 'stock_items.for_machine', table: 'stock_items', description: 'Machine association' },
      { id: 'for_mold', name: 'For Mold', type: 'text', aggregatable: false, column: 'stock_items.for_mold', table: 'stock_items', description: 'Mold association' },
      { id: 'location_code', name: 'Location', type: 'text', aggregatable: false, column: 'location_code', description: 'STORE or PRODUCTION' },
      { id: 'movement_type', name: 'Movement Type', type: 'text', aggregatable: false, column: 'movement_type', description: 'IN or OUT' },
      { id: 'document_type', name: 'Document Type', type: 'text', aggregatable: false, column: 'document_type', description: 'GRN/MIS/ADJUSTMENT etc.' },
      { id: 'document_no', name: 'Document No', type: 'text', aggregatable: false, column: 'document_no', description: 'Reference document' },
      { id: 'transaction_date', name: 'Date', type: 'date', aggregatable: false, column: 'transaction_date', description: 'Transaction date' },
    ],
  },

  // =========================================================================
  // 14. PREVENTIVE MAINTENANCE TASKS
  // =========================================================================
  preventive_maintenance: {
    id: 'preventive_maintenance',
    name: 'Preventive Maintenance',
    description: 'Scheduled/routine maintenance tasks (inspection, lubrication, calibration)',
    mainTable: 'preventive_maintenance_tasks',
    joins: [],
    dateColumn: 'due_date',
    fields: [
      { id: 'estimated_duration_hours', name: 'Est. Duration (hrs)', type: 'number', aggregatable: true, column: 'estimated_duration_hours', description: 'Estimated duration' },
      { id: 'actual_duration_hours', name: 'Actual Duration (hrs)', type: 'number', aggregatable: true, column: 'actual_duration_hours', description: 'Actual time taken' },
      { id: 'parts_cost', name: 'Parts Cost', type: 'number', aggregatable: true, column: 'parts_cost', description: 'Cost of parts' },
      { id: 'labor_cost', name: 'Labor Cost', type: 'number', aggregatable: true, column: 'labor_cost', description: 'Labor cost' },
      { id: 'total_cost', name: 'Total Cost', type: 'number', aggregatable: true, column: 'total_cost', description: 'Total maintenance cost' },
      { id: 'completion_count', name: 'Completion Count', type: 'number', aggregatable: true, column: 'completion_count', description: 'Times completed' },
      { id: 'title', name: 'Task Title', type: 'text', aggregatable: false, column: 'title', description: 'Task title' },
      { id: 'maintenance_type', name: 'Type', type: 'text', aggregatable: false, column: 'maintenance_type', description: 'scheduled/routine/inspection/calibration/lubrication/cleaning' },
      { id: 'schedule_frequency', name: 'Frequency', type: 'text', aggregatable: false, column: 'schedule_frequency', description: 'daily/weekly/monthly/quarterly/yearly' },
      { id: 'priority', name: 'Priority', type: 'text', aggregatable: false, column: 'priority', description: 'low/medium/high/critical' },
      { id: 'status', name: 'Status', type: 'text', aggregatable: false, column: 'status', description: 'pending/in_progress/completed/overdue/cancelled' },
      { id: 'machine_id', name: 'Machine', type: 'text', aggregatable: false, column: 'machine_id', description: 'Machine ID' },
      { id: 'line_id', name: 'Line', type: 'text', aggregatable: false, column: 'line_id', description: 'Line ID' },
      { id: 'assigned_to', name: 'Assigned To', type: 'text', aggregatable: false, column: 'assigned_to', description: 'Technician assigned' },
      { id: 'is_recurring', name: 'Recurring', type: 'boolean', aggregatable: false, column: 'is_recurring', description: 'Is recurring task' },
      { id: 'due_date', name: 'Due Date', type: 'date', aggregatable: false, column: 'due_date', description: 'Due date' },
      { id: 'completed_at', name: 'Completed At', type: 'date', aggregatable: false, column: 'completed_at', description: 'Completion timestamp' },
    ],
  },

  // =========================================================================
  // 15. MAINTENANCE SCHEDULES (Frequency-based)
  // =========================================================================
  maintenance_schedules: {
    id: 'maintenance_schedules',
    name: 'Maintenance Schedules',
    description: 'Recurring maintenance schedules (daily/weekly/monthly)',
    mainTable: 'preventive_maintenance_schedules',
    joins: [],
    dateColumn: 'start_date',
    fields: [
      { id: 'frequency_value', name: 'Frequency Value', type: 'number', aggregatable: true, column: 'frequency_value', description: 'Frequency number' },
      { id: 'estimated_duration_hours', name: 'Est. Duration (hrs)', type: 'number', aggregatable: true, column: 'estimated_duration_hours', description: 'Estimated duration' },
      { id: 'name', name: 'Schedule Name', type: 'text', aggregatable: false, column: 'name', description: 'Schedule name' },
      { id: 'schedule_type', name: 'Schedule Type', type: 'text', aggregatable: false, column: 'schedule_type', description: 'daily/weekly/monthly/quarterly/yearly' },
      { id: 'frequency_unit', name: 'Frequency Unit', type: 'text', aggregatable: false, column: 'frequency_unit', description: 'days/weeks/months/years' },
      { id: 'machine_id', name: 'Machine', type: 'text', aggregatable: false, column: 'machine_id', description: 'Machine ID' },
      { id: 'line_id', name: 'Line', type: 'text', aggregatable: false, column: 'line_id', description: 'Line ID' },
      { id: 'is_active', name: 'Active', type: 'boolean', aggregatable: false, column: 'is_active', description: 'Is schedule active' },
      { id: 'start_date', name: 'Start Date', type: 'date', aggregatable: false, column: 'start_date', description: 'Schedule start date' },
    ],
  },

  // =========================================================================
  // 16. MACHINE BREAKDOWN
  // =========================================================================
  machine_breakdown: {
    id: 'machine_breakdown',
    name: 'Machine Breakdown',
    description: 'Emergency/unplanned machine breakdowns and repairs',
    mainTable: 'breakdown_maintenance_tasks',
    joins: [],
    dateColumn: 'reported_at',
    fields: [
      { id: 'downtime_hours', name: 'Downtime (hrs)', type: 'number', aggregatable: true, column: 'downtime_hours', description: 'Production downtime caused' },
      { id: 'estimated_duration_hours', name: 'Est. Duration (hrs)', type: 'number', aggregatable: true, column: 'estimated_duration_hours', description: 'Estimated repair time' },
      { id: 'actual_duration_hours', name: 'Actual Duration (hrs)', type: 'number', aggregatable: true, column: 'actual_duration_hours', description: 'Actual repair time' },
      { id: 'parts_cost', name: 'Parts Cost', type: 'number', aggregatable: true, column: 'parts_cost', description: 'Cost of parts' },
      { id: 'labor_cost', name: 'Labor Cost', type: 'number', aggregatable: true, column: 'labor_cost', description: 'Labor cost' },
      { id: 'total_cost', name: 'Total Cost', type: 'number', aggregatable: true, column: 'total_cost', description: 'Total breakdown cost' },
      { id: 'title', name: 'Issue Title', type: 'text', aggregatable: false, column: 'title', description: 'Breakdown title' },
      { id: 'breakdown_type', name: 'Breakdown Type', type: 'text', aggregatable: false, column: 'breakdown_type', description: 'emergency/corrective/urgent_repair' },
      { id: 'failure_category', name: 'Failure Category', type: 'text', aggregatable: false, column: 'failure_category', description: 'mechanical/electrical/hydraulic/pneumatic/software' },
      { id: 'impact_on_production', name: 'Production Impact', type: 'text', aggregatable: false, column: 'impact_on_production', description: 'critical/high/medium/low' },
      { id: 'priority', name: 'Priority', type: 'text', aggregatable: false, column: 'priority', description: 'low/medium/high/critical' },
      { id: 'status', name: 'Status', type: 'text', aggregatable: false, column: 'status', description: 'pending/in_progress/completed/overdue' },
      { id: 'machine_id', name: 'Machine', type: 'text', aggregatable: false, column: 'machine_id', description: 'Affected machine' },
      { id: 'line_id', name: 'Line', type: 'text', aggregatable: false, column: 'line_id', description: 'Affected line' },
      { id: 'reported_by', name: 'Reported By', type: 'text', aggregatable: false, column: 'reported_by', description: 'Who reported' },
      { id: 'assigned_to', name: 'Assigned To', type: 'text', aggregatable: false, column: 'assigned_to', description: 'Technician assigned' },
      { id: 'reported_at', name: 'Reported At', type: 'date', aggregatable: false, column: 'reported_at', description: 'When reported' },
      { id: 'due_date', name: 'Due Date', type: 'date', aggregatable: false, column: 'due_date', description: 'Target fix date' },
    ],
  },

  // =========================================================================
  // 17. MOLD BREAKDOWN
  // =========================================================================
  mold_breakdown: {
    id: 'mold_breakdown',
    name: 'Mold Breakdown',
    description: 'Emergency/unplanned mold breakdowns and repairs',
    mainTable: 'mold_breakdown_maintenance_tasks',
    joins: [],
    dateColumn: 'reported_at',
    fields: [
      { id: 'downtime_hours', name: 'Downtime (hrs)', type: 'number', aggregatable: true, column: 'downtime_hours', description: 'Production downtime caused' },
      { id: 'estimated_duration_hours', name: 'Est. Duration (hrs)', type: 'number', aggregatable: true, column: 'estimated_duration_hours', description: 'Estimated repair time' },
      { id: 'actual_duration_hours', name: 'Actual Duration (hrs)', type: 'number', aggregatable: true, column: 'actual_duration_hours', description: 'Actual repair time' },
      { id: 'parts_cost', name: 'Parts Cost', type: 'number', aggregatable: true, column: 'parts_cost', description: 'Cost of parts' },
      { id: 'labor_cost', name: 'Labor Cost', type: 'number', aggregatable: true, column: 'labor_cost', description: 'Labor cost' },
      { id: 'total_cost', name: 'Total Cost', type: 'number', aggregatable: true, column: 'total_cost', description: 'Total breakdown cost' },
      { id: 'title', name: 'Issue Title', type: 'text', aggregatable: false, column: 'title', description: 'Breakdown title' },
      { id: 'breakdown_type', name: 'Breakdown Type', type: 'text', aggregatable: false, column: 'breakdown_type', description: 'emergency/corrective/urgent_repair' },
      { id: 'impact_on_production', name: 'Production Impact', type: 'text', aggregatable: false, column: 'impact_on_production', description: 'critical/high/medium/low' },
      { id: 'priority', name: 'Priority', type: 'text', aggregatable: false, column: 'priority', description: 'low/medium/high/critical' },
      { id: 'status', name: 'Status', type: 'text', aggregatable: false, column: 'status', description: 'pending/in_progress/completed/overdue' },
      { id: 'mold_id', name: 'Mold', type: 'text', aggregatable: false, column: 'mold_id', description: 'Affected mold' },
      { id: 'machine_id', name: 'Machine', type: 'text', aggregatable: false, column: 'machine_id', description: 'Machine where mold installed' },
      { id: 'line_id', name: 'Line', type: 'text', aggregatable: false, column: 'line_id', description: 'Affected line' },
      // Mold-specific failure checkboxes
      { id: 'air_valve_pressure_broken', name: 'Air Valve Broken', type: 'boolean', aggregatable: false, column: 'air_valve_pressure_broken', description: 'Air valve pressure broken' },
      { id: 'valve_broken', name: 'Valve Broken', type: 'boolean', aggregatable: false, column: 'valve_broken', description: 'Valve broken' },
      { id: 'hrc_not_working', name: 'HRC Not Working', type: 'boolean', aggregatable: false, column: 'hrc_not_working', description: 'HRC system failed' },
      { id: 'heating_element_failed', name: 'Heating Element Failed', type: 'boolean', aggregatable: false, column: 'heating_element_failed', description: 'Heating element failed' },
      { id: 'cooling_channel_blocked', name: 'Cooling Channel Blocked', type: 'boolean', aggregatable: false, column: 'cooling_channel_blocked', description: 'Cooling channel blocked' },
      { id: 'ejector_pin_broken', name: 'Ejector Pin Broken', type: 'boolean', aggregatable: false, column: 'ejector_pin_broken', description: 'Ejector pin broken' },
      { id: 'cavity_damage', name: 'Cavity Damage', type: 'boolean', aggregatable: false, column: 'cavity_damage', description: 'Cavity damaged' },
      { id: 'core_damage', name: 'Core Damage', type: 'boolean', aggregatable: false, column: 'core_damage', description: 'Core damaged' },
      { id: 'reported_by', name: 'Reported By', type: 'text', aggregatable: false, column: 'reported_by', description: 'Who reported' },
      { id: 'assigned_to', name: 'Assigned To', type: 'text', aggregatable: false, column: 'assigned_to', description: 'Technician assigned' },
      { id: 'reported_at', name: 'Reported At', type: 'date', aggregatable: false, column: 'reported_at', description: 'When reported' },
      { id: 'due_date', name: 'Due Date', type: 'date', aggregatable: false, column: 'due_date', description: 'Target fix date' },
    ],
  },

  // =========================================================================
  // 18. DAILY WEIGHT REPORT (Quality)
  // =========================================================================
  daily_weight_report: {
    id: 'daily_weight_report',
    name: 'Daily Weight Report',
    description: 'Cavity weight quality tracking per time slot',
    mainTable: 'daily_weight_report',
    joins: [],
    dateColumn: 'production_date',
    fields: [
      { id: 'cycle_time', name: 'Cycle Time', type: 'number', aggregatable: true, column: 'cycle_time', description: 'Production cycle time' },
      { id: 'average_weight', name: 'Average Weight (g)', type: 'number', aggregatable: true, column: 'average_weight', description: 'Average cavity weight' },
      { id: 'line_id', name: 'Line', type: 'text', aggregatable: false, column: 'line_id', description: 'Production line' },
      { id: 'mold_name', name: 'Mold', type: 'text', aggregatable: false, column: 'mold_name', description: 'Mold name' },
      { id: 'time_slot', name: 'Time Slot', type: 'text', aggregatable: false, column: 'time_slot', description: 'Time slot (08:00-10:00 etc.)' },
      { id: 'color', name: 'Color', type: 'text', aggregatable: false, column: 'color', description: 'Product color' },
      { id: 'is_changeover_point', name: 'Changeover Point', type: 'boolean', aggregatable: false, column: 'is_changeover_point', description: 'Is mold changeover point' },
      { id: 'is_submitted', name: 'Submitted', type: 'boolean', aggregatable: false, column: 'is_submitted', description: 'Is entry submitted' },
      { id: 'submitted_by', name: 'Submitted By', type: 'text', aggregatable: false, column: 'submitted_by', description: 'Who submitted' },
      { id: 'production_date', name: 'Production Date', type: 'date', aggregatable: false, column: 'production_date', description: 'Production date' },
      { id: 'entry_date', name: 'Entry Date', type: 'date', aggregatable: false, column: 'entry_date', description: 'Entry date' },
    ],
  },

  // =========================================================================
  // 19. FIRST PIECES APPROVAL (Quality)
  // =========================================================================
  first_pieces_approval: {
    id: 'first_pieces_approval',
    name: 'First Pieces Approval (FPA)',
    description: 'First piece quality inspection and approval',
    mainTable: 'first_pieces_approval',
    joins: [],
    dateColumn: 'production_date',
    fields: [
      { id: 'no_of_cavity', name: 'No. of Cavities', type: 'number', aggregatable: true, column: 'no_of_cavity', description: 'Number of cavities' },
      { id: 'line_id', name: 'Line', type: 'text', aggregatable: false, column: 'line_id', description: 'Production line' },
      { id: 'line_no', name: 'Line No', type: 'text', aggregatable: false, column: 'line_no', description: 'Line number' },
      { id: 'mold_name', name: 'Mold', type: 'text', aggregatable: false, column: 'mold_name', description: 'Mold name' },
      { id: 'product_name', name: 'Product', type: 'text', aggregatable: false, column: 'product_name', description: 'Product name' },
      { id: 'material_grade', name: 'Material Grade', type: 'text', aggregatable: false, column: 'material_grade', description: 'Raw material grade' },
      { id: 'color', name: 'Color', type: 'text', aggregatable: false, column: 'color', description: 'Product color' },
      { id: 'shift', name: 'Shift', type: 'text', aggregatable: false, column: 'shift', description: 'DAY or NIGHT' },
      { id: 'cycle_time', name: 'Cycle Time', type: 'text', aggregatable: false, column: 'cycle_time', description: 'Production cycle time' },
      { id: 'is_submitted', name: 'Submitted', type: 'boolean', aggregatable: false, column: 'is_submitted', description: 'Is entry submitted' },
      { id: 'submitted_by', name: 'Submitted By', type: 'text', aggregatable: false, column: 'submitted_by', description: 'Who submitted' },
      { id: 'production_date', name: 'Production Date', type: 'date', aggregatable: false, column: 'production_date', description: 'Production date' },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDataSource(id: DataSourceId): DataSource | undefined {
  return DATA_SOURCES[id];
}

export function getAllDataSources(): DataSource[] {
  return Object.values(DATA_SOURCES);
}

export function getAggregatableFields(dataSourceId: DataSourceId): DataSourceField[] {
  const ds = DATA_SOURCES[dataSourceId];
  return ds ? ds.fields.filter(f => f.aggregatable) : [];
}

export function getGroupableFields(dataSourceId: DataSourceId): DataSourceField[] {
  const ds = DATA_SOURCES[dataSourceId];
  return ds ? ds.fields.filter(f => !f.aggregatable || f.type === 'text' || f.type === 'date') : [];
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

export type AggregationFunction = 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT';

export const AGGREGATION_FUNCTIONS: { id: AggregationFunction; name: string; description: string }[] = [
  { id: 'SUM', name: 'Sum', description: 'Total of all values' },
  { id: 'COUNT', name: 'Count', description: 'Number of records' },
  { id: 'AVG', name: 'Average', description: 'Average value' },
  { id: 'MIN', name: 'Minimum', description: 'Smallest value' },
  { id: 'MAX', name: 'Maximum', description: 'Largest value' },
  { id: 'COUNT_DISTINCT', name: 'Count Distinct', description: 'Number of unique values' },
];
