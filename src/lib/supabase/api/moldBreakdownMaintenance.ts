import { getSupabase, handleSupabaseError } from '../utils';
import type { MoldBreakdownMaintenanceTask } from '../types';
export const moldBreakdownMaintenanceAPI = {
  // Get all mold breakdown tasks
  async getAll(): Promise<MoldBreakdownMaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('mold_breakdown_maintenance_tasks')
        .select('*')
        .order('reported_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching mold breakdown tasks');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'mold breakdown tasks');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch mold breakdown tasks:', error);
      throw error;
    }
  },

  // Get mold breakdown task by ID
  async getById(taskId: string): Promise<MoldBreakdownMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('mold_breakdown_maintenance_tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (error) {
      console.error('Error fetching mold breakdown task:', error);
      return null;
    }
    return data;
  },

  // Create new mold breakdown task
  async create(task: Omit<MoldBreakdownMaintenanceTask, 'id' | 'created_at' | 'updated_at'>): Promise<MoldBreakdownMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('mold_breakdown_maintenance_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'creating mold breakdown task');
      throw error;
    }
    
    console.log('✅ Successfully created mold breakdown task:', data?.id);
    return data;
  },

  // Update mold breakdown task
  async update(taskId: string, updates: Partial<MoldBreakdownMaintenanceTask>): Promise<MoldBreakdownMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('mold_breakdown_maintenance_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating mold breakdown task');
      throw error;
    }
    
    console.log('✅ Successfully updated mold breakdown task:', data?.id);
    return data;
  },

  // Delete mold breakdown task
  async delete(taskId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('mold_breakdown_maintenance_tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      handleSupabaseError(error, 'deleting mold breakdown task');
      throw error;
    }
    
    console.log('✅ Successfully deleted mold breakdown task:', taskId);
  },

  // Get active mold breakdown tasks
  async getActive(): Promise<MoldBreakdownMaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('mold_breakdown_maintenance_tasks')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('reported_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching active mold breakdown tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch active mold breakdown tasks:', error);
      throw error;
    }
  }
};
