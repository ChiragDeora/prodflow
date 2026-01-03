import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';

const getSupabase = () => createClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access permission audit' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for permission history
    let historyQuery = supabase
      .from('auth_user_permission_history')
      .select(`
        id,
        action,
        reason,
        previous_value,
        new_value,
        created_at,
        user:auth_users(id, full_name, email, department),
        permission:auth_permissions(
          id,
          name,
          description,
          action,
          resource:auth_resources(name)
        ),
        granted_by_user:granted_by(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (userId) {
      historyQuery = historyQuery.eq('user_id', userId);
    }
    if (action) {
      historyQuery = historyQuery.eq('action', action);
    }
    if (startDate) {
      historyQuery = historyQuery.gte('created_at', startDate);
    }
    if (endDate) {
      historyQuery = historyQuery.lte('created_at', endDate);
    }

    const { data: permissionHistory, error: historyError } = await historyQuery;

    if (historyError) {
      console.error('Error fetching permission history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch permission audit history' },
        { status: 500 }
      );
    }

    // Get general audit logs for permission-related actions
    let auditQuery = supabase
      .from('auth_audit_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        details,
        outcome,
        ip_address,
        user_agent,
        is_super_admin_override,
        created_at,
        user:auth_users(id, full_name, email)
      `)
      .in('action', [
        'grant_user_permissions',
        'revoke_user_permissions',
        'create_permission',
        'view_user_permissions',
        'create_permission_template'
      ])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply same filters to audit logs
    if (userId) {
      auditQuery = auditQuery.eq('user_id', userId);
    }
    if (startDate) {
      auditQuery = auditQuery.gte('created_at', startDate);
    }
    if (endDate) {
      auditQuery = auditQuery.lte('created_at', endDate);
    }

    const { data: auditLogs, error: auditError } = await auditQuery;

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summaryStats, error: statsError } = await supabase
      .rpc('get_permission_audit_stats', {
        start_date_param: startDate,
        end_date_param: endDate,
        user_id_param: userId
      });

    if (statsError) {
      console.error('Error fetching audit stats:', statsError);
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'view_permission_audit',
      resource_type: 'auth_user_permission_history',
      details: { 
        filters: { userId, action, startDate, endDate },
        history_records: permissionHistory?.length || 0,
        audit_records: auditLogs?.length || 0
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      permission_history: permissionHistory || [],
      audit_logs: auditLogs || [],
      summary_stats: summaryStats || {},
      pagination: {
        limit,
        offset,
        has_more: (permissionHistory?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('Permission audit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
