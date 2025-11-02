import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value ||
                        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Get session details for logging
    const { data: session } = await supabase
      .from('auth_sessions')
      .select('user_id, auth_users(username)')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    // Deactivate session
    await supabase
      .from('auth_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('session_token', sessionToken);

    // Log logout
    if (session) {
      await supabase.from('auth_audit_logs').insert({
        user_id: session.user_id,
        action: 'logout',
        resource_type: 'auth_sessions',
        details: { session_token: sessionToken },
        outcome: 'success',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null
      });
    }

    // Create response and clear cookie
    const response = NextResponse.json({
      message: 'Logged out successfully'
    });

    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
