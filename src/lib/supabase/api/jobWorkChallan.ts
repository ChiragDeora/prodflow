import { getSupabase, handleSupabaseError } from '../utils';
import type { JobWorkChallan, JobWorkChallanItem } from '../types';
export const jobWorkChallanAPI = {
  // Get all job work challans
  async getAll(): Promise<JobWorkChallan[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_job_work_challan')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching job work challans');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch job work challans:', error);
      throw error;
    }
  },

  // Get job work challan by ID with items
  async getById(id: string): Promise<{ challan: JobWorkChallan; items: JobWorkChallanItem[] } | null> {
    try {
      const supabase = getSupabase();
      const { data: challan, error: challanError } = await supabase
        .from('store_job_work_challan')
        .select('*')
        .eq('id', id)
        .single();
      
      if (challanError) {
        handleSupabaseError(challanError, 'fetching job work challan');
        return null;
      }

      const { data: items, error: itemsError } = await supabase
        .from('store_job_work_challan_items')
        .select('*')
        .eq('challan_id', id)
        .order('sr_no', { ascending: true });
      
      if (itemsError) {
        handleSupabaseError(itemsError, 'fetching job work challan items');
        return null;
      }

      return { challan, items: items || [] };
    } catch (error) {
      console.error('❌ Failed to fetch job work challan:', error);
      return null;
    }
  },

  // Create job work challan with items
  async create(challan: Omit<JobWorkChallan, 'id' | 'created_at' | 'updated_at'>, items: Omit<JobWorkChallanItem, 'id' | 'challan_id' | 'created_at' | 'sr_no'>[]): Promise<JobWorkChallan | null> {
    try {
      const supabase = getSupabase();
      const { data: newChallan, error: challanError } = await supabase
        .from('store_job_work_challan')
        .insert([challan])
        .select()
        .single();
      
      if (challanError) {
        handleSupabaseError(challanError, 'creating job work challan');
        throw challanError;
      }

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          challan_id: newChallan.id,
          sr_no: index + 1,
          item_code: item.item_code || null,
          item_name: item.item_name || null,
          material_description: item.material_description || item.item_name || '',
          qty: item.qty ? parseFloat(item.qty.toString()) : null,
          qty_pcs: item.qty_pcs ? parseFloat(item.qty_pcs.toString()) : null,
          uom: item.uom || null,
          remarks: item.remarks || null
        }));

        const { error: itemsError } = await supabase
          .from('store_job_work_challan_items')
          .insert(itemsToInsert);
        
        if (itemsError) {
          handleSupabaseError(itemsError, 'creating job work challan items');
          await supabase.from('store_job_work_challan').delete().eq('id', newChallan.id);
          throw itemsError;
        }
      }

      console.log('✅ Successfully created job work challan:', newChallan.id);
      return newChallan;
    } catch (error) {
      console.error('❌ Failed to create job work challan:', error);
      throw error;
    }
  },

  // Update job work challan
  async update(id: string, updates: Partial<JobWorkChallan>, items?: Omit<JobWorkChallanItem, 'id' | 'challan_id' | 'created_at' | 'sr_no'>[]): Promise<JobWorkChallan | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('store_job_work_challan')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating job work challan');
        throw error;
      }

      if (items !== undefined) {
        await supabase.from('store_job_work_challan_items').delete().eq('challan_id', id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            challan_id: id,
            sr_no: index + 1,
            item_code: item.item_code || null,
            item_name: item.item_name || null,
            material_description: item.material_description || item.item_name || '',
            qty: item.qty ? parseFloat(item.qty.toString()) : null,
            qty_pcs: item.qty_pcs ? parseFloat(item.qty_pcs.toString()) : null,
            uom: item.uom || null,
            remarks: item.remarks || null
          }));

          const { error: itemsError } = await supabase
            .from('store_job_work_challan_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            handleSupabaseError(itemsError, 'updating job work challan items');
            throw itemsError;
          }
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to update job work challan:', error);
      throw error;
    }
  },

  // Delete job work challan
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('store_job_work_challan')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting job work challan');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete job work challan:', error);
      throw error;
    }
  }
};
