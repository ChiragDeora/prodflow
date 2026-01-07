import { getSupabase, handleSupabaseError } from '../utils';
import type { BOMMaster, BOMMasterWithVersions } from '../types';
export const bomMasterAPI = {
  // Get all BOM masters (default to SFG)
  async getAll(): Promise<BOMMasterWithVersions[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('sfg_bom_with_versions')
        .select('*')
        .order('sl_no', { ascending: true });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM masters');
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'BOM masters');
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM masters:', error);
      throw error;
    }
  },

  // Get BOM master by ID
  async getById(id: string): Promise<BOMMaster | null> {
    const supabase = getSupabase();
    try {
      // Search in all BOM tables
      let data = null;
      let error = null;
      
      // Try SFG first
      const sfgResult = await supabase
        .from('sfg_bom')
        .select('*')
        .eq('id', id)
        .single();
      
      if (sfgResult.data) {
        return sfgResult.data;
      }
      
      // Try FG
      const fgResult = await supabase
        .from('fg_bom')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fgResult.data) {
        return fgResult.data;
      }
      
      // Try LOCAL
      const localResult = await supabase
        .from('local_bom')
        .select('*')
        .eq('id', id)
        .single();
      
      if (localResult.data) {
        return localResult.data;
      }
      
      return null;
    } catch (error) {
      handleSupabaseError(error, 'fetching BOM master');
      return null;
    }
  },

  // Get BOM masters by category
  async getByCategory(category: 'SFG' | 'FG' | 'LOCAL'): Promise<BOMMasterWithVersions[]> {
    const supabase = getSupabase();
    try {
      let tableName: string;
      
      switch (category) {
        case 'SFG':
          tableName = 'sfg_bom_with_versions';
          break;
        case 'FG':
          tableName = 'fg_bom_with_versions';
          break;
        case 'LOCAL':
          tableName = 'local_bom_with_versions';
          break;
        default:
          tableName = 'sfg_bom_with_versions';
      }
      
      // Use a fresh query with no caching
      // Explicitly select all columns including item_name to ensure it's included
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .order('sl_no', { ascending: true });
      
      // Log for debugging - check if item_name is present
      if (data && data.length > 0) {
        const firstRecord = data[0];
        console.log(`🔍 Fetched ${category} BOM from ${tableName}:`, data.length, 'records');
        console.log(`🔍 First record keys:`, Object.keys(firstRecord));
        console.log(`🔍 First record item_name:`, firstRecord.item_name);
        console.log(`🔍 First record item_code:`, firstRecord.item_code);
      } else {
        console.log(`🔍 Fetched ${category} BOM from ${tableName}:`, 0, 'records');
      }
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM masters by category');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM masters by category:', error);
      throw error;
    }
  },

  // Create a new version of an SFG BOM
  async createVersion(sfgBomId: string, versionNumber: number, isActive: boolean = false, createdBy: string): Promise<string> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.rpc('create_sfg_bom_version', {
        p_sfg_bom_id: sfgBomId,
        p_version_number: versionNumber,
        p_is_active: isActive,
        p_created_by: createdBy
      });
      
      if (error) {
        handleSupabaseError(error, 'creating SFG BOM version');
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Failed to create SFG BOM version:', error);
      throw error;
    }
  },

  // Get version history for an SFG BOM
  async getVersionHistory(sfgBomId: string): Promise<any[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.rpc('get_sfg_bom_version_history', {
        p_sfg_bom_id: sfgBomId
      });
      
      if (error) {
        handleSupabaseError(error, 'fetching SFG BOM version history');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch SFG BOM version history:', error);
      throw error;
    }
  },

  // Get BOM masters by product code (searches all tables)
  async getByProductCode(productCode: string): Promise<BOMMasterWithVersions[]> {
    const supabase = getSupabase();
    try {
      // Search in SFG table
      const { data: sfgData, error: sfgError } = await supabase
        .from('sfg_bom')
        .select('*')
        .eq('item_code', productCode)
        .order('created_at', { ascending: false });
      
      if (sfgError) throw sfgError;
      
      // Search in FG table
      const { data: fgData, error: fgError } = await supabase
        .from('fg_bom')
        .select('*')
        .eq('item_code', productCode)
        .order('created_at', { ascending: false });
      
      if (fgError) throw fgError;
      
      // Search in LOCAL table
      const { data: localData, error: localError } = await supabase
        .from('local_bom')
        .select('*')
        .eq('item_code', productCode)
        .order('created_at', { ascending: false });
      
      if (localError) throw localError;
      
      // Combine results
      const combinedData = [
        ...(sfgData || []),
        ...(fgData || []),
        ...(localData || [])
      ];
      
      return combinedData;
    } catch (error) {
      console.error('❌ Failed to fetch BOM masters by product code:', error);
      throw error;
    }
  },

  // Create new BOM master
  async create(bomMaster: Omit<BOMMaster, 'id' | 'created_at' | 'updated_at'>): Promise<BOMMaster | null> {
    const supabase = getSupabase();
    try {
      // Determine the correct table based on the data structure
      let tableName: string;
      
      if (bomMaster.sfg_code) {
        // SFG BOM - has sfg_code field
        tableName = 'sfg_bom';
      } else if (bomMaster.party_name) {
        // FG BOM - has party_name field
        tableName = 'fg_bom';
      } else {
        // LOCAL BOM - has item_code but no party_name
        tableName = 'local_bom';
      }

      // Fix: Ensure quantity fields are properly converted to numbers for FG and LOCAL BOMs
      let processedBomMaster = { ...bomMaster };
      
      // Normalize item_name for SFG BOM: trim whitespace and ensure consistent format
      if (tableName === 'sfg_bom' && processedBomMaster.item_name) {
        processedBomMaster.item_name = processedBomMaster.item_name.trim();
        // Remove any leading/trailing spaces and normalize
        if (processedBomMaster.item_name === '') {
          processedBomMaster.item_name = undefined;
        }
      }
      
      console.log('🔍 Original BOM Master data:', bomMaster);
      console.log('🔍 Original qty_meter:', bomMaster.qty_meter, 'Type:', typeof bomMaster.qty_meter);
      console.log('🔍 Original qty_meter_2:', bomMaster.qty_meter_2, 'Type:', typeof bomMaster.qty_meter_2);
      
      if (tableName === 'fg_bom' || tableName === 'local_bom') {
        // Convert quantity fields to proper numbers with better precision handling
        const processQuantityField = (value: any): number | undefined => {
          if (value === '' || value === null || value === undefined) {
            return undefined;
          }
          // Use parseFloat for better decimal precision, then round to 4 decimal places
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            return undefined;
          }
          // Round to 4 decimal places to match database DECIMAL(10,4) precision
          return Math.round(parsed * 10000) / 10000;
        };
        
        if (processedBomMaster.sfg_1_qty !== undefined) {
          processedBomMaster.sfg_1_qty = processQuantityField(processedBomMaster.sfg_1_qty);
        }
        if (processedBomMaster.sfg_2_qty !== undefined) {
          processedBomMaster.sfg_2_qty = processQuantityField(processedBomMaster.sfg_2_qty);
        }
        if (processedBomMaster.cnt_qty !== undefined) {
          processedBomMaster.cnt_qty = processQuantityField(processedBomMaster.cnt_qty);
        }
        if (processedBomMaster.poly_qty !== undefined) {
          processedBomMaster.poly_qty = processQuantityField(processedBomMaster.poly_qty);
        }
        if (processedBomMaster.qty_meter !== undefined) {
          processedBomMaster.qty_meter = processQuantityField(processedBomMaster.qty_meter);
        }
        if (processedBomMaster.qty_meter_2 !== undefined) {
          processedBomMaster.qty_meter_2 = processQuantityField(processedBomMaster.qty_meter_2);
        }
        
        console.log('🔍 After precision conversion:');
        console.log('🔍 qty_meter:', processedBomMaster.qty_meter, 'Type:', typeof processedBomMaster.qty_meter);
        console.log('🔍 qty_meter_2:', processedBomMaster.qty_meter_2, 'Type:', typeof processedBomMaster.qty_meter_2);
      }
      
      console.log('🔍 Final processed BOM Master before database insert:', processedBomMaster);
      console.log('🔍 Final qty_meter before insert:', processedBomMaster.qty_meter, 'Type:', typeof processedBomMaster.qty_meter);
      console.log('🔍 Final qty_meter_2 before insert:', processedBomMaster.qty_meter_2, 'Type:', typeof processedBomMaster.qty_meter_2);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([processedBomMaster])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating BOM master');
        throw error;
      }
      
      console.log('✅ Successfully created BOM master in', tableName, ':', data?.id);
      console.log('🔍 Quantity values stored:', {
        qty_meter: data?.qty_meter,
        qty_meter_2: data?.qty_meter_2,
        sfg_1_qty: data?.sfg_1_qty,
        sfg_2_qty: data?.sfg_2_qty
      });
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating BOM master');
      throw error;
    }
  },

  // Create new BOM lineage
  async createNewLineage(
    productCode: string,
    productName: string,
    category: 'SFG' | 'FG' | 'LOCAL',
    description: string,
    createdBy: string
  ): Promise<BOMMaster | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .rpc('create_new_bom_lineage', {
          p_product_code: productCode,
          p_product_name: productName,
          p_category: category,
          p_description: description,
          p_created_by: createdBy
        });
      
      if (error) {
        handleSupabaseError(error, 'creating new BOM lineage');
        throw error;
      }
      
      // Fetch the created BOM master
      return await this.getById(data);
    } catch (error) {
      handleSupabaseError(error, 'creating new BOM lineage');
      throw error;
    }
  },

  // Update BOM master
  async update(id: string, updates: Partial<BOMMaster>): Promise<BOMMaster | null> {
    const supabase = getSupabase();
    try {
      // First, find which table contains this BOM master
      let tableName: string;
      
      // Try SFG first - use maybeSingle() to avoid 406 errors when not found
      const sfgResult = await supabase
        .from('sfg_bom')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      
      if (sfgResult.data && !sfgResult.error) {
        tableName = 'sfg_bom';
      } else {
        // Try FG
        const fgResult = await supabase
          .from('fg_bom')
          .select('id')
          .eq('id', id)
          .maybeSingle();
        
        if (fgResult.data && !fgResult.error) {
          tableName = 'fg_bom';
        } else {
          // Try LOCAL
          const localResult = await supabase
            .from('local_bom')
            .select('id')
            .eq('id', id)
            .maybeSingle();
          
          if (localResult.data && !localResult.error) {
            tableName = 'local_bom';
          } else {
            throw new Error('BOM master not found in any table');
          }
        }
      }

      // Fix: Process quantity fields to prevent rounding issues during updates
      let processedUpdates = { ...updates };
      
      if (tableName === 'fg_bom' || tableName === 'local_bom') {
        // Convert quantity fields to proper numbers with better precision handling
        const processQuantityField = (value: any): number | undefined => {
          if (value === '' || value === null || value === undefined) {
            return undefined;
          }
          // Use parseFloat for better decimal precision, then round to 4 decimal places
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            return undefined;
          }
          // Round to 4 decimal places to match database DECIMAL(10,4) precision
          return Math.round(parsed * 10000) / 10000;
        };
        
        if (processedUpdates.sfg_1_qty !== undefined) {
          processedUpdates.sfg_1_qty = processQuantityField(processedUpdates.sfg_1_qty);
        }
        if (processedUpdates.sfg_2_qty !== undefined) {
          processedUpdates.sfg_2_qty = processQuantityField(processedUpdates.sfg_2_qty);
        }
        if (processedUpdates.cnt_qty !== undefined) {
          processedUpdates.cnt_qty = processQuantityField(processedUpdates.cnt_qty);
        }
        if (processedUpdates.poly_qty !== undefined) {
          processedUpdates.poly_qty = processQuantityField(processedUpdates.poly_qty);
        }
        if (processedUpdates.qty_meter !== undefined) {
          processedUpdates.qty_meter = processQuantityField(processedUpdates.qty_meter);
        }
        if (processedUpdates.qty_meter_2 !== undefined) {
          processedUpdates.qty_meter_2 = processQuantityField(processedUpdates.qty_meter_2);
        }
        
        console.log('🔍 Update: Processed quantity fields:', {
          qty_meter: processedUpdates.qty_meter,
          qty_meter_2: processedUpdates.qty_meter_2,
          sfg_1_qty: processedUpdates.sfg_1_qty,
          sfg_2_qty: processedUpdates.sfg_2_qty,
          cnt_qty: processedUpdates.cnt_qty,
          poly_qty: processedUpdates.poly_qty
        });
      }
      
      console.log(`🔍 Updating ${tableName} with id="${id}"`);
      console.log('🔍 Update payload:', processedUpdates);
      console.log('🔍 item_name in update:', processedUpdates.item_name);
      
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...processedUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Update error:', error);
        handleSupabaseError(error, 'updating BOM master');
        throw error;
      }
      
      console.log('✅ Successfully updated BOM master in', tableName, ':', data?.id);
      console.log('🔍 Updated item_name:', data?.item_name);
      console.log('🔍 Updated quantity values:', {
        qty_meter: data?.qty_meter,
        qty_meter_2: data?.qty_meter_2,
        sfg_1_qty: data?.sfg_1_qty,
        sfg_2_qty: data?.sfg_2_qty,
        cnt_qty: data?.cnt_qty,
        poly_qty: data?.poly_qty
      });
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating BOM master');
      throw error;
    }
  },

  // Archive BOM master
  async archive(id: string, archivedBy: string): Promise<BOMMaster | null> {
    return this.update(id, { status: 'archived', created_by: archivedBy });
  },

  // Release BOM master
  async release(id: string, releasedBy: string): Promise<BOMMaster | null> {
    return this.update(id, { status: 'released', created_by: releasedBy });
  }
};
