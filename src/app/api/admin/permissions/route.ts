import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyRootAdmin } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('module');
    const action = searchParams.get('action');
    const scopeLevel = searchParams.get('scope');

    // Build query - simplified for your schema
    let query = supabase
      .from('auth_permissions')
      .select(`
        id,
        name,
        description,
        action,
        scope_level,
        field_mode,
        mask_type,
        is_allow,
        conditions,
        created_at,
        resource_id
      `)
      .order('name');

    // Apply filters
    if (moduleId) {
      query = query.eq('resource_id', moduleId);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (scopeLevel) {
      query = query.eq('scope_level', scopeLevel);
    }

    const { data: permissions, error } = await query;

    if (error) {
      console.error('Error fetching permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }

    // Get resource details separately if needed
    let enrichedPermissions = permissions;
    if (permissions && permissions.length > 0) {
      const resourceIds = [...new Set(permissions.map(p => p.resource_id).filter(Boolean))];
      if (resourceIds.length > 0) {
        const { data: resources } = await supabase
          .from('auth_resources')
          .select('id, name, description, table_name, department')
          .in('id', resourceIds);
        
        enrichedPermissions = permissions.map(permission => ({
          ...permission,
          resource: resources?.find(r => r.id === permission.resource_id) || null
        }));
      }
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'view_permissions',
      resource_type: 'auth_permissions',
      details: { 
        filters: { moduleId, action, scopeLevel },
        total_permissions: permissions.length 
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      permissions: enrichedPermissions,
      total: enrichedPermissions.length
    });

  } catch (error) {
    console.error('Permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can create permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      action,
      scopeLevel,
      resourceId,
      fieldId,
      fieldMode,
      maskType,
      isAllow = true,
      conditions
    } = body;

    // Validate required fields
    if (!name || !description || !action || !scopeLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, action, scopeLevel' },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const { data: existingPermission } = await supabase
      .from('auth_permissions')
      .select('id')
      .eq('name', name)
      .single();

    if (existingPermission) {
      return NextResponse.json(
        { error: 'Permission with this name already exists' },
        { status: 409 }
      );
    }

    // Create permission
    const { data: newPermission, error } = await supabase
      .from('auth_permissions')
      .insert({
        name,
        description,
        action,
        scope_level: scopeLevel,
        resource_id: resourceId || null,
        field_id: fieldId || null,
        field_mode: fieldMode || null,
        mask_type: maskType || null,
        is_allow: isAllow,
        conditions: conditions || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating permission:', error);
      return NextResponse.json(
        { error: 'Failed to create permission' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'create_permission',
      resource_type: 'auth_permissions',
      resource_id: newPermission.id,
      details: { permission_name: name, action, scope_level: scopeLevel },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      permission: newPermission,
      message: 'Permission created successfully'
    });

  } catch (error) {
    console.error('Create permission API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
