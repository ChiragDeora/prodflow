import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {

    // Fetch user permissions
    const { data: userPermissions, error: userPermError } = await supabase
      .from('user_permissions')
      .select(`
        id,
        user_id,
        permission_id,
        access_level,
        is_active,
        permissions (
          id,
          name,
          description,
          module,
          action,
          resource
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (userPermError) {
      console.error('Error fetching user permissions:', userPermError);
      return NextResponse.json(
        { error: 'Failed to fetch user permissions' },
        { status: 500 }
      );
    }

    // Fetch module permissions
    const { data: modulePermissions, error: modulePermError } = await supabase
      .from('module_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (modulePermError) {
      console.error('Error fetching module permissions:', modulePermError);
      return NextResponse.json(
        { error: 'Failed to fetch module permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userPermissions: userPermissions || [],
      modulePermissions: modulePermissions || []
    });
  } catch (error) {
    console.error('Exception fetching user permissions:', error);
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
  const { userId } = await params;
  try {
    const { role, userPermissions, modulePermissions } = await request.json();

    // Update user role
    const { error: roleError } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId);

    if (roleError) {
      console.error('Error updating user role:', roleError);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    // Update user permissions
    if (userPermissions && userPermissions.length > 0) {
      for (const permission of userPermissions) {
        if (permission.id) {
          // Update existing permission
          const { error } = await supabase
            .from('user_permissions')
            .update({
              access_level: permission.access_level,
              updated_at: new Date().toISOString()
            })
            .eq('id', permission.id);

          if (error) {
            console.error('Error updating permission:', error);
          }
        } else {
          // Insert new permission
          const { error } = await supabase
            .from('user_permissions')
            .insert({
              user_id: userId,
              permission_id: permission.permission_id,
              access_level: permission.access_level,
              granted_by: '224632d5-f27c-48d2-b38f-61c40c1acc21' // Yogesh's ID
            });

          if (error) {
            console.error('Error inserting permission:', error);
          }
        }
      }
    }

    // Update module permissions
    if (modulePermissions && modulePermissions.length > 0) {
      for (const modulePerm of modulePermissions) {
        if (modulePerm.id) {
          // Update existing module permission
          const { error } = await supabase
            .from('module_permissions')
            .update({
              access_level: modulePerm.access_level,
              updated_at: new Date().toISOString()
            })
            .eq('id', modulePerm.id);

          if (error) {
            console.error('Error updating module permission:', error);
          }
        } else {
          // Insert new module permission
          const { error } = await supabase
            .from('module_permissions')
            .insert({
              user_id: userId,
              module_name: modulePerm.module_name,
              access_level: modulePerm.access_level,
              granted_by: '224632d5-f27c-48d2-b38f-61c40c1acc21' // Yogesh's ID
            });

          if (error) {
            console.error('Error inserting module permission:', error);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exception updating user permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 