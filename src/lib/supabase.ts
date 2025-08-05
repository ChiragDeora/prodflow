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
  zone: string;
  purchase_date: string;
  remarks: string;
  nameplate_image?: string;
  nameplate_details?: string;
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
  // New fields for enhanced mold master
  item_code?: string;
  item_name?: string;
  type?: string;
  cycle_time?: number;
  st_wt?: number;
  hrc_zone?: string;
  make?: string;
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
  type1: string; // Short form like "PP"
  type2: string; // Full form like "HP", "ICP", "RCP" - treated as primary key
  grade: string;
  supplier: string;
  mfi: number;
  density: number;
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
      .order('mold_id');
    
    if (error) {
      console.error('Error fetching molds:', error);
      throw error;
    }
    return data || [];
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

  // Get raw material by type2 (primary key)
  async getByType2(type2: string): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('type2', type2)
        .single();
      
      if (error) {
        console.error('Error fetching raw material by type2:', error);
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching raw material by type2');
      return null;
    }
  },

  // Get raw material by type2, grade, and supplier (composite key)
  async getByType2GradeSupplier(type2: string, grade: string, supplier: string): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('type2', type2)
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