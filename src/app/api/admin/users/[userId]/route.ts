import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';

const getSupabase = () => createClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access user details' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // Get user details
    const { data: user, error } = await supabase
      .from('auth_users')
      .select(`
        id,
        username,
        email,
        full_name,
        phone,
        status,
        department,
        job_title,
        is_root_admin,
        password_reset_required,
        last_login,
        failed_login_attempts,
        account_locked_until,
        created_at,
        updated_at,
        access_scope
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        status: user.status,
        department: user.department,
        jobTitle: user.job_title,
        isRootAdmin: user.is_root_admin,
        requiresPasswordReset: user.password_reset_required,
        lastLogin: user.last_login,
        failedLoginAttempts: user.failed_login_attempts,
        isLocked: user.account_locked_until && new Date(user.account_locked_until) > new Date(),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        accessScope: user.is_root_admin ? 'UNIVERSAL' : (user.access_scope || 'FACTORY_ONLY')
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can update users' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();

    // Get current user to check if they're root admin
    const { data: currentUser, error: userError } = await supabase
      .from('auth_users')
      .select('id, username, email, full_name, status, is_root_admin, access_scope')
      .eq('id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent modifying root admin status (except for the root admin themselves)
    if (body.isRootAdmin !== undefined && body.isRootAdmin !== currentUser.is_root_admin) {
      return NextResponse.json(
        { error: 'Cannot modify root admin status' },
        { status: 403 }
      );
    }

    // Build update object - only allow updating specific fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.fullName !== undefined) {
      updateData.full_name = body.fullName || null;
    }
    if (body.email !== undefined && body.email) {
      updateData.email = body.email;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone || null;
    }
    if (body.status !== undefined && body.status) {
      updateData.status = body.status;
    }
    if (body.department !== undefined) {
      // Convert empty string to null for enum field
      updateData.department = body.department || null;
    }
    if (body.jobTitle !== undefined) {
      updateData.job_title = body.jobTitle || null;
    }
    if (body.accessScope !== undefined) {
      // Root admin must always be UNIVERSAL - enforce this rule
      if (currentUser.is_root_admin) {
        updateData.access_scope = 'UNIVERSAL';
      } else {
        // Validate access_scope value
        if (!['FACTORY_ONLY', 'UNIVERSAL'].includes(body.accessScope)) {
          return NextResponse.json(
            { error: 'Invalid access_scope value. Must be FACTORY_ONLY or UNIVERSAL.' },
            { status: 400 }
          );
        }
        updateData.access_scope = body.accessScope;
      }
    }

    // If status is being changed to "deactivated" (our logical delete),
    // anonymize the user's identity while keeping the record for audit logs
    if (body.status === 'deactivated' && currentUser.status !== 'deactivated') {
      const now = Date.now();
      updateData.status = 'deactivated';
      updateData.username = `${currentUser.username}__deleted_${now}`;
      updateData.email = `deleted+${now}__${currentUser.email}`;
      updateData.full_name = `[DELETED] ${currentUser.full_name}`;
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('auth_users')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        username,
        email,
        full_name,
        phone,
        status,
        department,
        job_title,
        is_root_admin,
        password_reset_required,
        last_login,
        failed_login_attempts,
        account_locked_until,
        created_at,
        updated_at,
        access_scope
      `)
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user', details: updateError.message },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'update_user',
      resource_type: 'auth_users',
      resource_id: userId,
      details: {
        updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at'),
        target_user: {
          username: updatedUser.username,
          email: updatedUser.email,
          full_name: updatedUser.full_name
        }
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        phone: updatedUser.phone,
        status: updatedUser.status,
        department: updatedUser.department,
        jobTitle: updatedUser.job_title,
        isRootAdmin: updatedUser.is_root_admin,
        requiresPasswordReset: updatedUser.password_reset_required,
        lastLogin: updatedUser.last_login,
        failedLoginAttempts: updatedUser.failed_login_attempts,
        isLocked: updatedUser.account_locked_until && new Date(updatedUser.account_locked_until) > new Date(),
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
        accessScope: updatedUser.is_root_admin ? 'UNIVERSAL' : (updatedUser.access_scope || 'FACTORY_ONLY')
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

