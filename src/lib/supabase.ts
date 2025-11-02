import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please check your .env file has:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add better error handling
export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  if (error?.message) {
    console.error('Error message:', error.message);
  }
  if (error?.details) {
    console.error('Error details:', error.details);
  }
  if (error?.hint) {
    console.error('Error hint:', error.hint);
  }
};

// Database types



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

export interface RawMaterial {
  id: string;
  sl_no: number;
  category: string; // PP, PE, etc.
  type: string; // HP, ICP, RCP, LDPE, MB, etc.
  grade: string; // HJ333MO, 1750 MN, etc.
  supplier: string; // Borouge, IOCL, Basell, etc.
  mfi: number | null; // Melt Flow Index
  density: number | null; // Density in g/cm³
  tds_image?: string; // Base64 encoded TDS image or URL
  remark?: string; // Additional remarks
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  created_at?: string;
  updated_at?: string;
}

export interface PackingMaterial {
  id?: string;
  category: string; // Boxes, PolyBags, Bopp
  type: string; // Export, Local, etc.
  item_code: string; // CTN-Ro16, etc.
  pack_size: string; // 150, 800, etc.
  dimensions: string; // LxBxH format
  technical_detail: string; // Technical specifications
  brand: string; // Regular, Gesa, etc.
  cbm?: number; // Cubic meter measurement - area that flat box would take
  artwork?: string; // Artwork image data or URL
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  name: string;
  description?: string;
  location?: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  created_at?: string;
  updated_at?: string;
}

export interface UnitManagementSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Line {
  line_id: string;
  // line_name?: string;
  description?: string;
  im_machine_id?: string;
  robot_machine_id?: string;
  conveyor_machine_id?: string;
  hoist_machine_id?: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  unit?: string;
  created_at?: string;
  updated_at?: string;
}

// Maintenance Management Types
export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  task_type: 'preventive' | 'corrective' | 'emergency' | 'line_maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  assigned_to?: string;
  assigned_by?: string;
  due_date: string;
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  checklist_items?: any;
  parts_required?: any;
  cost_estimate?: number;
  actual_cost?: number;
  notes?: string;
}

export interface MaintenanceSchedule {
  id: string;
  name: string;
  description?: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  frequency_value: number;
  frequency_unit: 'days' | 'weeks' | 'months' | 'years';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  task_template_id?: string;
  checklist_template?: any;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceChecklist {
  id: string;
  name: string;
  description?: string;
  checklist_type: 'machine' | 'line' | 'general';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  items: any;
  estimated_duration_minutes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceHistory {
  id: string;
  task_id: string;
  machine_id?: string;
  line_id?: string;
  unit?: string;
  action_type: 'created' | 'started' | 'updated' | 'completed' | 'cancelled';
  action_description?: string;
  performed_by?: string;
  performed_at?: string;
  metadata?: any;
}

// BOM Master Types
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
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialIndentSlip {
  id: string;
  doc_no: string;
  date: string;
  department_name: string;
  person_name: string;
  sr_no: string;
  indent_date: string;
  to_address: string;
  purchase_store_incharge?: string;
  tentative_required_date?: string;
  dept_head_sign?: string;
  store_inch_sign?: string;
  plant_head_sign?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialIndentSlipItem {
  id: string;
  indent_slip_id: string;
  sr_no: number;
  description_specification: string;
  qty?: number;
  uom?: string;
  make_mfg_remarks?: string;
  created_at?: string;
}

export interface PurchaseOrder {
  id: string;
  doc_no: string;
  po_no: string;
  date: string;
  to_address: string;
  reference?: string;
  total_amt?: number;
  gst_percentage?: number;
  gst_amount?: number;
  final_amt?: number;
  amount_in_words?: string;
  in_favour_of?: string;
  inspection?: string;
  authorized_signatory?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  sr_no: number;
  description: string;
  qty?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  created_at?: string;
}

// Store Types
export interface GRN {
  id: string;
  doc_no: string;
  date: string;
  supplier_name: string;
  po_no?: string;
  po_date?: string;
  invoice_no?: string;
  invoice_date?: string;
  type_of_material?: 'RM' | 'PM' | 'STORE';
  grn_no?: string;
  grn_date?: string;
  received_by?: string;
  verified_by?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
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
}

export interface MISItem {
  id: string;
  mis_id: string;
  sr_no: number;
  description_of_material: string;
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

// CRUD Operations for Machines
export const machineAPI = {
  // Get all machines
  async getAll(): Promise<Machine[]> {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*');
      
      if (error) {
        handleSupabaseError(error, 'fetching machines');
        throw error;
      }
      
      // Apply custom sorting order to match the image
      const categoryOrder = [
        'JSW', 'HAIT', 'TOYO', 'WITT', 'SWTK', 'CONY', 'Hoist', 
        'Chiller', 'AIR', 'ELEC', 'Pump', 'CTower', 'Blower', 
        'Grinding', 'PPACK', 'SILO', 'LIFT', 'Stacker', 'Cooler', 'RO'
      ];
      
      const sortedData = (data || []).sort((a, b) => {
        const getCategoryFromId = (id: string) => {
          for (const category of categoryOrder) {
            if (id.startsWith(category)) {
              return category;
            }
          }
          return 'OTHER';
        };
        
        const aCategory = getCategoryFromId(a.machine_id);
        const bCategory = getCategoryFromId(b.machine_id);
        
        // First compare by category order
        const aCategoryIndex = categoryOrder.indexOf(aCategory);
        const bCategoryIndex = categoryOrder.indexOf(bCategory);
        
        if (aCategoryIndex !== bCategoryIndex) {
          return aCategoryIndex - bCategoryIndex;
        }
        
        // If same category, compare by number
        const extractNumber = (id: string) => {
          const match = id.match(/(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        };
        
        const aNum = extractNumber(a.machine_id);
        const bNum = extractNumber(b.machine_id);
        
        return aNum - bNum;
      });
      
      console.log('✅ Successfully fetched', sortedData.length, 'machines');
      return sortedData;
    } catch (error) {
      console.error('❌ Failed to fetch machines:', error);
      throw error;
    }
  },

  // Get machine by ID
  async getById(machineId: string): Promise<Machine | null> {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('machine_id', machineId)
      .single();
    
    if (error) {
      console.error('Error fetching machine:', error);
      return null;
    }
    return data;
  },

  // Create new machine
  async create(machine: Omit<Machine, 'created_at' | 'updated_at'>): Promise<Machine | null> {
    const { data, error } = await supabase
      .from('machines')
      .insert([machine])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating machine:', error);
      throw error;
    }
    return data;
  },

  // Update machine
  async update(machineId: string, updates: Partial<Machine>): Promise<Machine | null> {
    const { data, error } = await supabase
      .from('machines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('machine_id', machineId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating machine:', error);
      throw error;
    }
    return data;
  },

  // Delete machine
  async delete(machineId: string): Promise<boolean> {
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('machine_id', machineId);
    
    if (error) {
      console.error('Error deleting machine:', error);
      throw error;
    }
    return true;
  },

  // Bulk create machines from Excel
  async bulkCreate(machines: Omit<Machine, 'created_at' | 'updated_at'>[]): Promise<Machine[]> {
    const { data, error } = await supabase
      .from('machines')
      .insert(machines)
      .select();
    
    if (error) {
      console.error('Error bulk creating machines:', error);
      throw error;
    }
    return data || [];
  }
};

// CRUD Operations for Molds
export const moldAPI = {
  // Get all molds
  async getAll(): Promise<Mold[]> {
    const { data, error } = await supabase
      .from('molds')
      .select('*')
      .order('sr_no', { ascending: true });
    
    if (error) {
      console.error('Error fetching molds:', error);
      throw error;
    }
    
    // Sort the data properly for alphanumeric sr_no values
    const sortedData = (data || []).sort((a, b) => {
      const srNoA = a.sr_no || '';
      const srNoB = b.sr_no || '';
      
      // Extract numeric part for proper sorting
      const extractNumber = (str: string) => {
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const numA = extractNumber(srNoA);
      const numB = extractNumber(srNoB);
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // If numbers are the same, sort alphabetically
      return srNoA.localeCompare(srNoB);
    });
    
    return sortedData;
  },

  // Get mold by ID
  async getById(moldId: string): Promise<Mold | null> {
    const { data, error } = await supabase
      .from('molds')
      .select('*')
      .eq('mold_id', moldId)
      .single();
    
    if (error) {
      console.error('Error fetching mold:', error);
      return null;
    }
    return data;
  },

  // Create new mold
  async create(mold: Omit<Mold, 'created_at' | 'updated_at'>): Promise<Mold | null> {
    const { data, error } = await supabase
      .from('molds')
      .insert([mold])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating mold:', error);
      throw error;
    }
    return data;
  },

  // Update mold
  async update(moldId: string, updates: Partial<Mold>): Promise<Mold | null> {
    const { data, error } = await supabase
      .from('molds')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('mold_id', moldId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating mold:', error);
      throw error;
    }
    return data;
  },

  // Delete mold
  async delete(moldId: string): Promise<boolean> {
    const { error } = await supabase
      .from('molds')
      .delete()
      .eq('mold_id', moldId);
    
    if (error) {
      console.error('Error deleting mold:', error);
      throw error;
    }
    return true;
  },

  // Bulk create molds from Excel
  async bulkCreate(molds: Omit<Mold, 'created_at' | 'updated_at'>[]): Promise<Mold[]> {
    const { data, error } = await supabase
      .from('molds')
      .insert(molds)
      .select();
    
    if (error) {
      console.error('Error bulk creating molds:', error);
      throw error;
    }
    return data || [];
  }
};

// CRUD Operations for Schedule Jobs
export const scheduleAPI = {
  // Get all schedule jobs
  async getAll(): Promise<ScheduleJob[]> {
    const { data, error } = await supabase
      .from('schedule_jobs')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching schedule jobs:', error);
      throw error;
    }
    return data || [];
  },

  // Get schedule jobs by date
  async getByDate(date: string): Promise<ScheduleJob[]> {
    const { data, error } = await supabase
      .from('schedule_jobs')
      .select('*')
      .eq('date', date)
      .order('start_time');
    
    if (error) {
      console.error('Error fetching schedule jobs by date:', error);
      throw error;
    }
    return data || [];
  },

  // Get schedule job by ID
  async getById(scheduleId: string): Promise<ScheduleJob | null> {
    const { data, error } = await supabase
      .from('schedule_jobs')
      .select('*')
      .eq('schedule_id', scheduleId)
      .single();
    
    if (error) {
      console.error('Error fetching schedule job:', error);
      return null;
    }
    return data;
  },

  // Create new schedule job
  async create(job: Omit<ScheduleJob, 'created_at' | 'updated_at'>): Promise<ScheduleJob | null> {
    const { data, error } = await supabase
      .from('schedule_jobs')
      .insert([job])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating schedule job:', error);
      throw error;
    }
    return data;
  },

  // Update schedule job
  async update(scheduleId: string, updates: Partial<ScheduleJob>): Promise<ScheduleJob | null> {
    const { data, error } = await supabase
      .from('schedule_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('schedule_id', scheduleId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating schedule job:', error);
      throw error;
    }
    return data;
  },

