import { getSupabase, handleSupabaseError } from '../utils';
import type { OrderBook, OrderBookItem } from '../types';
export const orderBookAPI = {
  // Get all order books
  async getAll(): Promise<OrderBook[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('sales_order_book')
        .select('*')
        .order('order_date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching order books');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch order books:', error);
      throw error;
    }
  },

  // Get order book by ID with items
  async getById(id: string): Promise<{ order: OrderBook; items: OrderBookItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: order, error: orderError } = await supabase
        .from('sales_order_book')
        .select('*')
        .eq('id', id)
        .single();
      
      if (orderError) {
        handleSupabaseError(orderError, 'fetching order book');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('sales_order_book_items')
        .select('*')
        .eq('order_book_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching order book items');
        return null;
      }

      return { order, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch order book:', error);
      return null;
    }
  },

  // Create order book with items
  async create(order: Omit<OrderBook, 'id' | 'created_at' | 'updated_at'>, items: Omit<OrderBookItem, 'id' | 'order_book_id' | 'created_at' | 'sr_no'>[]): Promise<OrderBook | null> {
    try {
      const supabase = getSupabase();
      // Insert order first
      const { data: newOrder, error: orderError } = await supabase
        .from('sales_order_book')
        .insert([order])
        .select()
        .single();
      
      if (orderError) {
        handleSupabaseError(orderError, 'creating order book');
        throw orderError;
      }

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          order_book_id: newOrder.id,
          sr_no: index + 1,
          part_code: item.part_code,
          part_name: item.part_name || null,
          description: item.description || null,
          quantity: item.quantity,
          delivered_qty: item.delivered_qty || 0,
          pending_qty: item.pending_qty !== undefined ? item.pending_qty : item.quantity,
          unit: item.unit || null,
          unit_price: item.unit_price || null,
          total_price: item.total_price || null,
          delivery_schedule: item.delivery_schedule || null,
          status: item.status || 'Pending',
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('sales_order_book_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating order book items');
          // Rollback order if items fail
          await supabase.from('sales_order_book').delete().eq('id', newOrder.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created order book:', newOrder.id);
      return newOrder;
    } catch (error) {
      console.error('❌ Failed to create order book:', error);
      throw error;
    }
  },

  // Update order book
  async update(id: string, updates: Partial<OrderBook>, items?: Omit<OrderBookItem, 'id' | 'order_book_id' | 'created_at' | 'sr_no'>[]): Promise<OrderBook | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('sales_order_book')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating order book');
        throw error;
      }

      // Update items if provided
      if (items !== undefined) {
        // Delete existing items
        await supabase.from('sales_order_book_items').delete().eq('order_book_id', id);
        
        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            order_book_id: id,
            sr_no: index + 1,
            part_code: item.part_code,
            part_name: item.part_name || null,
            description: item.description || null,
            quantity: item.quantity,
            delivered_qty: item.delivered_qty || 0,
            pending_qty: item.pending_qty !== undefined ? item.pending_qty : item.quantity,
            unit: item.unit || null,
            unit_price: item.unit_price || null,
            total_price: item.total_price || null,
            delivery_schedule: item.delivery_schedule || null,
            status: item.status || 'Pending',
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('sales_order_book_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating order book items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update order book:', error);
      throw error;
    }
  },

  // Delete order book
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      // Items will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('sales_order_book')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting order book');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete order book:', error);
      throw error;
    }
  }
};
