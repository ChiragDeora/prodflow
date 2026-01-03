import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';

const getSupabase = () => createClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access permission templates' },
        { status: 403 }
      );
    }

    // Since auth_permission_templates table doesn't exist, return basic templates based on roles
    const { data: roles } = await supabase
      .from('auth_roles')
      .select('id, name, description')
      .order('name');

    const templates = (roles || []).map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      department: role.name.split(' ')[0].toLowerCase(), // Extract department from role name
      role_type: role.name.includes('Manager') ? 'manager' : 'officer',
      permissions: [], // Will be populated when templates are actually implemented
      created_at: new Date().toISOString(),
      permission_details: []
    }));

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'view_permission_templates',
      resource_type: 'auth_roles',
      details: { 
        total_templates: templates.length 
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      templates,
      total: templates.length
    });

  } catch (error) {
    console.error('Permission templates API error:', error);
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
        { error: 'Only root admin can create permission templates' },
        { status: 403 }
      );
    }

    // For now, return a placeholder response since templates table doesn't exist
    return NextResponse.json({
      message: 'Permission template creation not yet implemented. Use direct permission assignment for now.',
      status: 'not_implemented'
    });

  } catch (error) {
    console.error('Create permission template API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