  // Delete schedule job
  async delete(scheduleId: string): Promise<boolean> {
    const { error } = await supabase
      .from('schedule_jobs')
      .delete()
      .eq('schedule_id', scheduleId);
    
    if (error) {
      console.error('Error deleting schedule job:', error);
      throw error;
    }
    return true;
  },

  // Bulk create schedule jobs from Excel
  async bulkCreate(jobs: Omit<ScheduleJob, 'created_at' | 'updated_at'>[]): Promise<ScheduleJob[]> {
    const { data, error } = await supabase
      .from('schedule_jobs')
      .insert(jobs)
      .select();
    
    if (error) {
      console.error('Error bulk creating schedule jobs:', error);
      throw error;
    }
    return data || [];
  },

  // Mark job as done
  async markDone(scheduleId: string, doneBy: string): Promise<ScheduleJob | null> {
    return this.update(scheduleId, {
      is_done: true,
      done_timestamp: new Date().toISOString(),
      created_by: doneBy
    });
  },

  // Approve job
  async approve(scheduleId: string, approvedBy: string): Promise<ScheduleJob | null> {
    return this.update(scheduleId, {
      approval_status: 'approved',
      approved_by: approvedBy
    });
  }
};

// CRUD Operations for Raw Materials
export const rawMaterialAPI = {
  // Get all raw materials
  async getAll(): Promise<RawMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('sl_no');
      
      if (error) {
        console.error('Error fetching raw materials:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'fetching raw materials');
      return [];
    }
  },

  // Get raw material by ID
  async getById(id: string): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching raw material:', error);
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching raw material');
      return null;
    }
  },

  // Get raw material by type (primary key)
  async getByType(type: string): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('type', type)
        .single();
      
      if (error) {
        console.error('Error fetching raw material by type:', error);
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching raw material by type');
      return null;
    }
  },

  // Get raw material by type, grade, and supplier (composite key)
  async getByTypeGradeSupplier(type: string, grade: string, supplier: string): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('type', type)
        .eq('grade', grade)
        .eq('supplier', supplier)
        .single();
      
      if (error) {
        console.error('Error fetching raw material by composite key:', error);
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching raw material by composite key');
      return null;
    }
  },

  // Create new raw material
  async create(rawMaterial: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert([rawMaterial])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating raw material:', error);
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating raw material');
      throw error;
    }
  },

  // Update raw material
  async update(id: string, updates: Partial<RawMaterial>): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating raw material:', error);
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating raw material');
      throw error;
    }
  },

  // Delete raw material
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting raw material:', error);
        throw error;
      }
      return true;
    } catch (error) {
      handleSupabaseError(error, 'deleting raw material');
      throw error;
    }
  },

  // Bulk create raw materials from Excel
  async bulkCreate(rawMaterials: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>[]): Promise<RawMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert(rawMaterials)
        .select();
      
      if (error) {
        console.error('Error bulk creating raw materials:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'bulk creating raw materials');
      throw error;
    }
  }
};

