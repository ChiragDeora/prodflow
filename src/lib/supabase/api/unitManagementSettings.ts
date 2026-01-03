import { getSupabase, handleSupabaseError } from '../utils';
import type { UnitManagementSetting } from '../types';
export const unitManagementSettingsAPI = {
  // Get all settings
  async getAll(): Promise<UnitManagementSetting[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('unit_management_settings')
      .select('*')
      .order('setting_key', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get setting by key
  async getByKey(key: string): Promise<UnitManagementSetting | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('unit_management_settings')
      .select('*')
      .eq('setting_key', key)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update setting
  async updateSetting(key: string, value: string): Promise<UnitManagementSetting | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('unit_management_settings')
      .update({ setting_value: value })
      .eq('setting_key', key)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Check if unit management is enabled
  async isUnitManagementEnabled(): Promise<boolean> {
    try {
      const setting = await this.getByKey('unit_management_enabled');
      return setting?.setting_value === 'true';
    } catch (error) {
      console.error('Error checking unit management setting:', error);
      return false;
    }
  },

  // Get default unit
  async getDefaultUnit(): Promise<string> {
    try {
      const setting = await this.getByKey('default_unit');
      return setting?.setting_value || 'Unit 1';
    } catch (error) {
      console.error('Error getting default unit:', error);
      return 'Unit 1';
    }
  }
};
