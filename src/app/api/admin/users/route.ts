import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyRootAdmin } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access user management' },
        { status: 403 }
      );
    }

    // Get all users
    const { data: users, error } = await supabase
      .from('auth_users')
      .select(`
        id,
        username,
        email,
        full_name,
        phone,
        status,
        is_root_admin,
        password_reset_required,
        last_login,
        failed_login_attempts,
        account_locked_until,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'view_all_users',
      resource_type: 'auth_users',
      details: { total_users: users.length },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        status: user.status,
        isRootAdmin: user.is_root_admin,
        requiresPasswordReset: user.password_reset_required,
        lastLogin: user.last_login,
        failedLoginAttempts: user.failed_login_attempts,
        isLocked: user.account_locked_until && new Date(user.account_locked_until) > new Date(),
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }))
    });

  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
