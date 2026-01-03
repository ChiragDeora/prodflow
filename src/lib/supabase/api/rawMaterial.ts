import { getSupabase, handleSupabaseError } from '../utils';
import type { RawMaterial } from '../types';
export const rawMaterialAPI = {
  // Get all raw materials
  async getAll(): Promise<RawMaterial[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('sl_no');
      
      if (error) {
        console.error('Error fetching raw materials:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'fetching raw materials');
      return [];
    }
  },

  // Get raw material by ID
  async getById(id: string): Promise<RawMaterial | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching raw material:', error);
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching raw material');
      return null;
    }
  },

  // Get raw material by type (primary key)
  async getByType(type: string): Promise<RawMaterial | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('type', type)
        .single();
      
      if (error) {
        console.error('Error fetching raw material by type:', error);
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching raw material by type');
      return null;
    }
  },

  // Get raw material by type, grade, and supplier (composite key)
  async getByTypeGradeSupplier(type: string, grade: string, supplier: string): Promise<RawMaterial | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('type', type)
        .eq('grade', grade)
        .eq('supplier', supplier)
        .single();
      
      if (error) {
        console.error('Error fetching raw material by composite key:', error);
        return null;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'fetching raw material by composite key');
      return null;
    }
  },

  // Create new raw material
  async create(rawMaterial: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<RawMaterial | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert([rawMaterial])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating raw material:', error);
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'creating raw material');
      throw error;
    }
  },

  // Update raw material
  async update(id: string, updates: Partial<RawMaterial>): Promise<RawMaterial | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating raw material:', error);
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, 'updating raw material');
      throw error;
    }
  },

  // Delete raw material
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting raw material:', error);
        throw error;
      }
      return true;
    } catch (error) {
      handleSupabaseError(error, 'deleting raw material');
      throw error;
    }
  },

  // Bulk create raw materials from Excel
  async bulkCreate(rawMaterials: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>[]): Promise<RawMaterial[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert(rawMaterials)
        .select();
      
      if (error) {
        console.error('Error bulk creating raw materials:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'bulk creating raw materials');
      throw error;
    }
  }
};
