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

    // Debug: Check if Stock Ledger permissions exist in the database at all
    const { data: stockLedgerCheck } = await supabase
      .from('auth_permissions')
      .select('name')
      .like('name', 'stockLedger.%')
      .limit(5);
    
    if (!stockLedgerCheck || stockLedgerCheck.length === 0) {
      console.error('[Permissions] ⚠️ NO Stock Ledger permissions found in auth_permissions table!');
      console.error('[Permissions] ⚠️ Run the migration: 20260109000001_fix_stock_ledger_reports_permissions.sql');
    } else {
      console.log(`[Permissions] ✅ Found ${stockLedgerCheck.length} Stock Ledger permissions in database`);
    }

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

    // Debug: Log what we found
    console.log(`[Permissions] User ${userId} has ${directPermissions?.length || 0} direct permission assignments`);

    // Get permission names for direct permissions
    let permissionNames: string[] = [];
    if (directPermissions && directPermissions.length > 0) {
      // Filter out expired permissions
      const validPermissions = directPermissions.filter(p => 
        !p.expires_at || new Date(p.expires_at) > new Date()
      );
      
      const permissionIds = validPermissions.map(dp => dp.permission_id);
      console.log(`[Permissions] Valid permission IDs: ${permissionIds.join(', ')}`);
      
      if (permissionIds.length > 0) {
        const { data: permissions, error: permLookupError } = await supabase
          .from('auth_permissions')
          .select('id, name')
          .in('id', permissionIds);

        if (permLookupError) {
          console.error('[Permissions] Error looking up permission names:', permLookupError);
        }

        // Debug: Log the permission lookup results
        console.log(`[Permissions] Found ${permissions?.length || 0} permission names from auth_permissions`);
        if (permissions && permissions.length < permissionIds.length) {
          console.warn(`[Permissions] WARNING: Some permission IDs not found in auth_permissions table!`);
          console.warn(`[Permissions] Requested: ${permissionIds.length}, Found: ${permissions.length}`);
        }

        permissionNames = permissions?.map(p => p.name) || [];
        console.log(`[Permissions] Permission names: ${permissionNames.join(', ')}`);
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

    // Debug: Log final permissions
    const stockLedgerPerms = permissionNames.filter(n => n.startsWith('stockLedger.'));
    const reportsPerms = permissionNames.filter(n => n.startsWith('reports.'));
    console.log(`[Permissions] Final count: ${permissionNames.length} total, ${stockLedgerPerms.length} stockLedger, ${reportsPerms.length} reports`);
    if (stockLedgerPerms.length > 0) {
      console.log(`[Permissions] Stock Ledger permissions: ${stockLedgerPerms.join(', ')}`);
    }

    return NextResponse.json({
      permissions: permissionsMap,
      isRootAdmin: false,
      _debug: {
        totalPermissions: permissionNames.length,
        directPermissionCount: directPermissions?.length || 0,
        stockLedgerCount: stockLedgerPerms.length,
        reportsCount: reportsPerms.length
      }
    });

  } catch (error) {
    console.error('User permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
