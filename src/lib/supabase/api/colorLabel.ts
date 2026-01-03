import { getSupabase, handleSupabaseError } from '../utils';
import type { ColorLabel } from '../types';
export const colorLabelAPI = {
  // Get all color/labels
  async getAll(): Promise<ColorLabel[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('color_label_master')
        .select('*')
        .order('sr_no', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching color/labels');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch color/labels:', error);
      throw error;
    }
  },

  // Get color/label by ID
  async getById(id: string): Promise<ColorLabel | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('color_label_master')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching color/label');
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch color/label:', error);
      return null;
    }
  },

  // Create new color/label
  async create(colorLabel: Omit<ColorLabel, 'id' | 'created_at' | 'updated_at'>): Promise<ColorLabel | null> {
    try {
      const supabase = getSupabase();
      // If sr_no is not provided, get the next available number
      let finalColorLabel = { ...colorLabel };
      if (!finalColorLabel.sr_no) {
        const { data: existing } = await supabase
          .from('color_label_master')
          .select('sr_no')
          .order('sr_no', { ascending: false })
          .limit(1)
          .single();
        
        finalColorLabel.sr_no = existing?.sr_no ? existing.sr_no + 1 : 1;
      }
      
      const { data, error } = await supabase
        .from('color_label_master')
        .insert([finalColorLabel])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating color/label');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to create color/label:', error);
      throw error;
    }
  },

  // Update color/label
  async update(id: string, updates: Partial<ColorLabel>): Promise<ColorLabel | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('color_label_master')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating color/label');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to update color/label:', error);
      throw error;
    }
  },

  // Delete color/label
  async delete(id: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('color_label_master')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting color/label');
        throw error;
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to delete color/label:', error);
      throw error;
    }
  },

  // Get colors for a specific party
  async getColorsForParty(partyName: string): Promise<ColorLabel[]> {
    try {
      const supabase = getSupabase();
      // First, get the party ID
      const { data: partyData, error: partyError } = await supabase
        .from('party_name_master')
        .select('id')
        .eq('name', partyName)
        .single();
      
      if (partyError || !partyData) {
        // If party not found or no mapping, return all colors
        return await this.getAll();
      }

      // Get mapped colors for this party
      const { data: mappingData, error: mappingError } = await supabase
        .from('party_color_mapping')
        .select('color_label_id')
        .eq('party_name_id', partyData.id);

      // Handle 404 error (table doesn't exist) or other errors gracefully
      if (mappingError) {
        // Check if it's a 404 (table doesn't exist) - this is expected if migration hasn't been run
        if (mappingError.code === 'PGRST116' || mappingError.message?.includes('404') || mappingError.message?.includes('not found')) {
          // Table doesn't exist - silently fall back to all colors
          console.log(`ℹ️ party_color_mapping table not found - returning all colors for party "${partyName}"`);
        } else {
          // Other error - log it but still fall back
          console.warn('⚠️ Error fetching party color mapping:', mappingError);
        }
        // If no mapping exists or table doesn't exist, return all colors
        return await this.getAll();
      }

      if (!mappingData || mappingData.length === 0) {
        // If no mapping exists, return all colors
        return await this.getAll();
      }

      // Get the actual color labels
      const colorIds = mappingData.map(m => m.color_label_id);
      const { data: colorsData, error: colorsError } = await supabase
        .from('color_label_master')
        .select('*')
        .in('id', colorIds)
        .order('sr_no');

      if (colorsError) {
        handleSupabaseError(colorsError, 'fetching colors for party');
        // Fallback to all colors
        return await this.getAll();
      }

      return colorsData || [];
    } catch (error) {
      console.error('❌ Failed to fetch colors for party:', error);
      // Fallback to all colors
      return await this.getAll();
    }
  }
};
