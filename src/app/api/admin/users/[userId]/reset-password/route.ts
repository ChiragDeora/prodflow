import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

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
        { error: 'Only root admin can reset passwords' },
        { status: 403 }
      );
    }

    const { userId } = await params;

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

    // Generate temporary password (8 characters: letters + numbers)
    const tempPassword = randomBytes(4).toString('hex').toUpperCase();
    const tempPasswordHash = await bcrypt.hash(tempPassword, 12);

    // Update user with temporary password
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        temporary_password: tempPassword,
        password_reset_required: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error setting temporary password:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      );
    }

    // Create password reset record
    const { error: resetError } = await supabase
      .from('auth_password_resets')
      .insert({
        user_id: userId,
        reset_by: adminUser.id,
        temporary_password_hash: tempPasswordHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString()
      });

    if (resetError) {
      console.error('Error creating password reset record:', resetError);
      // Continue even if this fails
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'reset_password',
      resource_type: 'auth_users',
      resource_id: userId,
      details: {
        target_user: {
          username: user.username,
          email: user.email,
          full_name: user.full_name
        }
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      message: 'Password reset successfully',
      temporaryPassword: tempPassword,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name
      }
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
