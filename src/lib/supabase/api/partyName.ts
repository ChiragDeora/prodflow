import { getSupabase, handleSupabaseError } from '../utils';
import type { PartyName } from '../types';
export const partyNameAPI = {
  // Get all party names
  async getAll(): Promise<PartyName[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('party_name_master')
        .select('*')
        .order('name');
      
      if (error) {
        handleSupabaseError(error, 'fetching party names');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch party names:', error);
      throw error;
    }
  },

  // Get party name by ID
  async getById(id: string): Promise<PartyName | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('party_name_master')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching party name');
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch party name:', error);
      return null;
    }
  },

  // Create new party name
  async create(partyName: Omit<PartyName, 'id' | 'created_at' | 'updated_at'>): Promise<PartyName | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('party_name_master')
        .insert([partyName])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating party name');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to create party name:', error);
      throw error;
    }
  },

  // Update party name
  async update(id: string, updates: Partial<PartyName>): Promise<PartyName | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('party_name_master')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating party name');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to update party name:', error);
      throw error;
    }
  },

  // Delete party name
  async delete(id: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('party_name_master')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting party name');
        throw error;
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to delete party name:', error);
      throw error;
    }
  }
};
