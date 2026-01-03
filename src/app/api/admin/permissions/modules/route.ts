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
        { error: 'Only root admin can access module structure' },
        { status: 403 }
      );
    }

    // Get all resources (modules) with their fields
    const { data: modules, error } = await supabase
      .from('auth_resources')
      .select(`
        id,
        name,
        description,
        table_name,
        department,
        created_at,
        fields:auth_resource_fields(
          id,
          field_name,
          field_type,
          is_sensitive,
          description
        )
      `)
      .order('name');

    if (error) {
      console.error('Error fetching modules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }

    // Get permission counts for each module
    const modulePermissions = await Promise.all(
      modules.map(async (module) => {
        const { count } = await supabase
          .from('auth_permissions')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', module.id);

        return {
          ...module,
          permission_count: count || 0
        };
      })
    );

    // Organize modules by hierarchy (main modules vs sub-modules)
    const organizedModules = {
      main_modules: modulePermissions.filter(m => !m.name.includes(' - ')),
      sub_modules: modulePermissions.filter(m => m.name.includes(' - '))
    };

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'view_module_structure',
      resource_type: 'auth_resources',
      details: { 
        total_modules: modules.length,
        main_modules: organizedModules.main_modules.length,
        sub_modules: organizedModules.sub_modules.length
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      modules: organizedModules,
      total: modules.length
    });

  } catch (error) {
    console.error('Module structure API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
