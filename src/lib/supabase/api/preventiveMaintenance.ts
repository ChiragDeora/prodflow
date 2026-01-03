import { getSupabase, handleSupabaseError } from '../utils';
import type { PreventiveMaintenanceTask } from '../types';
export const preventiveMaintenanceAPI = {
  // Get all preventive tasks
  async getAll(): Promise<PreventiveMaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('preventive_maintenance_tasks')
        .select('*')
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching preventive tasks');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'preventive tasks');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch preventive tasks:', error);
      throw error;
    }
  },

  // Get preventive task by ID
  async getById(taskId: string): Promise<PreventiveMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('preventive_maintenance_tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (error) {
      console.error('Error fetching preventive task:', error);
      return null;
    }
    return data;
  },

  // Create new preventive task
  async create(task: Omit<PreventiveMaintenanceTask, 'id' | 'created_at' | 'updated_at'>): Promise<PreventiveMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('preventive_maintenance_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'creating preventive task');
      throw error;
    }
    
    console.log('✅ Successfully created preventive task:', data?.id);
    return data;
  },

  // Update preventive task
  async update(taskId: string, updates: Partial<PreventiveMaintenanceTask>): Promise<PreventiveMaintenanceTask | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('preventive_maintenance_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating preventive task');
      throw error;
    }
    
    console.log('✅ Successfully updated preventive task:', data?.id);
    return data;
  },

  // Delete preventive task
  async delete(taskId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('preventive_maintenance_tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      handleSupabaseError(error, 'deleting preventive task');
      throw error;
    }
    
    console.log('✅ Successfully deleted preventive task:', taskId);
  },

  // Get overdue preventive tasks
  async getOverdue(): Promise<PreventiveMaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('preventive_maintenance_tasks')
        .select('*')
        .lt('due_date', new Date().toISOString().split('T')[0])
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching overdue preventive tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch overdue preventive tasks:', error);
      throw error;
    }
  }
};
