import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcrypt';

const getSupabase = () => createClient();

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if Yogesh already has a real password (not placeholder)
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('password_hash')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Root admin account not found. Run the migration first.' },
        { status: 404 }
      );
    }

    // Check if already set up (not placeholder)
    if (existingUser.password_hash && !existingUser.password_hash.includes('placeholder')) {
      return NextResponse.json(
        { error: 'Root admin password already set up' },
        { status: 409 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update Yogesh's password
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_hash: passwordHash,
        password_reset_required: false,
        temporary_password: null,
        last_password_change: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (updateError) {
      console.error('Error updating root admin password:', updateError);
      return NextResponse.json(
        { error: 'Failed to set password' },
        { status: 500 }
      );
    }

    // Log the setup completion
    await supabase.from('auth_audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000001',
      action: 'root_admin_password_setup',
      resource_type: 'auth_users',
      resource_id: '00000000-0000-0000-0000-000000000001',
      details: {
        message: 'Root admin password set up successfully',
        setup_completed: true
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      message: 'Root admin password set successfully! You can now log in.',
      success: true
    });

  } catch (error) {
    console.error('Root admin setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check if setup is needed
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: user } = await supabase
      .from('auth_users')
      .select('password_hash, username, email')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (!user) {
      return NextResponse.json({
        needsSetup: true,
        message: 'Root admin account not found. Run the migration first.'
      });
    }

    const needsSetup = !user.password_hash || user.password_hash.includes('placeholder');

    return NextResponse.json({
      needsSetup,
      username: user.username,
      email: user.email,
      message: needsSetup 
        ? 'Root admin password needs to be set up'
        : 'Root admin is already configured'
    });

  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json({
      needsSetup: true,
      message: 'Error checking setup status'
    });
  }
}
