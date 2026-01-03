import { getSupabase, handleSupabaseError } from '../utils';
import type { MaintenanceSchedule } from '../types';
export const maintenanceScheduleAPI = {
  // Get all maintenance schedules
  async getAll(): Promise<MaintenanceSchedule[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_schedules table does not exist, returning empty array');
          return [];
        }
        handleSupabaseError(error, 'fetching maintenance schedules');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch maintenance schedules:', error);
      return [];
    }
  },

  // Create new maintenance schedule
  async create(schedule: Omit<MaintenanceSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceSchedule | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .insert(schedule)
        .select()
        .single();
      
      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_schedules table does not exist, cannot create schedule');
          return null;
        }
        handleSupabaseError(error, 'creating maintenance schedule');
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to create maintenance schedule:', error);
      return null;
    }
  },

  // Update maintenance schedule
  async update(scheduleId: string, updates: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .update(updates)
        .eq('id', scheduleId)
        .select()
        .single();
      
      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_schedules table does not exist, cannot update schedule');
          return null;
        }
        handleSupabaseError(error, 'updating maintenance schedule');
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to update maintenance schedule:', error);
      return null;
    }
  },

  // Delete maintenance schedule
  async delete(scheduleId: string): Promise<void> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .delete()
        .eq('id', scheduleId);
      
      if (error) {
        // If table doesn't exist, just log and return (don't throw)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_schedules table does not exist, cannot delete schedule');
          return;
        }
        handleSupabaseError(error, 'deleting maintenance schedule');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete maintenance schedule:', error);
      // Don't throw - just log the error
    }
  }
};
