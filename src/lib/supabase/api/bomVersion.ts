import { getSupabase, handleSupabaseError } from '../utils';
import type { BOMVersion, BOMVersionWithComponents, BOMComponent } from '../types';
export const bomVersionAPI = {
  // Get all BOM versions
  async getAll(): Promise<BOMVersionWithComponents[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_versions_with_components')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM versions');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM versions:', error);
      throw error;
    }
  },

  // Get BOM version by ID
  async getById(id: string): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM version');
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching BOM version');
      return null;
    }
  },

  // Get versions by BOM master ID
  async getByBOMMasterId(bomMasterId: string): Promise<BOMVersion[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .select('*')
        .eq('bom_master_id', bomMasterId)
        .order('version_number', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM versions by master ID');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM versions by master ID:', error);
      throw error;
    }
  },

  // Get active version by BOM master ID
  async getActiveByBOMMasterId(bomMasterId: string): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .select('*')
        .eq('bom_master_id', bomMasterId)
        .eq('is_active', true)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching active BOM version');
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching active BOM version');
      return null;
    }
  },

  // Create new BOM version
  async create(bomVersion: Omit<BOMVersion, 'id' | 'created_at' | 'updated_at'>): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      // Set user context for audit trail
      await supabase.rpc('set_current_user_context', { user_name: bomVersion.created_by });
      
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .insert([bomVersion])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating BOM version');
        throw error;
      }
      
      console.log('✅ Successfully created BOM version:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating BOM version');
      throw error;
    }
  },

  // Create new version for existing BOM
  async createNewVersion(
    bomMasterId: string,
    components: BOMComponent[],
    notes: string,
    changeReason: string,
    createdBy: string
  ): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      // Get next version number
      const { data: nextVersion, error: versionError } = await supabase
        .rpc('get_next_bom_version', { bom_master_uuid: bomMasterId });
      
      if (versionError) {
        handleSupabaseError(versionError, 'getting next BOM version');
        throw versionError;
      }

      // Calculate total cost
      const totalCost = components.reduce((sum, comp) => sum + comp.total_cost, 0);

      // Create new version
      const newVersion: Omit<BOMVersion, 'id' | 'created_at' | 'updated_at'> = {
        bom_master_id: bomMasterId,
        version_number: nextVersion,
        is_active: true,
        components,
        total_components: components.length,
        total_cost: totalCost,
        notes,
        change_reason: changeReason,
        created_by: createdBy
      };

      return await this.create(newVersion);
    } catch (error) {
      handleSupabaseError(error, 'creating new BOM version');
      throw error;
    }
  },

  // Update BOM version
  async update(id: string, updates: Partial<BOMVersion>): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      // Set user context for audit trail
      if (updates.created_by) {
        await supabase.rpc('set_current_user_context', { user_name: updates.created_by });
      }
      
      const { data, error } = await supabase
        .from('sfg_bom_versions_trial')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating BOM version');
        throw error;
      }
      
      console.log('✅ Successfully updated BOM version:', data?.id);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating BOM version');
      throw error;
    }
  },

  // Activate version
  async activate(id: string, activatedBy: string): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      // First get the BOM master ID
      const version = await this.getById(id);
      if (!version) {
        throw new Error('Version not found');
      }

      // Deactivate all other versions in the same lineage
      const { error: deactivateError } = await supabase
        .from('sfg_bom_versions_trial')
        .update({ is_active: false })
        .eq('bom_master_id', version.bom_master_id)
        .neq('id', id);

      if (deactivateError) {
        handleSupabaseError(deactivateError, 'deactivating other versions');
        throw deactivateError;
      }

      // Activate this version
      return await this.update(id, { is_active: true, created_by: activatedBy });
    } catch (error) {
      handleSupabaseError(error, 'activating BOM version');
      throw error;
    }
  }
};
