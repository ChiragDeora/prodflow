import { getSupabase, handleSupabaseError } from '../utils';
import type { DispatchMemo, DispatchMemoItem } from '../types';
export const dispatchMemoAPI = {
  // Get all dispatch memos
  async getAll(): Promise<DispatchMemo[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('dispatch_dispatch_memo')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching dispatch memos');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch dispatch memos:', error);
      throw error;
    }
  },

  // Get dispatch memo by ID with items
  async getById(id: string): Promise<{ memo: DispatchMemo; items: DispatchMemoItem[] } | null> {
    const supabase = getSupabase();
    try {
      const { data: memo, error: memoError } = await supabase
        .from('dispatch_dispatch_memo')
        .select('*')
        .eq('id', id)
        .single();
      
      if (memoError) {
        handleSupabaseError(memoError, 'fetching dispatch memo');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('dispatch_dispatch_memo_items')
        .select('*')
        .eq('memo_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching dispatch memo items');
        return null;
      }

      return { memo, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch dispatch memo:', error);
      return null;
    }
  },

  // Create dispatch memo with items
  async create(memo: Omit<DispatchMemo, 'id' | 'created_at' | 'updated_at'>, items: Omit<DispatchMemoItem, 'id' | 'memo_id' | 'created_at' | 'sr_no'>[]): Promise<DispatchMemo | null> {
    const supabase = getSupabase();
    try {
      // Insert memo first
      const { data: newMemo, error: memoError } = await supabase
        .from('dispatch_dispatch_memo')
        .insert([memo])
        .select()
        .single();
      
      if (memoError) {
        handleSupabaseError(memoError, 'creating dispatch memo');
        throw memoError;
      }

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          memo_id: newMemo.id,
          sr_no: index + 1,
          item_name: item.item_name,
          no_box: item.no_box || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('dispatch_dispatch_memo_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating dispatch memo items');
          // Rollback memo if items fail
          await supabase.from('dispatch_dispatch_memo').delete().eq('id', newMemo.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created dispatch memo:', newMemo.id);
      return newMemo;
    } catch (error) {
      console.error('❌ Failed to create dispatch memo:', error);
      throw error;
    }
  },

  // Update dispatch memo
  async update(id: string, updates: Partial<DispatchMemo>, items?: Omit<DispatchMemoItem, 'id' | 'memo_id' | 'created_at' | 'sr_no'>[]): Promise<DispatchMemo | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('dispatch_dispatch_memo')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating dispatch memo');
        throw error;
      }

      // Update items if provided
      if (items !== undefined) {
        // Delete existing items
        await supabase.from('dispatch_dispatch_memo_items').delete().eq('memo_id', id);
        
        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            memo_id: id,
            sr_no: index + 1,
            item_name: item.item_name,
            no_box: item.no_box || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('dispatch_dispatch_memo_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating dispatch memo items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update dispatch memo:', error);
      throw error;
    }
  },

  // Delete dispatch memo
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    try {
      // Items will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('dispatch_dispatch_memo')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting dispatch memo');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete dispatch memo:', error);
      throw error;
    }
  }
};
