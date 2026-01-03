import { getSupabase, handleSupabaseError } from '../utils';
import type { BOMComponent } from '../types';
export const bomComponentAPI = {
  // Get all BOM components
  async getAll(): Promise<BOMComponent[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('sfg_bom_components_trial')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM components');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM components:', error);
      throw error;
    }
  },

  // Get components by BOM version ID
  async getByBOMVersionId(bomVersionId: string): Promise<BOMComponent[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('sfg_bom_components_trial')
        .select('*')
        .eq('bom_version_id', bomVersionId)
        .order('component_code', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM components by version ID');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM components by version ID:', error);
      throw error;
    }
  },

  // Create BOM component
  async create(component: Omit<BOMComponent, 'id' | 'created_at' | 'updated_at'>): Promise<BOMComponent | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_components_trial')
        .insert([component])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating BOM component');
        throw error;
      }
      
      console.log('✅ Successfully created BOM component:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating BOM component');
      throw error;
    }
  },

  // Bulk create BOM components
  async bulkCreate(components: Omit<BOMComponent, 'id' | 'created_at' | 'updated_at'>[]): Promise<BOMComponent[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_components_trial')
        .insert(components)
        .select();
      
      if (error) {
        handleSupabaseError(error, 'bulk creating BOM components');
        throw error;
      }
      
      console.log('✅ Successfully bulk created', data?.length || 0, 'BOM components');
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'bulk creating BOM components');
      throw error;
    }
  },

  // Update BOM component
  async update(id: string, updates: Partial<BOMComponent>): Promise<BOMComponent | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_components_trial')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating BOM component');
        throw error;
      }
      
      console.log('✅ Successfully updated BOM component:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating BOM component');
      throw error;
    }
  },

  // Delete BOM component
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('bom_components_trial')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting BOM component');
        throw error;
      }
      
      console.log('✅ Successfully deleted BOM component:', id);
    } catch (error) {
      handleSupabaseError(error, 'deleting BOM component');
      throw error;
    }
  }
};
