export interface BOMMaster {
  id: string;
  category?: 'SFG' | 'FG' | 'LOCAL'; // Made optional since tables don't have this column
  status: 'draft' | 'released' | 'archived';
  created_by: string;
  created_at?: string;
  updated_at?: string;
  
  // Common fields
  sl_no: number;
  
  // SFG-specific fields
  item_name?: string;
  sfg_code?: string;
  pcs?: number;
  part_weight_gm_pcs?: number;
  colour?: string;
  hp_percentage?: number;
  icp_percentage?: number;
  rcp_percentage?: number;
  ldpe_percentage?: number;
  gpps_percentage?: number;
  mb_percentage?: number;
  
  // FG-specific fields
  item_code?: string;
  party_name?: string;
  pack_size?: string;
  sfg_1?: string;
  sfg_1_qty?: number;
  sfg_2?: string;
  sfg_2_qty?: number;
  cnt_code?: string;
  cnt_qty?: number;
  polybag_code?: string;
  poly_qty?: number;
  bopp_1?: string;
  qty_meter?: number;
  bopp_2?: string;
  qty_meter_2?: number;
  
  // LOCAL-specific fields (same as FG)
}

export interface BOMVersion {
  id: string;
  bom_master_id: string;
  version_number: number;
  version_name?: string;
  is_active: boolean;
  components: BOMComponent[];
  total_components: number;
  total_cost: number;
  notes?: string;
  change_reason?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface BOMComponent {
  id: string;
  bom_version_id: string;
  component_code: string;
  component_name: string;
  component_type: 'raw_material' | 'packing_material' | 'sub_assembly' | 'other';
  quantity: number;
  unit_of_measure: string;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  lead_time_days?: number;
  is_critical: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BOMAudit {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  changed_by: string;
  changed_at?: string;
  change_reason?: string;
  ip_address?: string;
  user_agent?: string;
}

// BOM Master with versions view
export interface BOMMasterWithVersions extends BOMMaster {
  total_versions: number;
  latest_version: number;
  active_version?: number;
}

// BOM Version with components view
export interface BOMVersionWithComponents extends BOMVersion {
  product_code: string;
  product_name: string;
  category: 'SFG' | 'FG' | 'LOCAL';
  component_count: number;
  calculated_total_cost: number;
}
