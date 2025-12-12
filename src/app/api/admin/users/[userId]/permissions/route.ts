import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyRootAdmin } from '@/lib/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can view user permissions' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, full_name, email, department, job_title')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's direct permissions - simplified for your schema
    const { data: directPermissions, error: directError } = await supabase
      .from('auth_user_permissions')
      .select(`
        id,
        permission_id,
        granted_at,
        expires_at,
        is_active,
        granted_by
      `)
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (directError) {
      console.error('Error fetching direct permissions:', directError);
      return NextResponse.json(
        { error: 'Failed to fetch user permissions' },
        { status: 500 }
      );
    }

    // Get permission details separately
    let enrichedDirectPermissions = [];
    if (directPermissions && directPermissions.length > 0) {
      const permissionIds = directPermissions.map(dp => dp.permission_id);
      const { data: permissions } = await supabase
        .from('auth_permissions')
        .select('id, name, description, action, scope_level, resource_id')
        .in('id', permissionIds);

      const resourceIds = [...new Set(permissions?.map(p => p.resource_id).filter(Boolean) || [])];
      let resources = [];
      if (resourceIds.length > 0) {
        const { data: resourceData } = await supabase
          .from('auth_resources')
          .select('id, name, description, table_name, department')
          .in('id', resourceIds);
        resources = resourceData || [];
      }

      enrichedDirectPermissions = directPermissions.map(dp => ({
        ...dp,
        permission: {
          ...permissions?.find(p => p.id === dp.permission_id),
          resource: resources.find(r => r.id === permissions?.find(p => p.id === dp.permission_id)?.resource_id)
        }
      }));
    }

    // Get user's role-based permissions - simplified
    const { data: rolePermissions, error: roleError } = await supabase
      .from('auth_user_roles')
      .select('id, role_id, assigned_at, expires_at, is_active, assigned_by')
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (roleError) {
      console.error('Error fetching role permissions:', roleError);
      return NextResponse.json(
        { error: 'Failed to fetch user role permissions' },
        { status: 500 }
      );
    }

    // For now, skip detailed permissions function since it may not exist
    const detailedPermissions = [];

    // Organize permissions by module for easier display
    const permissionsByModule: Record<string, any[]> = {};
    
    if (enrichedDirectPermissions) {
      enrichedDirectPermissions.forEach((perm: any) => {
        const moduleName = perm.permission?.resource?.name || 'Global';
        if (!permissionsByModule[moduleName]) {
          permissionsByModule[moduleName] = [];
        }
        permissionsByModule[moduleName].push(perm);
      });
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'view_user_permissions',
      resource_type: 'auth_user_permissions',
      resource_id: userId,
      details: { 
        target_user: user.full_name,
        direct_permissions: enrichedDirectPermissions?.length || 0,
        role_permissions: rolePermissions?.length || 0
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      user,
      direct_permissions: enrichedDirectPermissions || [],
      role_permissions: rolePermissions || [],
      permissions_by_module: permissionsByModule,
      detailed_permissions: detailedPermissions || []
    });

  } catch (error) {
    console.error('Get user permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can modify user permissions' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { permissions, action = 'grant', reason } = body;

    // Validate input
    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
        { status: 400 }
      );
    }

    if (!['grant', 'revoke'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "grant" or "revoke"' },
        { status: 400 }
      );
    }

    // Verify user exists and is not root admin
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, full_name, email, is_root_admin')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.is_root_admin) {
      return NextResponse.json(
        { error: 'Cannot modify root admin permissions' },
        { status: 403 }
      );
    }

    // Verify all permission IDs exist
    const { data: validPermissions, error: permissionError } = await supabase
      .from('auth_permissions')
      .select('id, name, description')
      .in('id', permissions);

    if (permissionError || validPermissions.length !== permissions.length) {
      return NextResponse.json(
        { error: 'One or more permission IDs are invalid' },
        { status: 400 }
      );
    }

    let results = [];

    if (action === 'grant') {
      // Grant permissions
      const permissionsToInsert = permissions.map(permissionId => ({
        user_id: userId,
        permission_id: permissionId,
        granted_by: adminUser.id,
        granted_at: new Date().toISOString(),
        is_active: true
      }));

      const { data: grantedPermissions, error: grantError } = await supabase
        .from('auth_user_permissions')
        .upsert(permissionsToInsert, {
          onConflict: 'user_id,permission_id',
          ignoreDuplicates: false
        })
        .select();

      if (grantError) {
        console.error('Error granting permissions:', grantError);
        return NextResponse.json(
          { error: 'Failed to grant permissions' },
          { status: 500 }
        );
      }

      results = grantedPermissions;

      // Log permission grants in history
      const historyEntries = permissions.map(permissionId => ({
        user_id: userId,
        permission_id: permissionId,
        action: 'granted',
        granted_by: adminUser.id,
        reason: reason || 'Granted by admin'
      }));

      await supabase.from('auth_user_permission_history').insert(historyEntries);

    } else if (action === 'revoke') {
      // Revoke permissions
      const { data: revokedPermissions, error: revokeError } = await supabase
        .from('auth_user_permissions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .in('permission_id', permissions)
        .select();

      if (revokeError) {
        console.error('Error revoking permissions:', revokeError);
        return NextResponse.json(
          { error: 'Failed to revoke permissions' },
          { status: 500 }
        );
      }

      results = revokedPermissions;

      // Log permission revocations in history
      const historyEntries = permissions.map(permissionId => ({
        user_id: userId,
        permission_id: permissionId,
        action: 'revoked',
        granted_by: adminUser.id,
        reason: reason || 'Revoked by admin'
      }));

      await supabase.from('auth_user_permission_history').insert(historyEntries);
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: `${action}_user_permissions`,
      resource_type: 'auth_user_permissions',
      resource_id: userId,
      details: { 
        target_user: user.full_name,
        permission_count: permissions.length,
        permission_names: validPermissions.map(p => p.name),
        reason
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      message: `Permissions ${action}ed successfully`,
      affected_permissions: results?.length || 0,
      permissions: validPermissions
    });

  } catch (error) {
    console.error('Modify user permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