// CRUD Operations for Packing Materials
export const packingMaterialAPI = {
  // Get all packing materials
  async getAll(): Promise<PackingMaterial[]> {
    const { data, error } = await supabase
      .from('packing_materials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get packing material by ID
  async getById(id: string): Promise<PackingMaterial | null> {
    const { data, error } = await supabase
      .from('packing_materials')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new packing material
  async create(packingMaterial: Omit<PackingMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<PackingMaterial | null> {
    const { data, error } = await supabase
      .from('packing_materials')
      .insert(packingMaterial)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update packing material
  async update(id: string, updates: Partial<PackingMaterial>): Promise<PackingMaterial | null> {
    const { data, error } = await supabase
      .from('packing_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete packing material
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('packing_materials')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Bulk create packing materials from Excel
  async bulkCreate(packingMaterials: Omit<PackingMaterial, 'id' | 'created_at' | 'updated_at'>[]): Promise<PackingMaterial[]> {
    const { data, error } = await supabase
      .from('packing_materials')
      .insert(packingMaterials)
      .select();
    
    if (error) {
      console.error('Error bulk creating packing materials:', error);
      throw error;
    }
    return data || [];
  }
};

// CRUD Operations for Units
export const unitAPI = {
  // Get all units
  async getAll(): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get unit by ID
  async getById(id: string): Promise<Unit | null> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new unit
  async create(unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>): Promise<Unit | null> {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update unit
  async update(id: string, updates: Partial<Unit>): Promise<Unit | null> {
    const { data, error } = await supabase
      .from('units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete unit
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// CRUD Operations for Unit Management Settings
export const unitManagementSettingsAPI = {
  // Get all settings
  async getAll(): Promise<UnitManagementSetting[]> {
    const { data, error } = await supabase
      .from('unit_management_settings')
      .select('*')
      .order('setting_key', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get setting by key
  async getByKey(key: string): Promise<UnitManagementSetting | null> {
    const { data, error } = await supabase
      .from('unit_management_settings')
      .select('*')
      .eq('setting_key', key)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update setting
  async updateSetting(key: string, value: string): Promise<UnitManagementSetting | null> {
    const { data, error } = await supabase
      .from('unit_management_settings')
      .update({ setting_value: value })
      .eq('setting_key', key)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Check if unit management is enabled
  async isUnitManagementEnabled(): Promise<boolean> {
    try {
      const setting = await this.getByKey('unit_management_enabled');
      return setting?.setting_value === 'true';
    } catch (error) {
      console.error('Error checking unit management setting:', error);
      return false;
    }
  },

  // Get default unit
  async getDefaultUnit(): Promise<string> {
    try {
      const setting = await this.getByKey('default_unit');
      return setting?.setting_value || 'Unit 1';
    } catch (error) {
      console.error('Error getting default unit:', error);
      return 'Unit 1';
    }
  }
};

// CRUD Operations for Lines
export const lineAPI = {
  // Get all lines
  async getAll(): Promise<Line[]> {
    try {
      const { data, error } = await supabase
        .from('lines')
        .select('*')
        .order('line_id', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching lines');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'lines');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch lines:', error);
      throw error;
    }
  },

  // Get line by ID
  async getById(lineId: string): Promise<Line | null> {
    const { data, error } = await supabase
      .from('lines')
      .select('*')
      .eq('line_id', lineId)
      .single();
    
    if (error) {
      console.error('Error fetching line:', error);
      return null;
    }
    return data;
  },

  // Create new line
  async create(line: Omit<Line, 'line_id' | 'created_at' | 'updated_at'>): Promise<Line | null> {
    const { data, error } = await supabase
      .from('lines')
      .insert(line)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'creating line');
      throw error;
    }
    
    console.log('✅ Successfully created line:', data?.line_id);
    return data;
  },

  // Update line
  async update(lineId: string, updates: Partial<Line>): Promise<Line | null> {
    const { data, error } = await supabase
      .from('lines')
      .update(updates)
      .eq('line_id', lineId)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating line');
      throw error;
    }
    
    console.log('✅ Successfully updated line:', data?.line_id);
    return data;
  },

  // Delete line
  async delete(lineId: string): Promise<void> {
    const { error } = await supabase
      .from('lines')
      .delete()
      .eq('line_id', lineId);
    
    if (error) {
      handleSupabaseError(error, 'deleting line');
      throw error;
    }
    
    console.log('✅ Successfully deleted line:', lineId);
  },

  // Get lines by unit
  async getByUnit(unit: string): Promise<Line[]> {
    try {
      const { data, error } = await supabase
        .from('lines')
        .select(`
          *,
          im_machine:machines!fk_lines_im_machine(machine_id, make, model),
          robot_machine:machines!fk_lines_robot_machine(machine_id, make, model),
          conveyor_machine:machines!fk_lines_conveyor_machine(machine_id, make, model),
          hoist_machine:machines!fk_lines_hoist_machine(machine_id, make, model)
        `)
        .eq('unit', unit)
        .order('line_id', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching lines by unit');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch lines by unit:', error);
      throw error;
    }
  },

  // Bulk create lines
  async bulkCreate(lines: Omit<Line, 'line_id' | 'created_at' | 'updated_at'>[]): Promise<Line[]> {
    try {
      const { data, error } = await supabase
        .from('lines')
        .insert(lines)
        .select();
      
      if (error) {
        handleSupabaseError(error, 'bulk creating lines');
        throw error;
      }
      
      console.log('✅ Successfully bulk created', data?.length || 0, 'lines');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to bulk create lines:', error);
      throw error;
    }
  }
}; 

// CRUD Operations for Maintenance Tasks
export const maintenanceTaskAPI = {
  // Get all maintenance tasks
  async getAll(): Promise<MaintenanceTask[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching maintenance tasks');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'maintenance tasks');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch maintenance tasks:', error);
      throw error;
    }
  },

  // Get maintenance task by ID
  async getById(taskId: string): Promise<MaintenanceTask | null> {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (error) {
      console.error('Error fetching maintenance task:', error);
      return null;
    }
    return data;
  },

  // Create new maintenance task
  async create(task: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceTask | null> {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'creating maintenance task');
      throw error;
    }
    
    console.log('✅ Successfully created maintenance task:', data?.id);
    return data;
  },

  // Update maintenance task
  async update(taskId: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | null> {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating maintenance task');
      throw error;
    }
    
    console.log('✅ Successfully updated maintenance task:', data?.id);
    return data;
  },

  // Delete maintenance task
  async delete(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      handleSupabaseError(error, 'deleting maintenance task');
      throw error;
    }
    
    console.log('✅ Successfully deleted maintenance task:', taskId);
  },

  // Get tasks by line
  async getByLine(lineId: string): Promise<MaintenanceTask[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('line_id', lineId)
        .order('due_date', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching line maintenance tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch line maintenance tasks:', error);
      throw error;
    }
  },

  // Get tasks by machine
  async getByMachine(machineId: string): Promise<MaintenanceTask[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('machine_id', machineId)
        .order('due_date', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching machine maintenance tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch machine maintenance tasks:', error);
      throw error;
    }
  },

  // Get overdue tasks
  async getOverdue(): Promise<MaintenanceTask[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .lt('due_date', new Date().toISOString().split('T')[0])
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching overdue maintenance tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch overdue maintenance tasks:', error);
      throw error;
    }
  }
};

// CRUD Operations for Maintenance Schedules
export const maintenanceScheduleAPI = {
  // Get all maintenance schedules
  async getAll(): Promise<MaintenanceSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching maintenance schedules');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch maintenance schedules:', error);
      throw error;
    }
  },

  // Create new maintenance schedule
  async create(schedule: Omit<MaintenanceSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceSchedule | null> {
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .insert(schedule)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'creating maintenance schedule');
      throw error;
    }
    
    return data;
  },

  // Update maintenance schedule
  async update(scheduleId: string, updates: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | null> {
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating maintenance schedule');
      throw error;
    }
    
    return data;
  },

  // Delete maintenance schedule
  async delete(scheduleId: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_schedules')
      .delete()
      .eq('id', scheduleId);
    
    if (error) {
      handleSupabaseError(error, 'deleting maintenance schedule');
      throw error;
    }
  }
};

// CRUD Operations for Maintenance Checklists
export const maintenanceChecklistAPI = {
  // Get all maintenance checklists
  async getAll(): Promise<MaintenanceChecklist[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching maintenance checklists');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch maintenance checklists:', error);
      throw error;
    }
  },

  // Get checklists by type
  async getByType(type: 'machine' | 'line' | 'general'): Promise<MaintenanceChecklist[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .select('*')
        .eq('checklist_type', type)
        .order('name', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching checklists by type');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch checklists by type:', error);
      throw error;
    }
  },

  // Create new maintenance checklist
  async create(checklist: Omit<MaintenanceChecklist, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceChecklist | null> {
    const { data, error } = await supabase
      .from('maintenance_checklists')
      .insert(checklist)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'creating maintenance checklist');
      throw error;
    }
    
    return data;
  },

  // Update maintenance checklist
  async update(checklistId: string, updates: Partial<MaintenanceChecklist>): Promise<MaintenanceChecklist | null> {
    const { data, error } = await supabase
      .from('maintenance_checklists')
      .update(updates)
      .eq('id', checklistId)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating maintenance checklist');
      throw error;
    }
    
    return data;
  },

  // Delete maintenance checklist
  async delete(checklistId: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_checklists')
      .delete()
      .eq('id', checklistId);
    
    if (error) {
      handleSupabaseError(error, 'deleting maintenance checklist');
      throw error;
    }
  },

  // Bulk create maintenance checklists
  async bulkCreate(checklists: Omit<MaintenanceChecklist, 'id' | 'created_at' | 'updated_at'>[]): Promise<MaintenanceChecklist[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .insert(checklists)
        .select();
      
      if (error) {
        handleSupabaseError(error, 'bulk creating maintenance checklists');
        throw error;
      }
      
      console.log('✅ Successfully bulk created', data?.length || 0, 'maintenance checklists');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to bulk create maintenance checklists:', error);
      throw error;
    }
  }
};

