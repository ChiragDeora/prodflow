import { getSupabase, handleSupabaseError } from '../utils';
import type { JWAnnexureGRN, JWAnnexureGRNItem } from '../types';
export const jwAnnexureGRNAPI = {
  // Get all JW Annexure GRNs
  async getAll(): Promise<JWAnnexureGRN[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_jw_annexure_grn')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching JW Annexure GRNs');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch JW Annexure GRNs:', error);
      throw error;
    }
  },

  // Get JW Annexure GRN by ID with items
  async getById(id: string): Promise<{ grn: JWAnnexureGRN; items: JWAnnexureGRNItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: grn, error: grnError } = await supabase
        .from('store_jw_annexure_grn')
        .select('*')
        .eq('id', id)
        .single();
      
      if (grnError) {
        handleSupabaseError(grnError, 'fetching JW Annexure GRN');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_jw_annexure_grn_items')
        .select('*')
        .eq('jw_annexure_grn_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching JW Annexure GRN items');
        return { grn, items: [] };
      }

      return { grn, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch JW Annexure GRN by ID:', error);
      return null;
    }
  },

  // Create new JW Annexure GRN with items
  async create(
    grnData: Omit<JWAnnexureGRN, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<JWAnnexureGRNItem, 'id' | 'jw_annexure_grn_id' | 'created_at'>[]
  ): Promise<JWAnnexureGRN> {
    try {
      const supabase = getSupabase();
      const { data: newGRN, error: grnError } = await supabase
        .from('store_jw_annexure_grn')
        .insert({
          ...grnData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (grnError) {
        handleSupabaseError(grnError, 'creating JW Annexure GRN');
        throw grnError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          jw_annexure_grn_id: newGRN.id,
          sr_no: index + 1,
          item_code: item.item_code || null,
          item_name: item.item_name || null,
          indent_qty: item.indent_qty || null,
          rcd_qty: item.rcd_qty || null,
          rate: item.rate || null,
          net_value: item.net_value || null,
          uom: (item as any).uom || null
        }));

        const { error: itemsError } = await supabase
          .from('store_jw_annexure_grn_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating JW Annexure GRN items');
          // Rollback GRN creation
          await supabase.from('store_jw_annexure_grn').delete().eq('id', newGRN.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created JW Annexure GRN:', newGRN.id);
      return newGRN;
    } catch (error) {
      console.error('❌ Failed to create JW Annexure GRN:', error);
      throw error;
    }
  },

  // Update JW Annexure GRN
  async update(
    id: string,
    updates: Partial<JWAnnexureGRN>,
    items?: Omit<JWAnnexureGRNItem, 'id' | 'jw_annexure_grn_id' | 'created_at'>[]
  ): Promise<JWAnnexureGRN | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_jw_annexure_grn')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating JW Annexure GRN');
        throw error;
      }

      if (items !== undefined) {
        // Delete existing items and insert new ones
        await supabase.from('store_jw_annexure_grn_items').delete().eq('jw_annexure_grn_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            jw_annexure_grn_id: id,
            sr_no: index + 1,
            item_code: item.item_code || null,
            item_name: item.item_name || null,
            indent_qty: item.indent_qty || null,
            rcd_qty: item.rcd_qty || null,
            rate: item.rate || null,
            net_value: item.net_value || null,
            uom: (item as any).uom || null
          }));

          const { error: itemsError } = await supabase
            .from('store_jw_annexure_grn_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating JW Annexure GRN items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update JW Annexure GRN:', error);
      throw error;
    }
  },

  // Delete JW Annexure GRN
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('store_jw_annexure_grn')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting JW Annexure GRN');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete JW Annexure GRN:', error);
      throw error;
    }
  }
};
