import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyRootAdmin, hashPassword } from '@/lib/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can change user passwords' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Password validation
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, username, email, full_name, is_root_admin')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_hash: newPasswordHash,
        temporary_password: null, // Clear temporary password if exists
        password_reset_required: false,
        last_password_change: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error changing password:', updateError);
      return NextResponse.json(
        { error: 'Failed to change password', details: updateError.message },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'change_user_password',
      resource_type: 'auth_users',
      resource_id: userId,
      details: {
        target_user: {
          username: user.username,
          email: user.email,
          full_name: user.full_name
        },
        changed_by: 'root_admin'
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      message: 'Password changed successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      }
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

