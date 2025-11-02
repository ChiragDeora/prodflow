import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value ||
                        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token provided' },
        { status: 401 }
      );
    }

    // Get user from session
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select(`
        user_id,
        expires_at,
        last_activity
      `)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Get user details separately
    const { data: user, error: userError } = await supabase
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
        temporary_password,
        last_login,
        created_at
      `)
      .eq('id', session.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Deactivate expired session
      await supabase
        .from('auth_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);

      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 403 }
      );
    }

    // Update session activity
    await supabase
      .from('auth_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('session_token', sessionToken);

    // Check if password reset is required
    const requiresPasswordReset = user.password_reset_required || 
      (user.temporary_password && user.temporary_password.length > 0);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        status: user.status,
        isRootAdmin: user.is_root_admin,
        requiresPasswordReset
      },
      session: {
        expiresAt: session.expires_at,
        lastActivity: session.last_activity
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
