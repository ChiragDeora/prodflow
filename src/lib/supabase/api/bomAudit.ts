import { getSupabase, handleSupabaseError } from '../utils';
import type { BOMAudit } from '../types';
export const bomAuditAPI = {
  // Get audit trail for a record
  async getAuditTrail(tableName: string, recordId: string): Promise<BOMAudit[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_audit_trial')
        .select('*')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('changed_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM audit trail');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM audit trail:', error);
      throw error;
    }
  },

  // Get audit trail by user
  async getAuditTrailByUser(changedBy: string): Promise<BOMAudit[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_audit_trial')
        .select('*')
        .eq('changed_by', changedBy)
        .order('changed_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, 'fetching BOM audit trail by user');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM audit trail by user:', error);
      throw error;
    }
  },

  // Get recent audit activities
  async getRecentActivities(limit: number = 50): Promise<BOMAudit[]> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_audit_trial')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        handleSupabaseError(error, 'fetching recent BOM audit activities');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch recent BOM audit activities:', error);
      throw error;
    }
  }
};
