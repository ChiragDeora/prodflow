import { getSupabase, handleSupabaseError } from '../utils';
import type { BreakdownMaintenanceTask } from '../types';
export const breakdownMaintenanceAPI = {
  // Get all breakdown tasks
  async getAll(): Promise<BreakdownMaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('breakdown_maintenance_tasks')
        .select('*')
        .order('reported_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching breakdown tasks');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'breakdown tasks');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch breakdown tasks:', error);
      throw error;
    }
  },

  // Get breakdown task by ID
  async getById(taskId: string): Promise<BreakdownMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('breakdown_maintenance_tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (error) {
      console.error('Error fetching breakdown task:', error);
      return null;
    }
    return data;
  },

  // Create new breakdown task
  async create(task: Omit<BreakdownMaintenanceTask, 'id' | 'created_at' | 'updated_at'>): Promise<BreakdownMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('breakdown_maintenance_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'creating breakdown task');
      throw error;
    }
    
    console.log('✅ Successfully created breakdown task:', data?.id);
    return data;
  },

  // Update breakdown task
  async update(taskId: string, updates: Partial<BreakdownMaintenanceTask>): Promise<BreakdownMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('breakdown_maintenance_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating breakdown task');
      throw error;
    }
    
    console.log('✅ Successfully updated breakdown task:', data?.id);
    return data;
  },

  // Delete breakdown task
  async delete(taskId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('breakdown_maintenance_tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      handleSupabaseError(error, 'deleting breakdown task');
      throw error;
    }
    
    console.log('✅ Successfully deleted breakdown task:', taskId);
  },

  // Get active breakdown tasks
  async getActive(): Promise<BreakdownMaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('breakdown_maintenance_tasks')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('reported_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching active breakdown tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch active breakdown tasks:', error);
      throw error;
    }
  }
};
