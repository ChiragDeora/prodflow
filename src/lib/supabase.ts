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