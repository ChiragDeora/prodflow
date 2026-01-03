import { getSupabase, handleSupabaseError } from '../utils';
import type { DeliveryChallan, DeliveryChallanItem } from '../types';
export const deliveryChallanAPI = {
  // Get all delivery challans
  async getAll(): Promise<DeliveryChallan[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('dispatch_delivery_challan')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching delivery challans');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch delivery challans:', error);
      throw error;
    }
  },

  // Get delivery challan by ID with items
  async getById(id: string): Promise<{ challan: DeliveryChallan; items: DeliveryChallanItem[] } | null> {
    const supabase = getSupabase();
    try {
      const { data: challan, error: challanError } = await supabase
        .from('dispatch_delivery_challan')
        .select('*')
        .eq('id', id)
        .single();
      
      if (challanError) {
        handleSupabaseError(challanError, 'fetching delivery challan');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('dispatch_delivery_challan_items')
        .select('*')
        .eq('challan_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching delivery challan items');
        return null;
      }

      return { challan, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch delivery challan:', error);
      return null;
    }
  },

  // Create delivery challan with items
  async create(challan: Omit<DeliveryChallan, 'id' | 'created_at' | 'updated_at'>, items: Omit<DeliveryChallanItem, 'id' | 'challan_id' | 'created_at' | 'sr_no'>[]): Promise<DeliveryChallan | null> {
    const supabase = getSupabase();
    try {
      // Insert challan first
      const { data: newChallan, error: challanError } = await supabase
        .from('dispatch_delivery_challan')
        .insert([challan])
        .select()
        .single();
      
      if (challanError) {
        handleSupabaseError(challanError, 'creating delivery challan');
        throw challanError;
      }

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          challan_id: newChallan.id,
          sr_no: index + 1,
          material_description: item.material_description,
          qty: item.qty ? parseFloat(item.qty.toString()) : null,
          uom: item.uom || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('dispatch_delivery_challan_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating delivery challan items');
          // Rollback challan if items fail
          await supabase.from('dispatch_delivery_challan').delete().eq('id', newChallan.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created delivery challan:', newChallan.id);
      return newChallan;
    } catch (error) {
      console.error('❌ Failed to create delivery challan:', error);
      throw error;
    }
  },

  // Update delivery challan
  async update(id: string, updates: Partial<DeliveryChallan>, items?: Omit<DeliveryChallanItem, 'id' | 'challan_id' | 'created_at' | 'sr_no'>[]): Promise<DeliveryChallan | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('dispatch_delivery_challan')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating delivery challan');
        throw error;
      }

      // Update items if provided
      if (items !== undefined) {
        // Delete existing items
        await supabase.from('dispatch_delivery_challan_items').delete().eq('challan_id', id);
        
        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            challan_id: id,
            sr_no: index + 1,
            material_description: item.material_description,
            qty: item.qty ? parseFloat(item.qty.toString()) : null,
            uom: item.uom || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('dispatch_delivery_challan_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating delivery challan items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update delivery challan:', error);
      throw error;
    }
  },

  // Delete delivery challan
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    try {
      // Items will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('dispatch_delivery_challan')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting delivery challan');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete delivery challan:', error);
      throw error;
    }
  }
};
