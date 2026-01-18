import { getSupabase, handleSupabaseError } from '../utils';
import type { MIS, MISItem } from '../types';
export const misAPI = {
  // Get all Issue Slips
  async getAll(): Promise<MIS[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_mis')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching Issue Slips');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch Issue Slips:', error);
      throw error;
    }
  },

  // Get Issue Slip by ID with items
  async getById(id: string): Promise<{ mis: MIS; items: MISItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: mis, error: misError } = await supabase
        .from('store_mis')
        .select('*')
        .eq('id', id)
        .single();
      
      if (misError) {
        handleSupabaseError(misError, 'fetching Issue Slip');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_mis_items')
        .select('*')
        .eq('mis_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching Issue Slip items');
        return null;
      }

      return { mis, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch Issue Slip:', error);
      return null;
    }
  },

  // Create Issue Slip with items
  async create(mis: Omit<MIS, 'id' | 'created_at' | 'updated_at'>, items: Omit<MISItem, 'id' | 'mis_id' | 'created_at' | 'sr_no'>[]): Promise<MIS | null> {
    try {
      const supabase = getSupabase();
      const { data: newMIS, error: misError } = await supabase
        .from('store_mis')
        .insert([mis])
        .select()
        .single();
      
      if (misError) {
        handleSupabaseError(misError, 'creating Issue Slip');
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
          handleSupabaseError(itemsError, 'creating Issue Slip items');
          await supabase.from('store_mis').delete().eq('id', newMIS.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created Issue Slip:', newMIS.id);
      return newMIS;
    } catch (error) {
      console.error('❌ Failed to create Issue Slip:', error);
      throw error;
    }
  },

  // Update Issue Slip
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
        handleSupabaseError(error, 'updating Issue Slip');
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
            handleSupabaseError(itemsError, 'updating Issue Slip items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update Issue Slip:', error);
      throw error;
    }
  },

  // Delete Issue Slip
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('store_mis')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting Issue Slip');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete Issue Slip:', error);
      throw error;
    }
  }
};
