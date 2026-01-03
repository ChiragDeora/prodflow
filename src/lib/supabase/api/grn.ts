import { getSupabase, handleSupabaseError } from '../utils';
import type { GRN, GRNItem } from '../types';
export const grnAPI = {
  // Get all GRNs
  async getAll(): Promise<GRN[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_grn')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching GRNs');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch GRNs:', error);
      throw error;
    }
  },

  // Get GRN by ID with items
  async getById(id: string): Promise<{ grn: GRN; items: GRNItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: grn, error: grnError } = await supabase
        .from('store_grn')
        .select('*')
        .eq('id', id)
        .single();
      
      if (grnError) {
        handleSupabaseError(grnError, 'fetching GRN');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_grn_items')
        .select('*')
        .eq('grn_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching GRN items');
        return null;
      }

      return { grn, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch GRN:', error);
      return null;
    }
  },

  // Create GRN with items
  async create(grn: Omit<GRN, 'id' | 'created_at' | 'updated_at'>, items: Omit<GRNItem, 'id' | 'grn_id' | 'created_at' | 'sr_no'>[]): Promise<GRN | null> {
    try {
      const supabase = getSupabase();
      const { data: newGRN, error: grnError } = await supabase
        .from('store_grn')
        .insert([grn])
        .select()
        .single();
      
      if (grnError) {
        handleSupabaseError(grnError, 'creating GRN');
        throw grnError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          grn_id: newGRN.id,
          sr_no: index + 1,
          item_description: item.item_description,
          box_bag: item.box_bag || null,
          per_box_bag_qty: item.per_box_bag_qty ? parseFloat(item.per_box_bag_qty.toString()) : null,
          total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
          uom: item.uom || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('store_grn_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating GRN items');
          await supabase.from('store_grn').delete().eq('id', newGRN.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created GRN:', newGRN.id);
      return newGRN;
    } catch (error) {
      console.error('❌ Failed to create GRN:', error);
      throw error;
    }
  },

  // Update GRN
  async update(id: string, updates: Partial<GRN>, items?: Omit<GRNItem, 'id' | 'grn_id' | 'created_at' | 'sr_no'>[]): Promise<GRN | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_grn')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating GRN');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('store_grn_items').delete().eq('grn_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            grn_id: id,
            sr_no: index + 1,
            item_description: item.item_description,
            box_bag: item.box_bag || null,
            per_box_bag_qty: item.per_box_bag_qty ? parseFloat(item.per_box_bag_qty.toString()) : null,
            total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
            uom: item.uom || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('store_grn_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating GRN items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update GRN:', error);
      throw error;
    }
  },

  // Delete GRN
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('store_grn')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting GRN');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete GRN:', error);
      throw error;
    }
  }
};
