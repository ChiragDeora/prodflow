// Dispatch Types
export interface DispatchMemo {
  id: string;
  doc_no: string;
  memo_no: string;
  date: string;
  party_name: string;
  location: string;
  prepared_by?: string;
  checked_by?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DispatchMemoItem {
  id: string;
  memo_id: string;
  sr_no: number;
  item_name: string;
  no_box?: string;
  remarks?: string;
  created_at?: string;
}

export interface DeliveryChallan {
  id: string;
  doc_no: string;
  sr_no: string;
  date: string;
  vehicle_no?: string;
  lr_no?: string;
  returnable: boolean;
  to_address: string;
  state?: string;
  total_qty?: number;
  received_by?: string;
  prepared_by?: string;
  checked_by?: string;
  authorized_signatory?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
