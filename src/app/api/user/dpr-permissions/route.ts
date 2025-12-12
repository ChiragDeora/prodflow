import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const sessionData = await verifySession(request);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = sessionData.user.id;
    const userEmail = sessionData.user.email?.toLowerCase() || '';
    const userName = sessionData.user.fullName?.toLowerCase() || '';
    
    // Check if user is Yogesh Deora - always grant all permissions
    const isYogeshDeora = 
      userEmail.includes('yogesh') || 
      userEmail.includes('deora') ||
      userName.includes('yogesh') ||
      userName.includes('deora') ||
      sessionData.user.isRootAdmin;

    // If Yogesh Deora or root admin, return all permissions
    if (isYogeshDeora) {
      return NextResponse.json({
        permissions: {
          'dpr.basic_info.view': true,
          'dpr.process_params.view': true,
          'dpr.shots.view': true,
          'dpr.production_data.view': true,
          'dpr.runtime.view': true,
          'dpr.stoppage.view': true,
          'dpr.settings.manage': true,
        },
        canManageSettings: true
      });
    }

    // Get user's DPR permissions
    const { data: userPermissions, error } = await supabase
      .from('auth_user_permissions')
      .select(`
        permission_id,
        is_active,
        expires_at,
        permissions:auth_permissions(name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      console.error('Error fetching DPR permissions:', error);
      // Default to no permissions on error
      return NextResponse.json({
        permissions: {},
        canManageSettings: false
      });
    }

    // Build permissions object
    const permissions: Record<string, boolean> = {};
    let canManageSettings = false;

    if (userPermissions) {
      for (const up of userPermissions) {
        const permissionName = (up.permissions as any)?.name;
        if (permissionName && permissionName.startsWith('dpr.')) {
          permissions[permissionName] = true;
          if (permissionName === 'dpr.settings.manage') {
            canManageSettings = true;
          }
        }
      }
    }

    return NextResponse.json({
      permissions,
      canManageSettings
    });
  } catch (error) {
    console.error('Error in DPR permissions check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

