import { getSupabase, handleSupabaseError } from '../utils';
import type { BOMAudit } from '../types';

export const bomAuditAPI = {
  // Create an audit entry
  async createAuditEntry(
    tableName: string,
    recordId: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RELEASE' | 'ARCHIVE',
    changedBy: string,
    oldValues?: any,
    newValues?: any,
    changeReason?: string
  ): Promise<BOMAudit | null> {
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase
        .from('bom_audit_trial')
        .insert({
          table_name: tableName,
          record_id: recordId,
          action: action,
          old_values: oldValues ? JSON.stringify(oldValues) : null,
          new_values: newValues ? JSON.stringify(newValues) : null,
          changed_by: changedBy,
          changed_at: new Date().toISOString(),
          change_reason: changeReason
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Failed to create BOM audit entry:', error);
        // Don't throw - audit failures shouldn't block the main operation
        return null;
      }
      
      console.log('✅ Created BOM audit entry:', data?.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to create BOM audit entry:', error);
      return null;
    }
  },

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
        // Table may not exist - return empty array instead of throwing
        console.log('ℹ️ BOM audit trail not available:', error.message);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM audit trail:', error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
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
        // Table may not exist - return empty array instead of throwing
        console.log('ℹ️ BOM audit trail by user not available:', error.message);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch BOM audit trail by user:', error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
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
        // Table may not exist - return empty array instead of throwing
        console.log('ℹ️ Recent BOM audit activities not available:', error.message);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch recent BOM audit activities:', error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }
};