// CRUD Operations for BOM Master Trial
export const bomMasterAPI = {
  // Get all BOM masters (default to SFG)
  async getAll(): Promise<BOMMasterWithVersions[]> {
    try {
      const { data, error } = await supabase
        .from('sfg_bom_with_versions')
        .select('*')
        .order('sl_no', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM masters');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'BOM masters');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM masters:', error);
      throw error;
    }
  },

  // Get BOM master by ID
  async getById(id: string): Promise<BOMMaster | null> {
    try {
      // Search in all BOM tables
      let data = null;
      let error = null;
      
      // Try SFG first
      const sfgResult = await supabase
        .from('sfg_bom')
        .select('*')
        .eq('id', id)
        .single();
      
      if (sfgResult.data) {
        return sfgResult.data;
      }
      
      // Try FG
      const fgResult = await supabase
        .from('fg_bom')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fgResult.data) {
        return fgResult.data;
      }
      
      // Try LOCAL
      const localResult = await supabase
        .from('local_bom')
        .select('*')
        .eq('id', id)
        .single();
      
      if (localResult.data) {
        return localResult.data;
      }
      
      return null;
    } catch (error) {
      handleSupabaseError(error, 'fetching BOM master');
      return null;
    }
  },

  // Get BOM masters by category
  async getByCategory(category: 'SFG' | 'FG' | 'LOCAL'): Promise<BOMMasterWithVersions[]> {
    try {
      let tableName: string;
      
      switch (category) {
        case 'SFG':
          tableName = 'sfg_bom_with_versions';
          break;
        case 'FG':
          tableName = 'fg_bom_with_versions';
          break;
        case 'LOCAL':
          tableName = 'local_bom_with_versions';
          break;
        default:
          tableName = 'sfg_bom_with_versions';
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('sl_no', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM masters by category');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM masters by category:', error);
      throw error;
    }
  },

  // Create a new version of an SFG BOM
  async createVersion(sfgBomId: string, versionNumber: number, isActive: boolean = false, createdBy: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_sfg_bom_version', {
        p_sfg_bom_id: sfgBomId,
        p_version_number: versionNumber,
        p_is_active: isActive,
        p_created_by: createdBy
      });
      
      if (error) {
        handleSupabaseError(error, 'creating SFG BOM version');
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to create SFG BOM version:', error);
      throw error;
    }
  },

  // Get version history for an SFG BOM
  async getVersionHistory(sfgBomId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_sfg_bom_version_history', {
        p_sfg_bom_id: sfgBomId
      });
      
      if (error) {
        handleSupabaseError(error, 'fetching SFG BOM version history');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch SFG BOM version history:', error);
      throw error;
    }
  },

  // Get BOM masters by product code (searches all tables)
  async getByProductCode(productCode: string): Promise<BOMMasterWithVersions[]> {
    try {
      // Search in SFG table
      const { data: sfgData, error: sfgError } = await supabase
        .from('sfg_bom')
        .select('*')
        .eq('item_code', productCode)
        .order('created_at', { ascending: false });
      
      if (sfgError) throw sfgError;
      
      // Search in FG table
      const { data: fgData, error: fgError } = await supabase
        .from('fg_bom')
        .select('*')
        .eq('item_code', productCode)
        .order('created_at', { ascending: false });
      
      if (fgError) throw fgError;
      
      // Search in LOCAL table
      const { data: localData, error: localError } = await supabase
        .from('local_bom')
        .select('*')
        .eq('item_code', productCode)
        .order('created_at', { ascending: false });
      
      if (localError) throw localError;
      
      // Combine results
      const combinedData = [
        ...(sfgData || []),
        ...(fgData || []),
        ...(localData || [])
      ];
      
      return combinedData;
    } catch (error) {
      console.error('❌ Failed to fetch BOM masters by product code:', error);
      throw error;
    }
  },

  // Create new BOM master
  async create(bomMaster: Omit<BOMMaster, 'id' | 'created_at' | 'updated_at'>): Promise<BOMMaster | null> {
    try {
      // Determine the correct table based on the data structure
      let tableName: string;
      
      if (bomMaster.sfg_code) {
        // SFG BOM - has sfg_code field
        tableName = 'sfg_bom';
      } else if (bomMaster.party_name) {
        // FG BOM - has party_name field
        tableName = 'fg_bom';
      } else {
        // LOCAL BOM - has item_code but no party_name
        tableName = 'local_bom';
      }

      // Fix: Ensure quantity fields are properly converted to numbers for FG and LOCAL BOMs
      let processedBomMaster = { ...bomMaster };
      
      console.log('🔍 Original BOM Master data:', bomMaster);
      console.log('🔍 Original qty_meter:', bomMaster.qty_meter, 'Type:', typeof bomMaster.qty_meter);
      console.log('🔍 Original qty_meter_2:', bomMaster.qty_meter_2, 'Type:', typeof bomMaster.qty_meter_2);
      
      if (tableName === 'fg_bom' || tableName === 'local_bom') {
        // Convert quantity fields to proper numbers with better precision handling
        const processQuantityField = (value: any): number | undefined => {
          if (value === '' || value === null || value === undefined) {
            return undefined;
          }
          // Use parseFloat for better decimal precision, then round to 4 decimal places
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            return undefined;
          }
          // Round to 4 decimal places to match database DECIMAL(10,4) precision
          return Math.round(parsed * 10000) / 10000;
        };
        
        if (processedBomMaster.sfg_1_qty !== undefined) {
          processedBomMaster.sfg_1_qty = processQuantityField(processedBomMaster.sfg_1_qty);
        }
        if (processedBomMaster.sfg_2_qty !== undefined) {
          processedBomMaster.sfg_2_qty = processQuantityField(processedBomMaster.sfg_2_qty);
        }
        if (processedBomMaster.cnt_qty !== undefined) {
          processedBomMaster.cnt_qty = processQuantityField(processedBomMaster.cnt_qty);
        }
        if (processedBomMaster.poly_qty !== undefined) {
          processedBomMaster.poly_qty = processQuantityField(processedBomMaster.poly_qty);
        }
        if (processedBomMaster.qty_meter !== undefined) {
          processedBomMaster.qty_meter = processQuantityField(processedBomMaster.qty_meter);
        }
        if (processedBomMaster.qty_meter_2 !== undefined) {
          processedBomMaster.qty_meter_2 = processQuantityField(processedBomMaster.qty_meter_2);
        }
        
        console.log('🔍 After precision conversion:');
        console.log('🔍 qty_meter:', processedBomMaster.qty_meter, 'Type:', typeof processedBomMaster.qty_meter);
        console.log('🔍 qty_meter_2:', processedBomMaster.qty_meter_2, 'Type:', typeof processedBomMaster.qty_meter_2);
      }
      
      console.log('🔍 Final processed BOM Master before database insert:', processedBomMaster);
      console.log('🔍 Final qty_meter before insert:', processedBomMaster.qty_meter, 'Type:', typeof processedBomMaster.qty_meter);
      console.log('🔍 Final qty_meter_2 before insert:', processedBomMaster.qty_meter_2, 'Type:', typeof processedBomMaster.qty_meter_2);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([processedBomMaster])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating BOM master');
        throw error;
      }
      
      console.log('✅ Successfully created BOM master in', tableName, ':', data?.id);
      console.log('🔍 Quantity values stored:', {
        qty_meter: data?.qty_meter,
        qty_meter_2: data?.qty_meter_2,
        sfg_1_qty: data?.sfg_1_qty,
        sfg_2_qty: data?.sfg_2_qty
      });
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating BOM master');
      throw error;
    }
  },

  // Create new BOM lineage
  async createNewLineage(
    productCode: string,
    productName: string,
    category: 'SFG' | 'FG' | 'LOCAL',
    description: string,
    createdBy: string
  ): Promise<BOMMaster | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_new_bom_lineage', {
          p_product_code: productCode,
          p_product_name: productName,
          p_category: category,
          p_description: description,
          p_created_by: createdBy
        });
      
      if (error) {
        handleSupabaseError(error, 'creating new BOM lineage');
        throw error;
      }
      
      // Fetch the created BOM master
      return await this.getById(data);
    } catch (error) {
      handleSupabaseError(error, 'creating new BOM lineage');
      throw error;
    }
  },

  // Update BOM master
  async update(id: string, updates: Partial<BOMMaster>): Promise<BOMMaster | null> {
    try {
      // First, find which table contains this BOM master
      let tableName: string;
      
      // Try SFG first
      const sfgResult = await supabase
        .from('sfg_bom')
        .select('id')
        .eq('id', id)
        .single();
      
      if (sfgResult.data) {
        tableName = 'sfg_bom';
      } else {
        // Try FG
        const fgResult = await supabase
          .from('fg_bom')
          .select('id')
          .eq('id', id)
          .single();
        
        if (fgResult.data) {
          tableName = 'fg_bom';
        } else {
          // Try LOCAL
          const localResult = await supabase
            .from('local_bom')
            .select('id')
            .eq('id', id)
            .single();
          
          if (localResult.data) {
            tableName = 'local_bom';
          } else {
            throw new Error('BOM master not found in any table');
          }
        }
      }

      // Fix: Process quantity fields to prevent rounding issues during updates
      let processedUpdates = { ...updates };
      
      if (tableName === 'fg_bom' || tableName === 'local_bom') {
        // Convert quantity fields to proper numbers with better precision handling
        const processQuantityField = (value: any): number | undefined => {
          if (value === '' || value === null || value === undefined) {
            return undefined;
          }
          // Use parseFloat for better decimal precision, then round to 4 decimal places
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            return undefined;
          }
          // Round to 4 decimal places to match database DECIMAL(10,4) precision
          return Math.round(parsed * 10000) / 10000;
        };
        
        if (processedUpdates.sfg_1_qty !== undefined) {
          processedUpdates.sfg_1_qty = processQuantityField(processedUpdates.sfg_1_qty);
        }
        if (processedUpdates.sfg_2_qty !== undefined) {
          processedUpdates.sfg_2_qty = processQuantityField(processedUpdates.sfg_2_qty);
        }
        if (processedUpdates.cnt_qty !== undefined) {
          processedUpdates.cnt_qty = processQuantityField(processedUpdates.cnt_qty);
        }
        if (processedUpdates.poly_qty !== undefined) {
          processedUpdates.poly_qty = processQuantityField(processedUpdates.poly_qty);
        }
        if (processedUpdates.qty_meter !== undefined) {
          processedUpdates.qty_meter = processQuantityField(processedUpdates.qty_meter);
        }
        if (processedUpdates.qty_meter_2 !== undefined) {
          processedUpdates.qty_meter_2 = processQuantityField(processedUpdates.qty_meter_2);
        }
        
        console.log('🔍 Update: Processed quantity fields:', {
          qty_meter: processedUpdates.qty_meter,
          qty_meter_2: processedUpdates.qty_meter_2,
          sfg_1_qty: processedUpdates.sfg_1_qty,
          sfg_2_qty: processedUpdates.sfg_2_qty,
          cnt_qty: processedUpdates.cnt_qty,
          poly_qty: processedUpdates.poly_qty
        });
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...processedUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating BOM master');
        throw error;
      }
      
      console.log('✅ Successfully updated BOM master in', tableName, ':', data?.id);
      console.log('🔍 Updated quantity values:', {
        qty_meter: data?.qty_meter,
        qty_meter_2: data?.qty_meter_2,
        sfg_1_qty: data?.sfg_1_qty,
        sfg_2_qty: data?.sfg_2_qty,
        cnt_qty: data?.cnt_qty,
        poly_qty: data?.poly_qty
      });
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating BOM master');
      throw error;
    }
  },

  // Archive BOM master
  async archive(id: string, archivedBy: string): Promise<BOMMaster | null> {
    return this.update(id, { status: 'archived', created_by: archivedBy });
  },

  // Release BOM master
  async release(id: string, releasedBy: string): Promise<BOMMaster | null> {
    return this.update(id, { status: 'released', created_by: releasedBy });
  }
};

