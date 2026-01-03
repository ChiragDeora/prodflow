import { getSupabase, handleSupabaseError } from '../utils';
import type { FGN, FGNItem } from '../types';
export const fgnAPI = {
  // Get all FGNs
  async getAll(): Promise<FGN[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_fgn')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching FGNs');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch FGNs:', error);
      throw error;
    }
  },

  // Get FGN by ID with items
  async getById(id: string): Promise<{ fgn: FGN; items: FGNItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: fgn, error: fgnError } = await supabase
        .from('store_fgn')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fgnError) {
        handleSupabaseError(fgnError, 'fetching FGN');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_fgn_items')
        .select('*')
        .eq('fgn_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching FGN items');
        return null;
      }

      return { fgn, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch FGN:', error);
      return null;
    }
  },

  // Create FGN with items
  async create(fgn: Omit<FGN, 'id' | 'created_at' | 'updated_at'>, items: Omit<FGNItem, 'id' | 'fgn_id' | 'created_at' | 'sr_no'>[]): Promise<FGN | null> {
    try {
      const supabase = getSupabase();
      const { data: newFGN, error: fgnError } = await supabase
        .from('store_fgn')
        .insert([fgn])
        .select()
        .single();
      
      if (fgnError) {
        handleSupabaseError(fgnError, 'creating FGN');
        throw fgnError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          fgn_id: newFGN.id,
          sr_no: index + 1,
          item_name: item.item_name,
          no_of_boxes: item.no_of_boxes ? parseInt(item.no_of_boxes.toString()) : null,
          qty_in_box: item.qty_in_box ? parseFloat(item.qty_in_box.toString()) : null,
          total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
          received_qty: item.received_qty ? parseFloat(item.received_qty.toString()) : null,
          qc_check: item.qc_check || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('store_fgn_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating FGN items');
          await supabase.from('store_fgn').delete().eq('id', newFGN.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created FGN:', newFGN.id);
      return newFGN;
    } catch (error) {
      console.error('❌ Failed to create FGN:', error);
      throw error;
    }
  },

  // Update FGN
  async update(id: string, updates: Partial<FGN>, items?: Omit<FGNItem, 'id' | 'fgn_id' | 'created_at' | 'sr_no'>[]): Promise<FGN | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_fgn')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating FGN');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('store_fgn_items').delete().eq('fgn_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            fgn_id: id,
            sr_no: index + 1,
            item_name: item.item_name,
            no_of_boxes: item.no_of_boxes ? parseInt(item.no_of_boxes.toString()) : null,
            qty_in_box: item.qty_in_box ? parseFloat(item.qty_in_box.toString()) : null,
            total_qty: item.total_qty ? parseFloat(item.total_qty.toString()) : null,
            received_qty: item.received_qty ? parseFloat(item.received_qty.toString()) : null,
            qc_check: item.qc_check || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('store_fgn_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating FGN items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update FGN:', error);
      throw error;
    }
  },

  // Delete FGN
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('store_fgn')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting FGN');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete FGN:', error);
      throw error;
    }
  }
};
