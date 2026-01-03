import { getSupabase, handleSupabaseError } from '../utils';
import type { MaintenanceChecklist } from '../types';
export const maintenanceChecklistAPI = {
  // Get all maintenance checklists
  async getAll(): Promise<MaintenanceChecklist[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_checklists table does not exist, returning empty array');
          return [];
        }
        handleSupabaseError(error, 'fetching maintenance checklists');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch maintenance checklists:', error);
      return [];
    }
  },

  // Get checklists by type
  async getByType(type: 'machine' | 'line' | 'general'): Promise<MaintenanceChecklist[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .select('*')
        .eq('checklist_type', type)
        .order('name', { ascending: true });
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_checklists table does not exist, returning empty array');
          return [];
        }
        handleSupabaseError(error, 'fetching checklists by type');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch checklists by type:', error);
      return [];
    }
  },

  // Create new maintenance checklist
  async create(checklist: Omit<MaintenanceChecklist, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceChecklist | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .insert(checklist)
        .select()
        .single();
      
      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_checklists table does not exist, cannot create checklist');
          return null;
        }
        handleSupabaseError(error, 'creating maintenance checklist');
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to create maintenance checklist:', error);
      return null;
    }
  },

  // Update maintenance checklist
  async update(checklistId: string, updates: Partial<MaintenanceChecklist>): Promise<MaintenanceChecklist | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .update(updates)
        .eq('id', checklistId)
        .select()
        .single();
      
      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_checklists table does not exist, cannot update checklist');
          return null;
        }
        handleSupabaseError(error, 'updating maintenance checklist');
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to update maintenance checklist:', error);
      return null;
    }
  },

  // Delete maintenance checklist
  async delete(checklistId: string): Promise<void> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('maintenance_checklists')
        .delete()
        .eq('id', checklistId);
      
      if (error) {
        // If table doesn't exist, just log and return (don't throw)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_checklists table does not exist, cannot delete checklist');
          return;
        }
        handleSupabaseError(error, 'deleting maintenance checklist');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete maintenance checklist:', error);
      // Don't throw - just log the error
    }
  },

  // Bulk create maintenance checklists
  async bulkCreate(checklists: Omit<MaintenanceChecklist, 'id' | 'created_at' | 'updated_at'>[]): Promise<MaintenanceChecklist[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .insert(checklists)
        .select();
      
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ maintenance_checklists table does not exist, cannot bulk create checklists');
          return [];
        }
        handleSupabaseError(error, 'bulk creating maintenance checklists');
        throw error;
      }
      
      console.log('✅ Successfully bulk created', data?.length || 0, 'maintenance checklists');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to bulk create maintenance checklists:', error);
      throw error;
    }
  }
};
