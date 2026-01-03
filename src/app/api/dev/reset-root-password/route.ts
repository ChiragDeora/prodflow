import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcrypt';

const getSupabase = () => createClient();

// DEVELOPMENT ONLY - This endpoint should be removed in production
export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const supabase = getSupabase();
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

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update Yogesh's password
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_hash: passwordHash,
        password_reset_required: false,
        temporary_password: null,
        failed_login_attempts: 0,
        account_locked_until: null,
        last_password_change: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (updateError) {
      console.error('Error updating root admin password:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      );
    }

    // Clear any existing sessions for security
    await supabase
      .from('auth_sessions')
      .update({ is_active: false })
      .eq('user_id', '00000000-0000-0000-0000-000000000001');

    // Log the password reset
    await supabase.from('auth_audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000001',
      action: 'dev_password_reset',
      resource_type: 'auth_users',
      resource_id: '00000000-0000-0000-0000-000000000001',
      details: {
        message: 'Root admin password reset via development endpoint',
        environment: 'development'
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      message: `Root admin password reset successfully! New password: ${newPassword}`,
      success: true,
      username: 'yogesh'
    });

  } catch (error) {
    console.error('Dev password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
