import { getSupabase, handleSupabaseError } from '../utils';
import type { MIS, MISItem } from '../types';
export const misAPI = {
  // Get all MIS
  async getAll(): Promise<MIS[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_mis')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching MIS');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch MIS:', error);
      throw error;
    }
  },

  // Get MIS by ID with items
  async getById(id: string): Promise<{ mis: MIS; items: MISItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: mis, error: misError } = await supabase
        .from('store_mis')
        .select('*')
        .eq('id', id)
        .single();
      
      if (misError) {
        handleSupabaseError(misError, 'fetching MIS');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_mis_items')
        .select('*')
        .eq('mis_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching MIS items');
        return null;
      }

      return { mis, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch MIS:', error);
      return null;
    }
  },

  // Create MIS with items
  async create(mis: Omit<MIS, 'id' | 'created_at' | 'updated_at'>, items: Omit<MISItem, 'id' | 'mis_id' | 'created_at' | 'sr_no'>[]): Promise<MIS | null> {
    try {
      const supabase = getSupabase();
      const { data: newMIS, error: misError } = await supabase
        .from('store_mis')
        .insert([mis])
        .select()
        .single();
      
      if (misError) {
        handleSupabaseError(misError, 'creating MIS');
        throw misError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          mis_id: newMIS.id,
          sr_no: index + 1,
          description_of_material: item.description_of_material,
          item_code: item.item_code || null,
          uom: item.uom || null,
          required_qty: item.required_qty ? parseFloat(item.required_qty.toString()) : null,
          issue_qty: item.issue_qty ? parseFloat(item.issue_qty.toString()) : null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('store_mis_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating MIS items');
          await supabase.from('store_mis').delete().eq('id', newMIS.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created MIS:', newMIS.id);
      return newMIS;
    } catch (error) {
      console.error('❌ Failed to create MIS:', error);
      throw error;
    }
  },

  // Update MIS
  async update(id: string, updates: Partial<MIS>, items?: Omit<MISItem, 'id' | 'mis_id' | 'created_at' | 'sr_no'>[]): Promise<MIS | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_mis')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating MIS');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('store_mis_items').delete().eq('mis_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            mis_id: id,
            sr_no: index + 1,
            description_of_material: item.description_of_material,
            item_code: item.item_code || null,
            uom: item.uom || null,
            required_qty: item.required_qty ? parseFloat(item.required_qty.toString()) : null,
            issue_qty: item.issue_qty ? parseFloat(item.issue_qty.toString()) : null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('store_mis_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating MIS items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update MIS:', error);
      throw error;
    }
  },

  // Delete MIS
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('store_mis')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting MIS');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete MIS:', error);
      throw error;
    }
  }
};
