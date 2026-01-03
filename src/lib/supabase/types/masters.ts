export interface ColorLabel {
  id: string;
  sr_no: number;
  color_label: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface PartyName {
  id: string;
  name: string;
  code?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}
