import { getSupabase, handleSupabaseError } from '../utils';
import type { VendorRegistration } from '../types';
export const vendorRegistrationAPI = {
  // Get all vendor registrations
  async getAll(): Promise<VendorRegistration[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching vendor registrations');
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch vendor registrations:', error);
      throw error;
    }
  },

  // Get vendor registration by ID
  async getById(id: string): Promise<VendorRegistration | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        handleSupabaseError(error, 'fetching vendor registration');
        return null;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch vendor registration:', error);
      return null;
    }
  },

  // Create vendor registration
  async create(vendor: Omit<VendorRegistration, 'id' | 'created_at' | 'updated_at'>): Promise<VendorRegistration | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .insert([vendor])
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating vendor registration');
        throw error;
      }
      console.log('✅ Successfully created vendor registration:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create vendor registration:', error);
      throw error;
    }
  },

  // Update vendor registration
  async update(id: string, updates: Partial<VendorRegistration>): Promise<VendorRegistration | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('purchase_vendor_registration')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating vendor registration');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to update vendor registration:', error);
      throw error;
    }
  },

  // Delete vendor registration
  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from('purchase_vendor_registration')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting vendor registration');
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete vendor registration:', error);
      throw error;
    }
  }
};