// CRUD Operations for BOM Versions Trial
export const bomVersionAPI = {
  // Get all BOM versions
  async getAll(): Promise<BOMVersionWithComponents[]> {
    try {
      const { data, error } = await supabase
        .from('bom_versions_with_components')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM versions');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM versions:', error);
      throw error;
    }
  },

  // Get BOM version by ID
  async getById(id: string): Promise<BOMVersion | null> {
    try {
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM version');
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching BOM version');
      return null;
    }
  },

  // Get versions by BOM master ID
  async getByBOMMasterId(bomMasterId: string): Promise<BOMVersion[]> {
    try {
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .select('*')
        .eq('bom_master_id', bomMasterId)
        .order('version_number', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM versions by master ID');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM versions by master ID:', error);
      throw error;
    }
  },

  // Get active version by BOM master ID
  async getActiveByBOMMasterId(bomMasterId: string): Promise<BOMVersion | null> {
    try {
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .select('*')
        .eq('bom_master_id', bomMasterId)
        .eq('is_active', true)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching active BOM version');
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching active BOM version');
      return null;
    }
  },

  // Create new BOM version
  async create(bomVersion: Omit<BOMVersion, 'id' | 'created_at' | 'updated_at'>): Promise<BOMVersion | null> {
    try {
      // Set user context for audit trail
      await supabase.rpc('set_current_user_context', { user_name: bomVersion.created_by });
      
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .insert([bomVersion])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating BOM version');
        throw error;
      }
      
      console.log('✅ Successfully created BOM version:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating BOM version');
      throw error;
    }
  },

  // Create new version for existing BOM
  async createNewVersion(
    bomMasterId: string,
    components: BOMComponent[],
    notes: string,
    changeReason: string,
    createdBy: string
  ): Promise<BOMVersion | null> {
    try {
      // Get next version number
      const { data: nextVersion, error: versionError } = await supabase
        .rpc('get_next_bom_version', { bom_master_uuid: bomMasterId });
      
      if (versionError) {
        handleSupabaseError(versionError, 'getting next BOM version');
        throw versionError;
      }

      // Calculate total cost
      const totalCost = components.reduce((sum, comp) => sum + comp.total_cost, 0);

      // Create new version
      const newVersion: Omit<BOMVersion, 'id' | 'created_at' | 'updated_at'> = {
        bom_master_id: bomMasterId,
        version_number: nextVersion,
        is_active: true,
        components,
        total_components: components.length,
        total_cost: totalCost,
        notes,
        change_reason: changeReason,
        created_by: createdBy
      };

      return await this.create(newVersion);
    } catch (error) {
      handleSupabaseError(error, 'creating new BOM version');
      throw error;
    }
  },

  // Update BOM version
  async update(id: string, updates: Partial<BOMVersion>): Promise<BOMVersion | null> {
    try {
      // Set user context for audit trail
      if (updates.created_by) {
        await supabase.rpc('set_current_user_context', { user_name: updates.created_by });
      }
      
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating BOM version');
        throw error;
      }
      
      console.log('✅ Successfully updated BOM version:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating BOM version');
      throw error;
    }
  },

  // Activate version
  async activate(id: string, activatedBy: string): Promise<BOMVersion | null> {
    try {
      // First get the BOM master ID
      const version = await this.getById(id);
      if (!version) {
        throw new Error('Version not found');
      }

      // Deactivate all other versions in the same lineage
      const { error: deactivateError } = await supabase
        .from('sfg_bom_versions_trial')
        .update({ is_active: false })
        .eq('bom_master_id', version.bom_master_id)
        .neq('id', id);

      if (deactivateError) {
        handleSupabaseError(deactivateError, 'deactivating other versions');
        throw deactivateError;
      }

      // Activate this version
      return await this.update(id, { is_active: true, created_by: activatedBy });
    } catch (error) {
      handleSupabaseError(error, 'activating BOM version');
      throw error;
    }
  }
};

