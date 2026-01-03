import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';

const getSupabase = () => createClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can approve users' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const { roleId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status !== 'pending') {
      return NextResponse.json(
        { error: 'User is not in pending status' },
        { status: 400 }
      );
    }

    // Ensure department and designation are set before approval
    if (!user.department || !user.job_title || String(user.job_title).trim() === '') {
      return NextResponse.json(
        { error: 'Please set this user\'s department and designation before approving.' },
        { status: 400 }
      );
    }

    // Ensure the user has at least one active permission or role before approval
    const { count: activePermissionCount, error: permissionCountError } = await supabase
      .from('auth_user_permissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (permissionCountError) {
      console.error('Error counting user permissions:', permissionCountError);
      return NextResponse.json(
        { error: 'Failed to validate user permissions before approval' },
        { status: 500 }
      );
    }

    const { count: activeRoleCount, error: roleCountError } = await supabase
      .from('auth_user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (roleCountError) {
      console.error('Error counting user roles:', roleCountError);
      return NextResponse.json(
        { error: 'Failed to validate user permissions before approval' },
        { status: 500 }
      );
    }

    if ((activePermissionCount || 0) + (activeRoleCount || 0) === 0) {
      return NextResponse.json(
        { error: 'Before approving this user, please grant at least one permission or role.' },
        { status: 400 }
      );
    }

    // Approve user
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error approving user:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve user' },
        { status: 500 }
      );
    }

    // Assign role if provided
    if (roleId) {
      const { error: roleError } = await supabase
        .from('auth_user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: adminUser.id,
          assigned_at: new Date().toISOString()
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        // Continue even if role assignment fails
      }
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'approve_user',
      resource_type: 'auth_users',
      resource_id: userId,
      details: {
        approved_user: {
          username: user.username,
          email: user.email,
          full_name: user.full_name
        },
        role_assigned: roleId
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      message: 'User approved successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('User approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
