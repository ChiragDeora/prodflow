export interface Machine {
  machine_id: string;
  make: string;
  model: string;
  size: number;
  capacity_tons: number;
  type: string;
  category: string; // Field for category (IM, Robot, Aux, Utility, etc.)
  clm_sr_no?: string;
  inj_serial_no?: string;
  serial_no?: string; // Combined serial number field
  mfg_date?: string;
  install_date: string;
  dimensions?: string; // LxBxH format or x,y,z for robots x yz variables itself will be mentiond in the column
  grinding_available: boolean;
  status: 'Active' | 'Maintenance' | 'Idle';
  line?: string; // Reference to the line this machine belongs to (e.g., LINE-001, LINE-002)
  purchase_date: string;
  remarks: string;
  nameplate_image?: string;
  nameplate_details?: string;
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  created_at?: string;
  updated_at?: string;
}

export interface Mold {
  mold_id: string;
  mold_name: string;
  maker: string;
  cavities: number;
  purchase_date: string;
  compatible_machines: string[];
  // Enhanced mold master fields
  sr_no?: string;
  type?: string;
  cavity?: number;
  cycle_time?: number;
  dwg_wt?: number; // Drawing Weight
  std_wt?: number; // Standard Weight
  rp_wt?: number; // RP Weight
  dimensions?: string;
  mold_wt?: number; // Mold Weight
  hrc_make?: string;
  hrc_zone?: string;
  make?: string;
  start_date?: string;
  make_dwg_image?: string; // Make Drawing Image (Base64 or URL)
  rp_dwg_image?: string; // RP Drawing Image (Base64 or URL)
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  // Legacy fields for backward compatibility
  item_code?: string;
  item_name?: string;
  st_wt?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleJob {
  schedule_id: string;
  date: string;
  shift: 'Day' | 'Evening' | 'Night';
  machine_id: string;
  mold_id: string;
  start_time: string;
  end_time: string;
  color: string;
  expected_pieces: number;
  stacks_per_box: number;
  pieces_per_stack: number;
  created_by: string;
  is_done: boolean;
  done_timestamp: string | null;
  approved_by: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}
