// Store Types
export interface GRN {
  id: string;
  doc_no: string;
  date: string;
  supplier_name?: string;
  party_name?: string; // Alternative to supplier_name
  po_no?: string;
  po_date?: string;
  invoice_no?: string;
  invoice_date?: string;
  type_of_material?: 'RM' | 'PM' | 'STORE';
  grn_no?: string;
  grn_date?: string;
  received_by?: string;
  verified_by?: string;
  indent_slip_id?: string; // Link to Material Indent Slip
  grn_type?: 'NORMAL' | 'JW_ANNEXURE'; // GRN Type
  lr_no?: string;
  vehicle_no?: string;
  lr_date?: string;
  lr_vehicle_no?: string;
  dc_no?: string;
  dc_date?: string;
  remarks?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  stock_status?: string;
}

export interface GRNItem {
  id: string;
  grn_id: string;
  sr_no: number;
  item_description: string;
  box_bag?: string;
  per_box_bag_qty?: number;
  total_qty?: number;
  uom?: string;
  remarks?: string;
  created_at?: string;
}

export interface MIS {
  id: string;
  doc_no: string;
  memo_no?: string;
  date: string;
  dept_name: string;
  issue_no: string;
  issue_date: string;
  prepared_by?: string;
  authorized_sign?: string;
  receiver_sign?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  stock_status?: string;
}

export interface MISItem {
  id: string;
  mis_id: string;
  sr_no: number;
  description_of_material: string;
  item_code?: string;
  uom?: string;
  required_qty?: number;
  issue_qty?: number;
  remarks?: string;
  created_at?: string;
}

export interface FGN {
  id: string;
  doc_no: string;
  date: string;
  from_dept: string;
  to_dept: string;
  transfer_no: string;
  transfer_date_time?: string;
  shift_incharge_name_sign?: string;
  qc_inspector_name_sign?: string;
  fg_received_name_sign?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FGNItem {
  id: string;
  fgn_id: string;
  sr_no: number;
  item_name: string;
  no_of_boxes?: number;
  qty_in_box?: number;
  total_qty?: number;
  received_qty?: number;
  qc_check?: string;
  remarks?: string;
  created_at?: string;
}

export interface JobWorkChallan {
  id: string;
  doc_no: string;
  sr_no: string;
  date: string;
  jobwork_annexure_no?: string;
  jobwork_annexure_date?: string;
  party_name: string;
  party_address?: string;
  gst_no?: string;
  vehicle_no?: string;
  lr_no?: string; // Kept for backward compatibility (was Dispatch Doc No)
  e_way_bill_no?: string; // E-Way Bill Number
  place_of_supply?: string; // Place of Supply
  challan_no?: string;
  challan_date?: string;
  total_qty?: number;
  prepared_by?: string;
  checked_by?: string;
  authorized_signatory?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  stock_status?: string;
  posted_to_stock_at?: string;
  posted_to_stock_by?: string;
}

export interface JobWorkChallanItem {
  id: string;
  challan_id: string;
  sr_no: number;
  item_code?: string; // Links to stock_items.item_code (FG stock)
  item_name?: string; // Item name (replaces material_description in UI)
  material_description: string; // Kept for backward compatibility
  qty?: number;
  qty_pcs?: number; // Quantity in pieces (Pcs)
  uom?: string;
  remarks?: string;
  created_at?: string;
}
