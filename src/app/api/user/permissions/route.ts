import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifySession } from '@/lib/auth-utils';

const getSupabase = () => createClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const sessionData = await verifySession(request);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = sessionData.user.id;
    const isRootAdmin = sessionData.user.isRootAdmin;

    // Root admin has all permissions
    if (isRootAdmin) {
      // Fetch all available permissions to return for root admin
      const { data: allPermissions } = await supabase
        .from('auth_permissions')
        .select('name');

      const permissionsMap: Record<string, boolean> = {};
      allPermissions?.forEach(p => {
        permissionsMap[p.name] = true;
      });

      return NextResponse.json({
        permissions: permissionsMap,
        isRootAdmin: true
      });
    }

    // Get user's direct permissions
    const { data: directPermissions, error: directError } = await supabase
      .from('auth_user_permissions')
      .select(`
        permission_id,
        is_active,
        expires_at
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (directError) {
      console.error('Error fetching direct permissions:', directError);
      return NextResponse.json({
        permissions: {},
        isRootAdmin: false
      });
    }

    // Get permission names for direct permissions
    let permissionNames: string[] = [];
    if (directPermissions && directPermissions.length > 0) {
      // Filter out expired permissions
      const validPermissions = directPermissions.filter(p => 
        !p.expires_at || new Date(p.expires_at) > new Date()
      );
      
      const permissionIds = validPermissions.map(dp => dp.permission_id);
      
      if (permissionIds.length > 0) {
        const { data: permissions } = await supabase
          .from('auth_permissions')
          .select('name')
          .in('id', permissionIds);

        permissionNames = permissions?.map(p => p.name) || [];
      }
    }

    // Get user's role-based permissions
    const { data: userRoles, error: roleError } = await supabase
      .from('auth_user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!roleError && userRoles && userRoles.length > 0) {
      const roleIds = userRoles.map(ur => ur.role_id);

      // Get permissions from roles
      const { data: rolePermissions } = await supabase
        .from('auth_role_permissions')
        .select('permission_id')
        .in('role_id', roleIds);

      if (rolePermissions && rolePermissions.length > 0) {
        const rolePermissionIds = rolePermissions.map(rp => rp.permission_id);
        
        const { data: rolePermissionNames } = await supabase
          .from('auth_permissions')
          .select('name')
          .in('id', rolePermissionIds);

        if (rolePermissionNames) {
          permissionNames = [...new Set([
            ...permissionNames,
            ...rolePermissionNames.map(p => p.name)
          ])];
        }
      }
    }

    // Build permissions map
    const permissionsMap: Record<string, boolean> = {};
    permissionNames.forEach(name => {
      permissionsMap[name] = true;
    });

    return NextResponse.json({
      permissions: permissionsMap,
      isRootAdmin: false
    });

  } catch (error) {
    console.error('User permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
