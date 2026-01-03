export interface ProductionBlock {
  id: string;
  line_id: string;
  start_day: string; // Date string in DD-MM-YYYY format (e.g., "3-12-2025")
  end_day: string; // Date string in DD-MM-YYYY format (e.g., "3-12-2025")
  duration: number;
  label: string;
  color: string;
  mold_id?: string;
  production_day_start_time?: string; // TIME format
  is_changeover?: boolean;
  is_changeover_block?: boolean;
  changeover_start_day?: string; // Date string in DD-MM-YYYY format
  changeover_end_day?: string; // Date string in DD-MM-YYYY format
  changeover_time?: number;
  changeover_time_string?: string;
  changeover_time_mode?: 'minutes' | 'time';
  changeover_mold_id?: string;
  changeover_datetime?: string;
  notes?: string;
  is_resizing_left?: boolean;
  planning_month: number;
  planning_year: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionBlockColorSegment {
  id?: number;
  block_id: string;
  color: string;
  label?: string;
  start_day_offset: number;
  end_day_offset: number;
  created_at?: string;
}

export interface ProductionBlockProductColor {
  id?: number;
  block_id: string;
  color: string;
  quantity: number;
  party_code?: string;
  is_changeover?: boolean; // True if this is for a changeover block
  created_at?: string;
  updated_at?: string;
}

export interface ProductionBlockPackingMaterial {
  id?: number;
  block_id: string;
  category: 'boxes' | 'polybags' | 'bopp';
  packing_material_id: string; // UUID
  quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionBlockPartyCode {
  id?: number;
  block_id: string;
  party_code: string;
  is_changeover?: boolean; // True if this is for a changeover block
  created_at?: string;
}

// Production Block with all related data
export interface ProductionBlockWithRelations extends ProductionBlock {
  color_segments?: ProductionBlockColorSegment[];
  product_colors?: ProductionBlockProductColor[];
  packing_materials?: ProductionBlockPackingMaterial[];
  party_codes?: ProductionBlockPartyCode[];
}
