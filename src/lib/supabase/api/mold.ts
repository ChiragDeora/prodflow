import { getSupabase, handleSupabaseError } from '../utils';
import type { Mold } from '../types';
export const moldAPI = {
  // Get all molds
  async getAll(): Promise<Mold[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('molds')
      .select('*')
      .order('sr_no', { ascending: true });
    
    if (error) {
      console.error('Error fetching molds:', error);
      throw error;
    }
    
    // Debug: Log first mold to check column names
    if (data && data.length > 0) {
      const firstMold = data[0];
      console.log('🔍 moldAPI.getAll() - First mold columns:', {
        has_int_wt: 'int_wt' in firstMold,
        has_rp_bill_wt: 'rp_bill_wt' in firstMold,
        has_std_wt: 'std_wt' in firstMold,
        has_rp_wt: 'rp_wt' in firstMold,
        int_wt_value: firstMold.int_wt,
        rp_bill_wt_value: firstMold.rp_bill_wt,
        allKeys: Object.keys(firstMold).filter(k => k.includes('wt') || k.includes('weight'))
      });
    }
    
    // Sort the data properly for alphanumeric sr_no values
    const sortedData = (data || []).sort((a, b) => {
      const srNoA = a.sr_no || '';
      const srNoB = b.sr_no || '';
      
      // Extract numeric part for proper sorting
      const extractNumber = (str: string) => {
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const numA = extractNumber(srNoA);
      const numB = extractNumber(srNoB);
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // If numbers are the same, sort alphabetically
      return srNoA.localeCompare(srNoB);
    });
    
    return sortedData;
  },

  // Get mold by ID
  async getById(moldId: string): Promise<Mold | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('molds')
      .select('*')
      .eq('mold_id', moldId)
      .single();
    
    if (error) {
      console.error('Error fetching mold:', error);
      return null;
    }
    return data;
  },

  // Create new mold
  async create(mold: Omit<Mold, 'created_at' | 'updated_at'>): Promise<Mold | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('molds')
      .insert([mold])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating mold:', error);
      throw error;
    }
    return data;
  },

  // Update mold
  async update(moldId: string, updates: Partial<Mold>): Promise<Mold | null> {
    const supabase = getSupabase();
    
    // Filter out null/undefined values for required fields to preserve existing values
    // Required fields: mold_name, maker, cavities, purchase_date, compatible_machines
    const filteredUpdates: Record<string, any> = {};
    const requiredFields = ['mold_name', 'maker', 'cavities', 'purchase_date', 'compatible_machines'] as const;
    
    Object.entries(updates).forEach(([key, value]) => {
      // Skip null/undefined values for required fields
      if (requiredFields.includes(key as typeof requiredFields[number])) {
        if (value !== null && value !== undefined) {
          filteredUpdates[key] = value;
        }
      } else {
        // For optional fields, include them even if null/undefined (to allow clearing optional fields)
        filteredUpdates[key] = value;
      }
    });
    
    // If mold_name is being updated, get the old name first for previous_mold_name updates
    let oldMoldName: string | undefined;
    if (filteredUpdates.mold_name) {
      const { data: currentMold } = await supabase
        .from('molds')
        .select('mold_name')
        .eq('mold_id', moldId)
        .single();
      
      oldMoldName = currentMold?.mold_name;
    }
    
    // Update the mold
    // Note: Foreign key constraints with ON UPDATE CASCADE will automatically
    // update mold_name in daily_weight_report and first_pieces_approval_report tables
    const { data, error } = await supabase
      .from('molds')
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .eq('mold_id', moldId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating mold:', error);
      throw error;
    }
    
    // If mold_name was updated, also update previous_mold_name in daily_weight_report
    // (previous_mold_name is not a FK, so it needs manual update)
    if (oldMoldName && filteredUpdates.mold_name && oldMoldName !== filteredUpdates.mold_name) {
      try {
        // Update previous_mold_name where it matches the old mold_name
        await supabase
          .from('daily_weight_report')
          .update({ previous_mold_name: filteredUpdates.mold_name })
          .eq('previous_mold_name', oldMoldName);
      } catch (err) {
        // Silently ignore - this is optional and not critical
      }
    }
    
    return data;
  },

  // Delete mold
  async delete(moldId: string): Promise<boolean> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('molds')
      .delete()
      .eq('mold_id', moldId);
    
    if (error) {
      console.error('Error deleting mold:', error);
      throw error;
    }
    return true;
  },

  // Bulk create molds from Excel
  async bulkCreate(molds: Omit<Mold, 'created_at' | 'updated_at'>[]): Promise<Mold[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('molds')
      .insert(molds)
      .select();
    
    if (error) {
      console.error('Error bulk creating molds:', error);
      throw error;
    }
    return data || [];
  }
};
