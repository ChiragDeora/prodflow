import { getSupabase, handleSupabaseError } from '../utils';
import type { MaintenanceTask } from '../types';
export const maintenanceTaskAPI = {
  // Get all maintenance tasks
  async getAll(): Promise<MaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      // Check if table exists first
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist, returning empty array');
          return [];
        }
        handleSupabaseError(error, 'fetching maintenance tasks');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'maintenance tasks');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch maintenance tasks:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Get maintenance task by ID
  async getById(taskId: string): Promise<MaintenanceTask | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist');
          return null;
        }
        console.error('Error fetching maintenance task:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to get maintenance task:', error);
      return null;
    }
  },

  // Create new maintenance task
  async create(task: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceTask | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist, cannot create task');
          return null;
        }
        handleSupabaseError(error, 'creating maintenance task');
        throw error;
      }
      
      console.log('✅ Successfully created maintenance task:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create maintenance task:', error);
      return null;
    }
  },

  // Update maintenance task
  async update(taskId: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist, cannot update task');
          return null;
        }
        handleSupabaseError(error, 'updating maintenance task');
        throw error;
      }
      
      console.log('✅ Successfully updated maintenance task:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to update maintenance task:', error);
      return null;
    }
  },

  // Delete maintenance task
  async delete(taskId: string): Promise<void> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('maintenance_tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        // If table doesn't exist, just log and return (don't throw)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist, cannot delete task');
          return;
        }
        handleSupabaseError(error, 'deleting maintenance task');
        throw error;
      }
      
      console.log('✅ Successfully deleted maintenance task:', taskId);
    } catch (error) {
      console.error('❌ Failed to delete maintenance task:', error);
      // Don't throw - just log the error
    }
  },

  // Get tasks by line
  async getByLine(lineId: string): Promise<MaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('line_id', lineId)
        .order('due_date', { ascending: true });
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist, returning empty array');
          return [];
        }
        handleSupabaseError(error, 'fetching line maintenance tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch line maintenance tasks:', error);
      return [];
    }
  },

  // Get tasks by machine
  async getByMachine(machineId: string): Promise<MaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('machine_id', machineId)
        .order('due_date', { ascending: true });
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist, returning empty array');
          return [];
        }
        handleSupabaseError(error, 'fetching machine maintenance tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch machine maintenance tasks:', error);
      return [];
    }
  },

  // Get overdue tasks
  async getOverdue(): Promise<MaintenanceTask[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .lt('due_date', new Date().toISOString().split('T')[0])
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_tasks table does not exist, returning empty array');
          return [];
        }
        handleSupabaseError(error, 'fetching overdue maintenance tasks');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch overdue maintenance tasks:', error);
      return [];
    }
  }
};
