import { getSupabase, handleSupabaseError } from '../utils';
import type { MaterialIndentSlip, MaterialIndentSlipItem } from '../types';
export const materialIndentSlipAPI = {
  // Get all material indent slips
  async getAll(): Promise<MaterialIndentSlip[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('purchase_material_indent_slip')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching material indent slips');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch material indent slips:', error);
      throw error;
    }
  },

  // Get material indent slip by ID with items
  async getById(id: string): Promise<{ slip: MaterialIndentSlip; items: MaterialIndentSlipItem[] } | null> {
    const supabase = getSupabase();
    try {
      const { data: slip, error: slipError } = await supabase
        .from('purchase_material_indent_slip')
        .select('*')
        .eq('id', id)
        .single();
      
      if (slipError) {
        handleSupabaseError(slipError, 'fetching material indent slip');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('purchase_material_indent_slip_items')
        .select('*')
        .eq('indent_slip_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching material indent slip items');
        return null;
      }

      return { slip, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch material indent slip:', error);
      return null;
    }
  },

  // Create material indent slip with items
  async create(slip: Omit<MaterialIndentSlip, 'id' | 'created_at' | 'updated_at'>, items: Omit<MaterialIndentSlipItem, 'id' | 'indent_slip_id' | 'created_at' | 'sr_no'>[]): Promise<MaterialIndentSlip | null> {
    const supabase = getSupabase();
    try {
      console.log('[MaterialIndentSlipAPI] Creating slip with:', {
        address: slip.address,
        state: slip.state,
        gst_no: slip.gst_no
      });
      
      const { data: newSlip, error: slipError } = await supabase
        .from('purchase_material_indent_slip')
        .insert([slip])
        .select()
        .single();
      
      if (slipError) {
        handleSupabaseError(slipError, 'creating material indent slip');
        throw slipError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          indent_slip_id: newSlip.id,
          sr_no: index + 1,
          // New fields
          item_code: item.item_code || null,
          item_name: item.item_name || null,
          dimension: item.dimension || null,
          pack_size: item.pack_size || null,
          party_name: item.party_name || null,
          color_remarks: item.color_remarks || null,
          qty: item.qty ? parseFloat(item.qty.toString()) : null,
          uom: item.uom || null
          // Note: description_specification and make_mfg_remarks were dropped in migration 20250208000001
        }));

        const { error: itemsError } = await supabase
          .from('purchase_material_indent_slip_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating material indent slip items');
          await supabase.from('purchase_material_indent_slip').delete().eq('id', newSlip.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created material indent slip:', newSlip.id);
      return newSlip;
    } catch (error) {
      console.error('❌ Failed to create material indent slip:', error);
      throw error;
    }
  },

  // Update material indent slip
  async update(id: string, updates: Partial<MaterialIndentSlip>, items?: Omit<MaterialIndentSlipItem, 'id' | 'indent_slip_id' | 'created_at' | 'sr_no'>[]): Promise<MaterialIndentSlip | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('purchase_material_indent_slip')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating material indent slip');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('purchase_material_indent_slip_items').delete().eq('indent_slip_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            indent_slip_id: id,
            sr_no: index + 1,
            // New fields
            item_code: item.item_code || null,
            item_name: item.item_name || null,
            dimension: item.dimension || null,
            pack_size: item.pack_size || null,
            party_name: item.party_name || null,
            color_remarks: item.color_remarks || null,
            qty: item.qty ? parseFloat(item.qty.toString()) : null,
            uom: item.uom || null
            // Note: description_specification and make_mfg_remarks were dropped in migration 20250208000001
          }));

          const { error: itemsError } = await supabase
            .from('purchase_material_indent_slip_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating material indent slip items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update material indent slip:', error);
      throw error;
    }
  },

  // Delete material indent slip
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('purchase_material_indent_slip')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting material indent slip');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete material indent slip:', error);
      throw error;
    }
  },

  // Manually close a material indent slip
  async manuallyClose(id: string): Promise<boolean> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('purchase_material_indent_slip')
        .update({ 
          status: 'MANUALLY_CLOSED',
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'manually closing material indent slip');
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to manually close material indent slip:', error);
      return false;
    }
  },

  // Update received quantity for a specific item
  async updateReceivedQuantity(indentSlipId: string, itemId: string, receivedQty: number): Promise<boolean> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('purchase_material_indent_slip_items')
        .update({ 
          received_qty: receivedQty
        })
        .eq('id', itemId)
        .eq('indent_slip_id', indentSlipId);
      
      if (error) {
        handleSupabaseError(error, 'updating received quantity');
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to update received quantity:', error);
      return false;
    }
  },

  // Get open indents (with pending quantities)
  async getOpenIndents(): Promise<{ slip: MaterialIndentSlip; items: MaterialIndentSlipItem[] }[]> {
    try {
      const supabase = getSupabase();
      const { data: slips, error: slipsError } = await supabase
        .from('purchase_material_indent_slip')
        .select('*')
        .in('status', ['OPEN', 'CLOSED_OVER_RECEIVED'])
        .order('date', { ascending: false });
      
      if (slipsError) {
        handleSupabaseError(slipsError, 'fetching open material indent slips');
        throw slipsError;
      }

      const result = [];
      for (const slip of slips || []) {
        const { data: items, error: itemsError } = await supabase
          .from('purchase_material_indent_slip_items')
          .select('*')
          .eq('indent_slip_id', slip.id)
          .order('sr_no', { ascending: true });
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'fetching material indent slip items');
          continue;
        }

        result.push({ slip, items: items || [] });
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to fetch open material indent slips:', error);
      throw error;
    }
  },

  // Get completed indents (closed perfect or items with pending_qty = 0)
  async getCompletedIndents(): Promise<{ slip: MaterialIndentSlip; items: MaterialIndentSlipItem[] }[]> {
    try {
      const supabase = getSupabase();
      const { data: slips, error: slipsError } = await supabase
        .from('purchase_material_indent_slip')
        .select('*')
        .eq('status', 'CLOSED_PERFECT')
        .order('date', { ascending: false });
      
      if (slipsError) {
        handleSupabaseError(slipsError, 'fetching completed material indent slips');
        throw slipsError;
      }

      const result = [];
      for (const slip of slips || []) {
        const { data: items, error: itemsError } = await supabase
          .from('purchase_material_indent_slip_items')
          .select('*')
          .eq('indent_slip_id', slip.id)
          .order('sr_no', { ascending: true });
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'fetching material indent slip items');
          continue;
        }

        result.push({ slip, items: items || [] });
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to fetch completed material indent slips:', error);
      throw error;
    }
  }
};
