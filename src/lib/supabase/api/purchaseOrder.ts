import { getSupabase, handleSupabaseError } from '../utils';
import type { PurchaseOrder, PurchaseOrderItem } from '../types';
export const purchaseOrderAPI = {
  // Get all purchase orders
  async getAll(): Promise<PurchaseOrder[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('purchase_purchase_order')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching purchase orders');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch purchase orders:', error);
      throw error;
    }
  },

  // Get purchase order by ID with items
  async getById(id: string): Promise<{ order: PurchaseOrder; items: PurchaseOrderItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: order, error: orderError } = await supabase
        .from('purchase_purchase_order')
        .select('*')
        .eq('id', id)
        .single();
      
      if (orderError) {
        handleSupabaseError(orderError, 'fetching purchase order');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('purchase_purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching purchase order items');
        return null;
      }

      return { order, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch purchase order:', error);
      return null;
    }
  },

  // Create purchase order with items
  async create(order: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>, items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at' | 'sr_no'>[]): Promise<PurchaseOrder | null> {
    try {
      const supabase = getSupabase();
      const { data: newOrder, error: orderError } = await supabase
        .from('purchase_purchase_order')
        .insert([order])
        .select()
        .single();
      
      if (orderError) {
        handleSupabaseError(orderError, 'creating purchase order');
        throw orderError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          purchase_order_id: newOrder.id,
          sr_no: index + 1,
          item_code: item.item_code || null,
          description: item.description,
          qty: item.qty ? parseFloat(item.qty.toString()) : null,
          unit: item.unit || null,
          rate: item.rate ? parseFloat(item.rate.toString()) : null,
          unit_price: item.unit_price || item.rate ? parseFloat((item.unit_price || item.rate || 0).toString()) : null,
          total_price: item.total_price ? parseFloat(item.total_price.toString()) : null
        }));

        const { error: itemsError } = await supabase
          .from('purchase_purchase_order_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating purchase order items');
          await supabase.from('purchase_purchase_order').delete().eq('id', newOrder.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created purchase order:', newOrder.id);
      return newOrder;
    } catch (error) {
      console.error('❌ Failed to create purchase order:', error);
      throw error;
    }
  },

  // Update purchase order
  async update(id: string, updates: Partial<PurchaseOrder>, items?: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at' | 'sr_no'>[]): Promise<PurchaseOrder | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('purchase_purchase_order')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating purchase order');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('purchase_purchase_order_items').delete().eq('purchase_order_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            purchase_order_id: id,
            sr_no: index + 1,
            item_code: item.item_code || null,
            description: item.description,
            qty: item.qty ? parseFloat(item.qty.toString()) : null,
            unit: item.unit || null,
            rate: item.rate ? parseFloat(item.rate.toString()) : null,
            unit_price: item.unit_price || item.rate ? parseFloat((item.unit_price || item.rate || 0).toString()) : null,
            total_price: item.total_price ? parseFloat(item.total_price.toString()) : null
          }));

          const { error: itemsError } = await supabase
            .from('purchase_purchase_order_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating purchase order items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update purchase order:', error);
      throw error;
    }
  },

  // Delete purchase order
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('purchase_purchase_order')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting purchase order');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete purchase order:', error);
      throw error;
    }
  }
};