// CRUD Operations for BOM Components Trial
export const bomComponentAPI = {
  // Get all BOM components
  async getAll(): Promise<BOMComponent[]> {
    try {
      const { data, error } = await supabase
        .from('sfg_bom_components_trial')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM components');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM components:', error);
      throw error;
    }
  },

  // Get components by BOM version ID
  async getByBOMVersionId(bomVersionId: string): Promise<BOMComponent[]> {
    try {
      const { data, error } = await supabase
        .from('sfg_bom_components_trial')
        .select('*')
        .eq('bom_version_id', bomVersionId)
        .order('component_code', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM components by version ID');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM components by version ID:', error);
      throw error;
    }
  },

  // Create BOM component
  async create(component: Omit<BOMComponent, 'id' | 'created_at' | 'updated_at'>): Promise<BOMComponent | null> {
    try {
      const { data, error } = await supabase
        .from('bom_components_trial')
        .insert([component])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating BOM component');
        throw error;
      }
      
      console.log('✅ Successfully created BOM component:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating BOM component');
      throw error;
    }
  },

  // Bulk create BOM components
  async bulkCreate(components: Omit<BOMComponent, 'id' | 'created_at' | 'updated_at'>[]): Promise<BOMComponent[]> {
    try {
      const { data, error } = await supabase
        .from('bom_components_trial')
        .insert(components)
        .select();
      
      if (error) {
        handleSupabaseError(error, 'bulk creating BOM components');
        throw error;
      }
      
      console.log('✅ Successfully bulk created', data?.length || 0, 'BOM components');
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'bulk creating BOM components');
      throw error;
    }
  },

  // Update BOM component
  async update(id: string, updates: Partial<BOMComponent>): Promise<BOMComponent | null> {
    try {
      const { data, error } = await supabase
        .from('bom_components_trial')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating BOM component');
        throw error;
      }
      
      console.log('✅ Successfully updated BOM component:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating BOM component');
      throw error;
    }
  },

  // Delete BOM component
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bom_components_trial')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting BOM component');
        throw error;
      }
      
      console.log('✅ Successfully deleted BOM component:', id);
    } catch (error) {
      handleSupabaseError(error, 'deleting BOM component');
      throw error;
    }
  }
};

// CRUD Operations for BOM Audit Trial
export const bomAuditAPI = {
  // Get audit trail for a record
  async getAuditTrail(tableName: string, recordId: string): Promise<BOMAudit[]> {
    try {
      const { data, error } = await supabase
        .from('bom_audit_trial')
        .select('*')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('changed_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM audit trail');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM audit trail:', error);
      throw error;
    }
  },

  // Get audit trail by user
  async getAuditTrailByUser(changedBy: string): Promise<BOMAudit[]> {
    try {
      const { data, error } = await supabase
        .from('bom_audit_trial')
        .select('*')
        .eq('changed_by', changedBy)
        .order('changed_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM audit trail by user');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM audit trail by user:', error);
      throw error;
    }
  },

  // Get recent audit activities
  async getRecentActivities(limit: number = 50): Promise<BOMAudit[]> {
    try {
      const { data, error } = await supabase
        .from('bom_audit_trial')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        handleSupabaseError(error, 'fetching recent BOM audit activities');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch recent BOM audit activities:', error);
      throw error;
    }
  }
};

// CRUD Operations for Dispatch Memo
export const dispatchMemoAPI = {
  // Get all dispatch memos
  async getAll(): Promise<DispatchMemo[]> {
    try {
      const { data, error } = await supabase
        .from('dispatch_dispatch_memo')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching dispatch memos');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch dispatch memos:', error);
      throw error;
    }
  },

  // Get dispatch memo by ID with items
  async getById(id: string): Promise<{ memo: DispatchMemo; items: DispatchMemoItem[] } | null> {
    try {
      const { data: memo, error: memoError } = await supabase
        .from('dispatch_dispatch_memo')
        .select('*')
        .eq('id', id)
        .single();
      
      if (memoError) {
        handleSupabaseError(memoError, 'fetching dispatch memo');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('dispatch_dispatch_memo_items')
        .select('*')
        .eq('memo_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching dispatch memo items');
        return null;
      }

      return { memo, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch dispatch memo:', error);
      return null;
    }
  },

  // Create dispatch memo with items
  async create(memo: Omit<DispatchMemo, 'id' | 'created_at' | 'updated_at'>, items: Omit<DispatchMemoItem, 'id' | 'memo_id' | 'created_at' | 'sr_no'>[]): Promise<DispatchMemo | null> {
    try {
      // Insert memo first
      const { data: newMemo, error: memoError } = await supabase
        .from('dispatch_dispatch_memo')
        .insert([memo])
        .select()
        .single();
      
      if (memoError) {
        handleSupabaseError(memoError, 'creating dispatch memo');
        throw memoError;
      }

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          memo_id: newMemo.id,
          sr_no: index + 1,
          item_name: item.item_name,
          no_box: item.no_box || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('dispatch_dispatch_memo_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating dispatch memo items');
          // Rollback memo if items fail
          await supabase.from('dispatch_dispatch_memo').delete().eq('id', newMemo.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created dispatch memo:', newMemo.id);
      return newMemo;
    } catch (error) {
      console.error('❌ Failed to create dispatch memo:', error);
      throw error;
    }
  },

  // Update dispatch memo
  async update(id: string, updates: Partial<DispatchMemo>, items?: Omit<DispatchMemoItem, 'id' | 'memo_id' | 'created_at' | 'sr_no'>[]): Promise<DispatchMemo | null> {
    try {
      const { data, error } = await supabase
        .from('dispatch_dispatch_memo')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating dispatch memo');
        throw error;
      }

      // Update items if provided
      if (items !== undefined) {
        // Delete existing items
        await supabase.from('dispatch_dispatch_memo_items').delete().eq('memo_id', id);
        
        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            memo_id: id,
            sr_no: index + 1,
            item_name: item.item_name,
            no_box: item.no_box || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('dispatch_dispatch_memo_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating dispatch memo items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update dispatch memo:', error);
      throw error;
    }
  },

  // Delete dispatch memo
  async delete(id: string): Promise<void> {
    try {
      // Items will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('dispatch_dispatch_memo')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting dispatch memo');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete dispatch memo:', error);
      throw error;
    }
  }
};

// CRUD Operations for Delivery Challan
export const deliveryChallanAPI = {
  // Get all delivery challans
  async getAll(): Promise<DeliveryChallan[]> {
    try {
      const { data, error } = await supabase
        .from('dispatch_delivery_challan')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching delivery challans');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch delivery challans:', error);
      throw error;
    }
  },

  // Get delivery challan by ID with items
  async getById(id: string): Promise<{ challan: DeliveryChallan; items: DeliveryChallanItem[] } | null> {
    try {
      const { data: challan, error: challanError } = await supabase
        .from('dispatch_delivery_challan')
        .select('*')
        .eq('id', id)
        .single();
      
      if (challanError) {
        handleSupabaseError(challanError, 'fetching delivery challan');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('dispatch_delivery_challan_items')
        .select('*')
        .eq('challan_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching delivery challan items');
        return null;
      }

      return { challan, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch delivery challan:', error);
      return null;
    }
  },

  // Create delivery challan with items
  async create(challan: Omit<DeliveryChallan, 'id' | 'created_at' | 'updated_at'>, items: Omit<DeliveryChallanItem, 'id' | 'challan_id' | 'created_at' | 'sr_no'>[]): Promise<DeliveryChallan | null> {
    try {
      // Insert challan first
      const { data: newChallan, error: challanError } = await supabase
        .from('dispatch_delivery_challan')
        .insert([challan])
        .select()
        .single();
      
      if (challanError) {
        handleSupabaseError(challanError, 'creating delivery challan');
        throw challanError;
      }

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          challan_id: newChallan.id,
          sr_no: index + 1,
          material_description: item.material_description,
          qty: item.qty ? parseFloat(item.qty.toString()) : null,
          uom: item.uom || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('dispatch_delivery_challan_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating delivery challan items');
          // Rollback challan if items fail
          await supabase.from('dispatch_delivery_challan').delete().eq('id', newChallan.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created delivery challan:', newChallan.id);
      return newChallan;
    } catch (error) {
      console.error('❌ Failed to create delivery challan:', error);
      throw error;
    }
  },

  // Update delivery challan
  async update(id: string, updates: Partial<DeliveryChallan>, items?: Omit<DeliveryChallanItem, 'id' | 'challan_id' | 'created_at' | 'sr_no'>[]): Promise<DeliveryChallan | null> {
    try {
      const { data, error } = await supabase
        .from('dispatch_delivery_challan')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating delivery challan');
        throw error;
      }

      // Update items if provided
      if (items !== undefined) {
        // Delete existing items
        await supabase.from('dispatch_delivery_challan_items').delete().eq('challan_id', id);
        
        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            challan_id: id,
            sr_no: index + 1,
            material_description: item.material_description,
            qty: item.qty ? parseFloat(item.qty.toString()) : null,
            uom: item.uom || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('dispatch_delivery_challan_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating delivery challan items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update delivery challan:', error);
      throw error;
    }
  },

  // Delete delivery challan
  async delete(id: string): Promise<void> {
    try {
      // Items will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('dispatch_delivery_challan')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting delivery challan');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete delivery challan:', error);
      throw error;
    }
  }
};

// CRUD Operations for Vendor Registration
export const vendorRegistrationAPI = {
  // Get all vendor registrations
  async getAll(): Promise<VendorRegistration[]> {
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching vendor registrations');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch vendor registrations:', error);
      throw error;
    }
  },

  // Get vendor registration by ID
  async getById(id: string): Promise<VendorRegistration | null> {
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching vendor registration');
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch vendor registration:', error);
      return null;
    }
  },

  // Create vendor registration
  async create(vendor: Omit<VendorRegistration, 'id' | 'created_at' | 'updated_at'>): Promise<VendorRegistration | null> {
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .insert([vendor])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating vendor registration');
        throw error;
      }
      console.log('✅ Successfully created vendor registration:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create vendor registration:', error);
      throw error;
    }
  },

  // Update vendor registration
  async update(id: string, updates: Partial<VendorRegistration>): Promise<VendorRegistration | null> {
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating vendor registration');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to update vendor registration:', error);
      throw error;
    }
  },

  // Delete vendor registration
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchase_vendor_registration')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting vendor registration');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete vendor registration:', error);
      throw error;
    }
  }
};

