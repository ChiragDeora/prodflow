import { getSupabase, handleSupabaseError } from '../utils';
import type { Line } from '../types';
export const lineAPI = {
  // Get all lines
  async getAll(): Promise<Line[]> {
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
  async create(line: Omit<Line, 'created_at' | 'updated_at'>): Promise<Line | null> {
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('lines')
        .select(`
          *,
          im_machine:machines!fk_lines_im_machine(machine_id, make, model),
          robot_machine:machines!fk_lines_robot_machine(machine_id, make, model),
          conveyor_machine:machines!fk_lines_conveyor_machine(machine_id, make, model),
          hoist_machine:machines!fk_lines_hoist_machine(machine_id, make, model),
          loader_machine:machines!fk_lines_loader_machine(machine_id, make, model)
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
    const supabase = getSupabase();
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
