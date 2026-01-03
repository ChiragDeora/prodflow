import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';

const getSupabase = () => createClient();

// Returns users who have been granted DPR "production data" permission.
// Used by the Admin dashboard to drive the DPR column settings UI.
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access DPR users' },
        { status: 403 }
      );
    }

    // Find all permissions related to the Production → Daily Production Report (DPR) resource.
    // With the new scalable RBAC schema, these are named like:
    // "production.dpr.read", "production.dpr.create", "production.dpr.update", etc.
    const { data: dprPerms, error: permError } = await supabase
      .from('auth_permissions')
      .select('id, name')
      .like('name', 'production.dpr.%');

    if (permError) {
      console.error('DPR permissions not found:', permError);
      return NextResponse.json(
        { error: 'DPR permissions not found' },
        { status: 500 }
      );
    }

    const permissionIds = (dprPerms || []).map((p) => p.id as string);

    if (permissionIds.length === 0) {
      // No DPR permissions defined yet – nothing to configure
      return NextResponse.json({ users: [] });
    }

    const nowIso = new Date().toISOString();

    // Get user_ids that currently have this permission
    const { data: userPerms, error: userPermsError } = await supabase
      .from('auth_user_permissions')
      .select('user_id')
      .in('permission_id', permissionIds)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + nowIso);

    if (userPermsError) {
      console.error('Error fetching DPR user permissions:', userPermsError);
      return NextResponse.json(
        { error: 'Failed to fetch DPR users' },
        { status: 500 }
      );
    }

    const userIds = (userPerms || []).map((up) => up.user_id as string);

    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Load basic user info for those users (skip deactivated)
    const { data: users, error: usersError } = await supabase
      .from('auth_users')
      .select('id, full_name, email, status')
      .in('id', userIds)
      .neq('status', 'deactivated')
      .order('full_name', { ascending: true });

    if (usersError) {
      console.error('Error fetching DPR users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch DPR users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: (users || []).map((u) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        status: u.status,
      })),
    });
  } catch (error) {
    console.error('Admin DPR users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


