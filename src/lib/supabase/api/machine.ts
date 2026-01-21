import { getSupabase, handleSupabaseError } from '../utils';
import type { Machine } from '../types';
export const machineAPI = {
  // Get all machines
  async getAll(): Promise<Machine[]> {
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
    
    // Filter out zone if it exists (legacy field) and ensure we only send valid fields
    const machineData: any = { ...machine };
    delete machineData.zone; // Remove zone if it exists (legacy field)
    
    // Remove undefined values and null values to avoid issues
    Object.keys(machineData).forEach(key => {
      if (machineData[key] === undefined || machineData[key] === null) {
        delete machineData[key];
      }
    });
    
    // Ensure required fields have values
    if (!machineData.make) machineData.make = '';
    if (!machineData.model) machineData.model = '';
    if (!machineData.type) machineData.type = 'Injection Molding Machine';
    if (machineData.capacity_tons === undefined) machineData.capacity_tons = 0;
    if (!machineData.install_date) machineData.install_date = new Date().toISOString().split('T')[0];
    if (!machineData.purchase_date) machineData.purchase_date = new Date().toISOString().split('T')[0];
    if (machineData.grinding_available === undefined) machineData.grinding_available = false;
    if (!machineData.status) machineData.status = 'Active';
    if (!machineData.remarks) machineData.remarks = '';
    
    const { data, error } = await supabase
      .from('machines')
      .insert([machineData])
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating machine:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.error('Machine data sent:', JSON.stringify(machineData, null, 2));
      throw error;
    }
    return data;
  },

  // Update machine
  async update(machineId: string, updates: Partial<Machine>): Promise<Machine | null> {
    const supabase = getSupabase();
    
    // Filter out undefined values and zone (legacy field) to avoid issues with database updates
    const filteredUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      // Exclude machine_id and zone from updates
      if (key !== 'machine_id' && key !== 'zone' && value !== undefined) {
        filteredUpdates[key] = value;
      }
    });
    
    const { data, error } = await supabase
      .from('machines')
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .eq('machine_id', machineId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating machine:', error);
      throw error;
    }
    return data;
  },

  // Delete machine
  async delete(machineId: string): Promise<boolean> {
    const supabase = getSupabase();
    
    // First, clear all line references to this machine
    // This ensures orphaned references are cleaned up even if FK constraints don't fire
    const lineFields = ['im_machine_id', 'robot_machine_id', 'conveyor_machine_id', 'hoist_machine_id', 'loader_machine_id'];
    
    for (const field of lineFields) {
      const { error: updateError } = await supabase
        .from('lines')
        .update({ [field]: null })
        .eq(field, machineId);
      
      if (updateError) {
        console.warn(`Warning: Could not clear ${field} for machine ${machineId}:`, updateError);
        // Continue even if one fails
      }
    }
    
    // Now delete the machine
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('machine_id', machineId);
    
    if (error) {
      console.error('Error deleting machine:', error);
      throw error;
    }
    
    console.log('✅ Successfully deleted machine:', machineId);
    return true;
  },

  // Bulk create machines from Excel
  async bulkCreate(machines: Omit<Machine, 'created_at' | 'updated_at'>[]): Promise<Machine[]> {
    const supabase = getSupabase();
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
