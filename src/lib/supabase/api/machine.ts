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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
