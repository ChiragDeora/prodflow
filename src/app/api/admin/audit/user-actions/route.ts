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
        { error: 'Only root admin can view audit trail' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('target_user_id');
    const actionFilter = searchParams.get('action');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Actions related to user lifecycle + permission changes
    const trackedActions = [
      'approve_user',
      'reject_user',
      'update_user',
      'delete_user',
      'grant_user_permissions',
      'revoke_user_permissions',
      'reset_password',
      'change_user_password'
    ];

    let auditQuery = supabase
      .from('auth_audit_logs')
      .select(
        `
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
        actor:auth_users(id, full_name, email)
      `
      )
      // Only show actions performed by the current admin
      .eq('user_id', adminUser.id)
      .in('action', trackedActions)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetUserId) {
      auditQuery = auditQuery.eq('resource_id', targetUserId);
    }

    if (actionFilter && actionFilter !== 'all') {
      auditQuery = auditQuery.eq('action', actionFilter);
    }

    if (startDate) {
      auditQuery = auditQuery.gte('created_at', startDate);
    }

    if (endDate) {
      auditQuery = auditQuery.lte('created_at', endDate);
    }

    const { data: logs, error } = await auditQuery;

    if (error) {
      console.error('Error fetching user action audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit trail' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        limit,
        offset,
        has_more: (logs?.length || 0) === limit
      }
    });
  } catch (error) {
    console.error('User actions audit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