// CRUD Operations for Material Indent Slip
export const materialIndentSlipAPI = {
  // Get all material indent slips
  async getAll(): Promise<MaterialIndentSlip[]> {
    try {
      const { data, error } = await supabase
        .from('purchase_material_indent_slip')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching material indent slips');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch material indent slips:', error);
      throw error;
    }
  },

  // Get material indent slip by ID with items
  async getById(id: string): Promise<{ slip: MaterialIndentSlip; items: MaterialIndentSlipItem[] } | null> {
    try {
      const { data: slip, error: slipError } = await supabase
        .from('purchase_material_indent_slip')
        .select('*')
        .eq('id', id)
        .single();
      
      if (slipError) {
        handleSupabaseError(slipError, 'fetching material indent slip');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('purchase_material_indent_slip_items')
        .select('*')
        .eq('indent_slip_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching material indent slip items');
        return null;
      }

      return { slip, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch material indent slip:', error);
      return null;
    }
  },

  // Create material indent slip with items
  async create(slip: Omit<MaterialIndentSlip, 'id' | 'created_at' | 'updated_at'>, items: Omit<MaterialIndentSlipItem, 'id' | 'indent_slip_id' | 'created_at' | 'sr_no'>[]): Promise<MaterialIndentSlip | null> {
    try {
      const { data: newSlip, error: slipError } = await supabase
        .from('purchase_material_indent_slip')
        .insert([slip])
        .select()
        .single();
      
      if (slipError) {
        handleSupabaseError(slipError, 'creating material indent slip');
        throw slipError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          indent_slip_id: newSlip.id,
          sr_no: index + 1,
          description_specification: item.description_specification,
          qty: item.qty ? parseFloat(item.qty.toString()) : null,
          uom: item.uom || null,
          make_mfg_remarks: item.make_mfg_remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('purchase_material_indent_slip_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating material indent slip items');
          await supabase.from('purchase_material_indent_slip').delete().eq('id', newSlip.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created material indent slip:', newSlip.id);
      return newSlip;
    } catch (error) {
      console.error('❌ Failed to create material indent slip:', error);
      throw error;
    }
  },

  // Update material indent slip
  async update(id: string, updates: Partial<MaterialIndentSlip>, items?: Omit<MaterialIndentSlipItem, 'id' | 'indent_slip_id' | 'created_at' | 'sr_no'>[]): Promise<MaterialIndentSlip | null> {
    try {
      const { data, error } = await supabase
        .from('purchase_material_indent_slip')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating material indent slip');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('purchase_material_indent_slip_items').delete().eq('indent_slip_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            indent_slip_id: id,
            sr_no: index + 1,
            description_specification: item.description_specification,
            qty: item.qty ? parseFloat(item.qty.toString()) : null,
            uom: item.uom || null,
            make_mfg_remarks: item.make_mfg_remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('purchase_material_indent_slip_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating material indent slip items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update material indent slip:', error);
      throw error;
    }
  },

  // Delete material indent slip
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchase_material_indent_slip')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting material indent slip');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete material indent slip:', error);
      throw error;
    }
  }
};

// CRUD Operations for Purchase Order
export const purchaseOrderAPI = {
  // Get all purchase orders
  async getAll(): Promise<PurchaseOrder[]> {
    try {
      const { data, error } = await supabase
        .from('purchase_purchase_order')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching purchase orders');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch purchase orders:', error);
      throw error;
    }
  },

  // Get purchase order by ID with items
  async getById(id: string): Promise<{ order: PurchaseOrder; items: PurchaseOrderItem[] } | null> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('purchase_purchase_order')
        .select('*')
        .eq('id', id)
        .single();
      
      if (orderError) {
        handleSupabaseError(orderError, 'fetching purchase order');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('purchase_purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching purchase order items');
        return null;
      }

      return { order, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch purchase order:', error);
      return null;
    }
  },

  // Create purchase order with items
  async create(order: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>, items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at' | 'sr_no'>[]): Promise<PurchaseOrder | null> {
    try {
      const { data: newOrder, error: orderError } = await supabase
        .from('purchase_purchase_order')
        .insert([order])
        .select()
        .single();
      
      if (orderError) {
        handleSupabaseError(orderError, 'creating purchase order');
        throw orderError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          purchase_order_id: newOrder.id,
          sr_no: index + 1,
          description: item.description,
          qty: item.qty ? parseFloat(item.qty.toString()) : null,
          unit: item.unit || null,
          unit_price: item.unit_price ? parseFloat(item.unit_price.toString()) : null,
          total_price: item.total_price ? parseFloat(item.total_price.toString()) : null
        }));

        const { error: itemsError } = await supabase
          .from('purchase_purchase_order_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating purchase order items');
          await supabase.from('purchase_purchase_order').delete().eq('id', newOrder.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created purchase order:', newOrder.id);
      return newOrder;
    } catch (error) {
      console.error('❌ Failed to create purchase order:', error);
      throw error;
    }
  },

  // Update purchase order
  async update(id: string, updates: Partial<PurchaseOrder>, items?: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at' | 'sr_no'>[]): Promise<PurchaseOrder | null> {
    try {
      const { data, error } = await supabase
        .from('purchase_purchase_order')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating purchase order');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('purchase_purchase_order_items').delete().eq('purchase_order_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            purchase_order_id: id,
            sr_no: index + 1,
            description: item.description,
            qty: item.qty ? parseFloat(item.qty.toString()) : null,
            unit: item.unit || null,
            unit_price: item.unit_price ? parseFloat(item.unit_price.toString()) : null,
            total_price: item.total_price ? parseFloat(item.total_price.toString()) : null
          }));

          const { error: itemsError } = await supabase
            .from('purchase_purchase_order_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating purchase order items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update purchase order:', error);
      throw error;
    }
  },

  // Delete purchase order
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchase_purchase_order')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting purchase order');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete purchase order:', error);
      throw error;
    }
  }
};

