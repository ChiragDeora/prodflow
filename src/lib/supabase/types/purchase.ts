// Purchase Types
export interface VendorRegistration {
  id: string;
  customer_name: string;
  address: string;
  contact_no?: string;
  email_id?: string;
  gst_no?: string;
  pan_no?: string;
  customer_supplier?: 'Customer' | 'Supplier';
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  bank_branch?: string;
  account_holder_name?: string;
  account_type?: 'Savings' | 'Current' | 'Other';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialIndentSlip {
  id: string;
  doc_no?: string; // Legacy field, kept for backward compatibility
  ident_no?: string; // New field for Indent Number
  date: string;
  indent_date: string;
  tentative_required_date?: string;
  party_name?: string;
  address?: string;
  state?: string;
  gst_no?: string;
  dept_head_sign?: string;
  store_inch_sign?: string;
  plant_head_sign?: string;
  status?: 'OPEN' | 'CLOSED_PERFECT' | 'CLOSED_OVER_RECEIVED' | 'MANUALLY_CLOSED';
  // Legacy fields kept for backward compatibility
  department_name?: string;
  person_name?: string;
  sr_no?: string;
  to_address?: string;
  purchase_store_incharge?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialIndentSlipItem {
  id: string;
  indent_slip_id: string;
  sr_no: number;
  item_code?: string;
  item_name?: string;
  dimension?: string;
  pack_size?: string;
  qty?: number;
  uom?: string;
  party_name?: string;
  color_remarks?: string;
  received_qty?: number;
  pending_qty?: number;
  created_at?: string;
  // Legacy fields kept for backward compatibility
  description_specification?: string;
  make_mfg_remarks?: string;
}

export interface PurchaseOrder {
  id: string;
  doc_no: string;
  po_no: string;
  date: string;
  ref_date?: string;
  party_name?: string;
  address?: string;
  state?: string;
  gst_no?: string;
  reference?: string;
  total_amt?: number;
  gst_percentage?: number;
  gst_amount?: number;
  final_amt?: number;
  amount_in_words?: string;
  in_favour_of?: string;
  inspection?: string;
  authorized_signatory?: string;
  delivery_address?: string;
  delivery_terms?: string;
  payment_terms?: string;
  packing_charges?: string;
  warranty?: string;
  other_terms?: string;
  indent_slip_id?: string; // Link to Material Indent Slip
  po_type?: 'CAPITAL' | 'OPERATIONAL'; // PO Type
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy field kept for backward compatibility
  to_address?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  sr_no: number;
  description: string;
  qty?: number;
  unit?: string;
  rate?: number;
  total_price?: number;
  created_at?: string;
  // Legacy field kept for backward compatibility
  unit_price?: number;
}

// Types for JW Annexure GRN
export interface JWAnnexureGRN {
  id: string;
  doc_no: string;
  date: string;
  jw_no?: string;
  jw_date?: string;
  indent_no?: string;
  indent_date?: string;
  challan_no?: string;
  challan_date?: string;
  party_name?: string;
  address?: string;
  state?: string;
  gst_no?: string;
  total_value?: number;
  indent_slip_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface JWAnnexureGRNItem {
  id?: string;
  jw_annexure_grn_id?: string;
  sr_no?: number;
  item_code?: string;
  item_name?: string;
  indent_qty?: number;
  rcd_qty?: number;
  rate?: number;
  net_value?: number;
  created_at?: string;
}
