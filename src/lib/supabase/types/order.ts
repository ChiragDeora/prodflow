// Order Book Types
export interface OrderBook {
  id: string;
  doc_no: string;
  po_number: string;
  order_date: string;
  customer_name: string;
  customer_address?: string;
  customer_contact?: string;
  customer_email?: string;
  delivery_date?: string;
  status: string;
  total_amount?: number;
  gst_percentage?: number;
  gst_amount?: number;
  final_amount?: number;
  payment_terms?: string;
  delivery_terms?: string;
  remarks?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderBookItem {
  id: string;
  order_book_id: string;
  sr_no: number;
  part_code: string;
  part_name?: string;
  description?: string;
  quantity: number;
  delivered_qty?: number;
  pending_qty?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  delivery_schedule?: string;
  status?: string;
  remarks?: string;
  created_at?: string;
}

export interface DeliveryChallanItem {
  id: string;
  challan_id: string;
  sr_no: number;
  material_description: string;
  qty?: number;
  uom?: string;
  remarks?: string;
  created_at?: string;
}
