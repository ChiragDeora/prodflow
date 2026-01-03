import { getSupabase, handleSupabaseError } from '../utils';
import type { PackingMaterial } from '../types';
export const packingMaterialAPI = {
  // Get all packing materials
  async getAll(): Promise<PackingMaterial[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('packing_materials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get packing material by ID
  async getById(id: string): Promise<PackingMaterial | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('packing_materials')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new packing material
  async create(packingMaterial: Omit<PackingMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<PackingMaterial | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('packing_materials')
      .insert(packingMaterial)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update packing material
  async update(id: string, updates: Partial<PackingMaterial>): Promise<PackingMaterial | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('packing_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete packing material
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('packing_materials')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Bulk create packing materials from Excel
  async bulkCreate(packingMaterials: Omit<PackingMaterial, 'id' | 'created_at' | 'updated_at'>[]): Promise<PackingMaterial[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('packing_materials')
      .insert(packingMaterials)
      .select();
    
    if (error) {
      console.error('Error bulk creating packing materials:', error);
      throw error;
    }
    return data || [];
  }
};
