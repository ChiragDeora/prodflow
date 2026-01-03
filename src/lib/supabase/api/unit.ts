import { getSupabase, handleSupabaseError } from '../utils';
import type { Unit } from '../types';
export const unitAPI = {
  // Get all units
  async getAll(): Promise<Unit[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get unit by ID
  async getById(id: string): Promise<Unit | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new unit
  async create(unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>): Promise<Unit | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update unit
  async update(id: string, updates: Partial<Unit>): Promise<Unit | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete unit
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