// CRUD Operations for GRN
export const grnAPI = {
  // Get all GRNs
  async getAll(): Promise<GRN[]> {
    try {
      const { data, error } = await supabase
        .from('store_grn')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching GRNs');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch GRNs:', error);
      throw error;
    }
  },

  // Get GRN by ID with items
  async getById(id: string): Promise<{ grn: GRN; items: GRNItem[] } | null> {
    try {
      const { data: grn, error: grnError } = await supabase
        .from('store_grn')
        .select('*')
        .eq('id', id)
        .single();
      
      if (grnError) {
        handleSupabaseError(grnError, 'fetching GRN');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_grn_items')
        .select('*')
        .eq('grn_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching GRN items');
        return null;
      }

      return { grn, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch GRN:', error);
      return null;
    }
  },

  // Create GRN with items
  async create(grn: Omit<GRN, 'id' | 'created_at' | 'updated_at'>, items: Omit<GRNItem, 'id' | 'grn_id' | 'created_at' | 'sr_no'>[]): Promise<GRN | null> {
    try {
      const { data: newGRN, error: grnError } = await supabase
        .from('store_grn')
        .insert([grn])
        .select()
        .single();
      
      if (grnError) {
        handleSupabaseError(grnError, 'creating GRN');
        throw grnError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          grn_id: newGRN.id,
          sr_no: index + 1,
          item_description: item.item_description,
          box_bag: item.box_bag || null,
          per_box_bag_qty: item.per_box_bag_qty ? parseFloat(item.per_box_bag_qty.toString()) : null,
          total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
          uom: item.uom || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('store_grn_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating GRN items');
          await supabase.from('store_grn').delete().eq('id', newGRN.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created GRN:', newGRN.id);
      return newGRN;
    } catch (error) {
      console.error('❌ Failed to create GRN:', error);
      throw error;
    }
  },

  // Update GRN
  async update(id: string, updates: Partial<GRN>, items?: Omit<GRNItem, 'id' | 'grn_id' | 'created_at' | 'sr_no'>[]): Promise<GRN | null> {
    try {
      const { data, error } = await supabase
        .from('store_grn')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating GRN');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('store_grn_items').delete().eq('grn_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            grn_id: id,
            sr_no: index + 1,
            item_description: item.item_description,
            box_bag: item.box_bag || null,
            per_box_bag_qty: item.per_box_bag_qty ? parseFloat(item.per_box_bag_qty.toString()) : null,
            total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
            uom: item.uom || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('store_grn_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating GRN items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update GRN:', error);
      throw error;
    }
  },

  // Delete GRN
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('store_grn')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting GRN');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete GRN:', error);
      throw error;
    }
  }
};

// CRUD Operations for MIS
export const misAPI = {
  // Get all MIS
  async getAll(): Promise<MIS[]> {
    try {
      const { data, error } = await supabase
        .from('store_mis')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching MIS');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch MIS:', error);
      throw error;
    }
  },

  // Get MIS by ID with items
  async getById(id: string): Promise<{ mis: MIS; items: MISItem[] } | null> {
    try {
      const { data: mis, error: misError } = await supabase
        .from('store_mis')
        .select('*')
        .eq('id', id)
        .single();
      
      if (misError) {
        handleSupabaseError(misError, 'fetching MIS');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_mis_items')
        .select('*')
        .eq('mis_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching MIS items');
        return null;
      }

      return { mis, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch MIS:', error);
      return null;
    }
  },

  // Create MIS with items
  async create(mis: Omit<MIS, 'id' | 'created_at' | 'updated_at'>, items: Omit<MISItem, 'id' | 'mis_id' | 'created_at' | 'sr_no'>[]): Promise<MIS | null> {
    try {
      const { data: newMIS, error: misError } = await supabase
        .from('store_mis')
        .insert([mis])
        .select()
        .single();
      
      if (misError) {
        handleSupabaseError(misError, 'creating MIS');
        throw misError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          mis_id: newMIS.id,
          sr_no: index + 1,
          description_of_material: item.description_of_material,
          uom: item.uom || null,
          required_qty: item.required_qty ? parseFloat(item.required_qty.toString()) : null,
          issue_qty: item.issue_qty ? parseFloat(item.issue_qty.toString()) : null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('store_mis_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating MIS items');
          await supabase.from('store_mis').delete().eq('id', newMIS.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created MIS:', newMIS.id);
      return newMIS;
    } catch (error) {
      console.error('❌ Failed to create MIS:', error);
      throw error;
    }
  },

  // Update MIS
  async update(id: string, updates: Partial<MIS>, items?: Omit<MISItem, 'id' | 'mis_id' | 'created_at' | 'sr_no'>[]): Promise<MIS | null> {
    try {
      const { data, error } = await supabase
        .from('store_mis')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating MIS');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('store_mis_items').delete().eq('mis_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            mis_id: id,
            sr_no: index + 1,
            description_of_material: item.description_of_material,
            uom: item.uom || null,
            required_qty: item.required_qty ? parseFloat(item.required_qty.toString()) : null,
            issue_qty: item.issue_qty ? parseFloat(item.issue_qty.toString()) : null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('store_mis_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating MIS items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update MIS:', error);
      throw error;
    }
  },

  // Delete MIS
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('store_mis')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting MIS');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete MIS:', error);
      throw error;
    }
  }
};

// CRUD Operations for FGN
export const fgnAPI = {
  // Get all FGNs
  async getAll(): Promise<FGN[]> {
    try {
      const { data, error } = await supabase
        .from('store_fgn')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching FGNs');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch FGNs:', error);
      throw error;
    }
  },

  // Get FGN by ID with items
  async getById(id: string): Promise<{ fgn: FGN; items: FGNItem[] } | null> {
    try {
      const { data: fgn, error: fgnError } = await supabase
        .from('store_fgn')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fgnError) {
        handleSupabaseError(fgnError, 'fetching FGN');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_fgn_items')
        .select('*')
        .eq('fgn_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching FGN items');
        return null;
      }

      return { fgn, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch FGN:', error);
      return null;
    }
  },

  // Create FGN with items
  async create(fgn: Omit<FGN, 'id' | 'created_at' | 'updated_at'>, items: Omit<FGNItem, 'id' | 'fgn_id' | 'created_at' | 'sr_no'>[]): Promise<FGN | null> {
    try {
      const { data: newFGN, error: fgnError } = await supabase
        .from('store_fgn')
        .insert([fgn])
        .select()
        .single();
      
      if (fgnError) {
        handleSupabaseError(fgnError, 'creating FGN');
        throw fgnError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          fgn_id: newFGN.id,
          sr_no: index + 1,
          item_name: item.item_name,
          no_of_boxes: item.no_of_boxes ? parseInt(item.no_of_boxes.toString()) : null,
          qty_in_box: item.qty_in_box ? parseFloat(item.qty_in_box.toString()) : null,
          total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
          received_qty: item.received_qty ? parseFloat(item.received_qty.toString()) : null,
          qc_check: item.qc_check || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('store_fgn_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating FGN items');
          await supabase.from('store_fgn').delete().eq('id', newFGN.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created FGN:', newFGN.id);
      return newFGN;
    } catch (error) {
      console.error('❌ Failed to create FGN:', error);
      throw error;
    }
  },

  // Update FGN
  async update(id: string, updates: Partial<FGN>, items?: Omit<FGNItem, 'id' | 'fgn_id' | 'created_at' | 'sr_no'>[]): Promise<FGN | null> {
    try {
      const { data, error } = await supabase
        .from('store_fgn')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating FGN');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('store_fgn_items').delete().eq('fgn_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            fgn_id: id,
            sr_no: index + 1,
            item_name: item.item_name,
            no_of_boxes: item.no_of_boxes ? parseInt(item.no_of_boxes.toString()) : null,
            qty_in_box: item.qty_in_box ? parseFloat(item.qty_in_box.toString()) : null,
            total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
            received_qty: item.received_qty ? parseFloat(item.received_qty.toString()) : null,
            qc_check: item.qc_check || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('store_fgn_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating FGN items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update FGN:', error);
      throw error;
    }
  },

  // Delete FGN
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('store_fgn')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting FGN');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete FGN:', error);
      throw error;
    }
  }
};