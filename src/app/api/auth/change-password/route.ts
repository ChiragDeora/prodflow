import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession, hashPassword, verifyPassword, logAuditAction } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

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

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('password_hash, temporary_password, password_reset_required')
      .eq('id', sessionData.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If user has temporary password, verify it instead of current password
    if (user.temporary_password && user.temporary_password.length > 0) {
      if (currentPassword !== user.temporary_password) {
        await logAuditAction(
          sessionData.user.id,
          'change_password_failed',
          'auth_users',
          sessionData.user.id,
          { reason: 'invalid_temporary_password' },
          'failure',
          request
        );

        return NextResponse.json(
          { error: 'Invalid temporary password' },
          { status: 401 }
        );
      }
    } else {
      // Verify current password
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        await logAuditAction(
          sessionData.user.id,
          'change_password_failed',
          'auth_users',
          sessionData.user.id,
          { reason: 'invalid_current_password' },
          'failure',
          request
        );

        return NextResponse.json(
          { error: 'Invalid current password' },
          { status: 401 }
        );
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_hash: newPasswordHash,
        temporary_password: null, // Clear temporary password
        password_reset_required: false,
        last_password_change: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionData.user.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark any existing password reset records as used
    await supabase
      .from('auth_password_resets')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('user_id', sessionData.user.id)
      .eq('is_used', false);

    // Log successful password change
    await logAuditAction(
      sessionData.user.id,
      'change_password_success',
      'auth_users',
      sessionData.user.id,
      { password_changed: true },
      'success',
      request
    );

    return NextResponse.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
