import { getSupabase, handleSupabaseError } from '../utils';
import type { BOMVersion, BOMVersionWithComponents, BOMComponent } from '../types';

/**
 * BOM Version API
 * 
 * Note: The BOM system uses sfg_bom, fg_bom, and local_bom tables for main data.
 * Version tracking is done through sfg_bom_versions, fg_bom_versions, and local_bom_versions tables.
 * These version tables store row-level snapshots of BOM data.
 */
export const bomVersionAPI = {
  // Helper to determine which BOM table a record belongs to
  async _getBOMTableType(bomId: string): Promise<'sfg' | 'fg' | 'local' | null> {
    const supabase = getSupabase();
    
    // Try SFG first
    const sfgResult = await supabase
      .from('sfg_bom')
      .select('id')
      .eq('id', bomId)
      .maybeSingle();
    
    if (sfgResult.data) return 'sfg';
    
    // Try FG
    const fgResult = await supabase
      .from('fg_bom')
      .select('id')
      .eq('id', bomId)
      .maybeSingle();
    
    if (fgResult.data) return 'fg';
    
    // Try LOCAL
    const localResult = await supabase
      .from('local_bom')
      .select('id')
      .eq('id', bomId)
      .maybeSingle();
    
    if (localResult.data) return 'local';
    
    return null;
  },

  // Get all BOM versions (returns empty as versions are stored differently)
  async getAll(): Promise<BOMVersionWithComponents[]> {
    // Version data is distributed across sfg_bom_versions, fg_bom_versions, local_bom_versions
    // These tables have a different structure (row-per-component) than expected
    console.log('ℹ️ BOM versions are stored in separate version tables with row-level structure');
    return [];
  },

  // Get BOM version by ID
  async getById(id: string): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      // Try each version table
      const tables = ['sfg_bom_versions', 'fg_bom_versions', 'local_bom_versions'];
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (data && !error) {
          // Transform row-based data to expected format
          return {
            id: data.id,
            bom_master_id: data.sfg_bom_id || data.fg_bom_id || data.local_bom_id,
            version_number: data.version_number,
            is_active: data.status === 'released',
            components: [], // Row-based versions don't have JSONB components
            total_components: 0,
            total_cost: 0,
            notes: '',
            change_reason: '',
            created_by: data.created_by || 'system',
            created_at: data.created_at,
            updated_at: data.created_at
          };
        }
      }
      
      return null;
    } catch (error) {
      handleSupabaseError(error, 'fetching BOM version');
      return null;
    }
  },

  // Get versions by BOM master ID
  async getByBOMMasterId(bomMasterId: string): Promise<BOMVersion[]> {
    const supabase = getSupabase();
    try {
      // First, determine which table type this BOM belongs to
      const tableType = await this._getBOMTableType(bomMasterId);
      
      if (!tableType) {
        console.log('ℹ️ BOM not found in any table:', bomMasterId);
        return [];
      }
      
      // Map table type to version table and foreign key
      const versionTableMap = {
        'sfg': { table: 'sfg_bom_versions', fk: 'sfg_bom_id' },
        'fg': { table: 'fg_bom_versions', fk: 'fg_bom_id' },
        'local': { table: 'local_bom_versions', fk: 'local_bom_id' }
      };
      
      const { table, fk } = versionTableMap[tableType];
      
      // Query the correct version table
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(fk, bomMasterId)
        .order('version_number', { ascending: true });
      
      if (error) {
        // Table might not exist or be empty - that's okay
        console.log(`ℹ️ No versions found in ${table} for BOM ${bomMasterId}`);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Group rows by version_number to create version objects
      const versionMap = new Map<number, BOMVersion>();
      
      for (const row of data) {
        const versionNum = row.version_number;
        
        if (!versionMap.has(versionNum)) {
          versionMap.set(versionNum, {
            id: row.id,
            bom_master_id: bomMasterId,
            version_number: versionNum,
            is_active: row.status === 'released',
            components: [],
            total_components: 0,
            total_cost: 0,
            notes: row.notes || '',
            change_reason: row.change_reason || '',
            created_by: row.created_by || 'system',
            created_at: row.created_at,
            updated_at: row.created_at
          });
        }
        
        // Add component data from this row
        const version = versionMap.get(versionNum)!;
        version.components.push({
          id: row.id,
          bom_version_id: row.id,
          component_code: row.item_code || row.sfg_code || '',
          component_name: row.item_name || '',
          component_type: 'raw_material',
          quantity: row.pcs || 0,
          unit_of_measure: 'pcs',
          unit_cost: 0,
          total_cost: 0,
          is_critical: false
        });
        version.total_components = version.components.length;
      }
      
      return Array.from(versionMap.values());
    } catch (error) {
      console.error('❌ Failed to fetch BOM versions by master ID:', error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  },

  // Get active version by BOM master ID
  async getActiveByBOMMasterId(bomMasterId: string): Promise<BOMVersion | null> {
    try {
      const versions = await this.getByBOMMasterId(bomMasterId);
      return versions.find(v => v.is_active) || null;
    } catch (error) {
      handleSupabaseError(error, 'fetching active BOM version');
      return null;
    }
  },

  // Create new BOM version
  async create(bomVersion: Omit<BOMVersion, 'id' | 'created_at' | 'updated_at'>): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      const tableType = await this._getBOMTableType(bomVersion.bom_master_id);
      
      if (!tableType) {
        throw new Error('BOM not found');
      }
      
      const versionTableMap = {
        'sfg': { table: 'sfg_bom_versions', fk: 'sfg_bom_id' },
        'fg': { table: 'fg_bom_versions', fk: 'fg_bom_id' },
        'local': { table: 'local_bom_versions', fk: 'local_bom_id' }
      };
      
      const { table, fk } = versionTableMap[tableType];
      
      // Get the current BOM data to copy
      const bomTableMap = { 'sfg': 'sfg_bom', 'fg': 'fg_bom', 'local': 'local_bom' };
      const { data: bomData, error: bomError } = await supabase
        .from(bomTableMap[tableType])
        .select('*')
        .eq('id', bomVersion.bom_master_id)
        .single();
      
      if (bomError || !bomData) {
        throw new Error('Failed to fetch BOM data for versioning');
      }
      
      // Create version record (copy BOM data with version number)
      const versionData = {
        ...bomData,
        id: undefined, // Let DB generate new ID
        [fk]: bomVersion.bom_master_id,
        version_number: bomVersion.version_number,
        status: bomVersion.is_active ? 'released' : 'draft',
        created_by: bomVersion.created_by,
        created_at: new Date().toISOString()
      };
      
      delete versionData.id;
      delete versionData.updated_at;
      
      const { data, error } = await supabase
        .from(table)
        .insert([versionData])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating BOM version');
        throw error;
      }
      
      console.log('✅ Successfully created BOM version:', data?.id);
      return {
        id: data.id,
        bom_master_id: bomVersion.bom_master_id,
        version_number: bomVersion.version_number,
        is_active: bomVersion.is_active,
        components: bomVersion.components || [],
        total_components: bomVersion.total_components || 0,
        total_cost: bomVersion.total_cost || 0,
        notes: bomVersion.notes || '',
        change_reason: bomVersion.change_reason || '',
        created_by: bomVersion.created_by,
        created_at: data.created_at,
        updated_at: data.created_at
      };
    } catch (error) {
      handleSupabaseError(error, 'creating BOM version');
      throw error;
    }
  },

  // Create new version for existing BOM
  async createNewVersion(
    bomMasterId: string,
    components: BOMComponent[],
    notes: string,
    changeReason: string,
    createdBy: string
  ): Promise<BOMVersion | null> {
    try {
      // Get existing versions to determine next version number
      const existingVersions = await this.getByBOMMasterId(bomMasterId);
      const nextVersion = existingVersions.length > 0 
        ? Math.max(...existingVersions.map(v => v.version_number)) + 1 
        : 1;

      // Calculate total cost
      const totalCost = components.reduce((sum, comp) => sum + (comp.total_cost || 0), 0);

      // Create new version
      const newVersion: Omit<BOMVersion, 'id' | 'created_at' | 'updated_at'> = {
        bom_master_id: bomMasterId,
        version_number: nextVersion,
        is_active: true,
        components,
        total_components: components.length,
        total_cost: totalCost,
        notes,
        change_reason: changeReason,
        created_by: createdBy
      };

      return await this.create(newVersion);
    } catch (error) {
      handleSupabaseError(error, 'creating new BOM version');
      throw error;
    }
  },

  // Update BOM version
  async update(id: string, updates: Partial<BOMVersion>): Promise<BOMVersion | null> {
    const supabase = getSupabase();
    try {
      // Try each version table to find and update
      const tables = ['sfg_bom_versions', 'fg_bom_versions', 'local_bom_versions'];
      
      for (const table of tables) {
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('id', id)
          .maybeSingle();
        
        if (existing) {
          const { data, error } = await supabase
            .from(table)
            .update({ 
              status: updates.is_active ? 'released' : 'draft',
              // Note: Most fields cannot be updated due to row-based structure
            })
            .eq('id', id)
            .select()
            .single();
          
          if (error) {
            handleSupabaseError(error, 'updating BOM version');
            throw error;
          }
          
          console.log('✅ Successfully updated BOM version:', data?.id);
          return await this.getById(id);
        }
      }
      
      throw new Error('Version not found');
    } catch (error) {
      handleSupabaseError(error, 'updating BOM version');
      throw error;
    }
  },

  // Activate version
  async activate(id: string, activatedBy: string): Promise<BOMVersion | null> {
    try {
      // Get the version first
      const version = await this.getById(id);
      if (!version) {
        throw new Error('Version not found');
      }

      // Activate this version
      return await this.update(id, { is_active: true, created_by: activatedBy });
    } catch (error) {
      handleSupabaseError(error, 'activating BOM version');
      throw error;
    }
  }
};
