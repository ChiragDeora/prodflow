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
        { error: 'Only root admin can reject users' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const { reason } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details before deletion
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

    if (user.is_root_admin) {
      return NextResponse.json(
        { error: 'Cannot reject root admin user' },
        { status: 403 }
      );
    }

    // Log admin action before deletion
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'reject_user',
      resource_type: 'auth_users',
      resource_id: userId,
      details: {
        rejected_user: {
          username: user.username,
          email: user.email,
          full_name: user.full_name
        },
        reason: reason || 'No reason provided'
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    // Delete the user (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('auth_users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error rejecting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to reject user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User rejected and removed successfully'
    });

  } catch (error) {
    console.error('User rejection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
