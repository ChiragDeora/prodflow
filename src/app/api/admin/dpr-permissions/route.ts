import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';

// Use the standard server-side Supabase client (same as other admin APIs)
const getSupabase = () => createClient();

// Canonical DPR permission definitions used across the app
const DPR_PERMISSION_DEFINITIONS = [
  {
    name: 'dpr.basic_info.view',
    description:
      'View Basic Info columns in DPR (M/c No., Opt Name, Product, Cavity)',
    action: 'read',
  },
  {
    name: 'dpr.process_params.view',
    description:
      'View Process Parameters in DPR (Trg Cycle, Trg Run Time, Part Wt, Act part wt, Act Cycle)',
    action: 'read',
  },
  {
    name: 'dpr.shots.view',
    description: 'View No of Shots columns in DPR (Start, End)',
    action: 'read',
  },
  {
    name: 'dpr.production_data.view',
    description:
      'View Production Data columns in DPR (Target Qty, Actual Qty, Ok Prod Qty, Ok Prod Kgs, Ok Prod %, Rej Kgs)',
    action: 'read',
  },
  {
    name: 'dpr.runtime.view',
    description: 'View Run Time columns in DPR (Run Time, Down time)',
    action: 'read',
  },
  {
    name: 'dpr.stoppage.view',
    description:
      'View Stoppage Time and Remarks columns in DPR (Reason, Start Time, End Time, Total Time, Mould change, REMARK)',
    action: 'read',
  },
  {
    name: 'dpr.settings.manage',
    description: 'Manage DPR column visibility settings',
    action: 'managePermissions',
  },
] as const;

type DprPermissionDefinition = (typeof DPR_PERMISSION_DEFINITIONS)[number];

async function ensureDprPermissions(supabase: ReturnType<typeof getSupabase>) {
  const names = DPR_PERMISSION_DEFINITIONS.map((p) => p.name);

  // Fetch existing DPR permissions by name
  const { data: existing, error: fetchError } = await supabase
    .from('auth_permissions')
    .select('id, name, description, action')
    .in('name', names);

  if (fetchError) {
    throw fetchError;
  }

  const existingByName = new Map<string, any>(
    (existing || []).map((p) => [p.name, p])
  );

  const missing: DprPermissionDefinition[] = DPR_PERMISSION_DEFINITIONS.filter(
    (p) => !existingByName.has(p.name)
  );

  let inserted: any[] = [];

  // Create any missing DPR permissions using the new granular schema
  if (missing.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from('auth_permissions')
      .insert(
        missing.map((p) => ({
          name: p.name,
          description: p.description,
          action: p.action,
          scope_level: 'global',
          resource_id: null,
          is_allow: true,
        }))
      )
      .select('id, name, description, action');

    if (insertError) {
      throw insertError;
    }

    inserted = created || [];
  }

  return [...(existing || []), ...inserted];
}

// Get all DPR permissions with user counts and (optionally) user matrix
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can view DPR permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeUsers = searchParams.get('includeUsers') === 'true';

    // Ensure DPR permissions exist and get their basic metadata
    const basePermissions = await ensureDprPermissions(supabase);
    const permissionIds = basePermissions.map((p) => p.id);

    let users: any[] = [];
    let userPermissionRows: any[] = [];

    if (includeUsers) {
      // Load all users (we'll filter root admins on the client)
      const { data: userData, error: usersError } = await supabase
        .from('auth_users')
        .select('id, full_name, email, is_root_admin')
        .order('full_name');

      if (usersError) {
        throw usersError;
      }

      users = userData || [];

      if (users.length > 0 && permissionIds.length > 0) {
        const userIds = users.map((u) => u.id);

        // Fetch all DPR user-permission assignments in a single query
        const { data: permsData, error: permsError } = await supabase
          .from('auth_user_permissions')
          .select(
            `
            user_id,
            permission_id,
            is_active,
            expires_at,
            permission:auth_permissions(name)
          `
          )
          .in('permission_id', permissionIds)
          .in('user_id', userIds)
          .eq('is_active', true)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

        if (permsError) {
          throw permsError;
        }

        userPermissionRows = permsData || [];
      }
    }

    // Build user counts per permission from the matrix (if available),
    // otherwise fall back to per-permission count queries.
    let userCountByPermissionId = new Map<string, number>();

    if (userPermissionRows.length > 0) {
      for (const row of userPermissionRows) {
        const pid = row.permission_id as string;
        userCountByPermissionId.set(
          pid,
          (userCountByPermissionId.get(pid) || 0) + 1
        );
      }
    } else if (permissionIds.length > 0) {
      // Fallback path: count per permission (used when includeUsers = false)
      const counts = await Promise.all(
        permissionIds.map(async (permissionId) => {
          const { count } = await supabase
            .from('auth_user_permissions')
            .select('*', { count: 'exact', head: true })
            .eq('permission_id', permissionId)
            .eq('is_active', true);

          return { permissionId, count: count || 0 };
        })
      );

      userCountByPermissionId = new Map(
        counts.map((c) => [c.permissionId, c.count])
      );
    }

    const permissionsWithCounts = basePermissions.map((perm) => ({
      ...perm,
      userCount: userCountByPermissionId.get(perm.id) || 0,
    }));

    if (!includeUsers) {
      return NextResponse.json({ permissions: permissionsWithCounts });
    }

    // Build user → permissionName boolean matrix
    const userPermissionsMap: Record<string, Record<string, boolean>> = {};

    for (const row of userPermissionRows) {
      const userId = row.user_id as string;
      const permissionName =
        (row.permission as any)?.[0]?.name || row.permission?.name;

      if (!permissionName || !permissionName.startsWith('dpr.')) continue;

      if (!userPermissionsMap[userId]) {
        userPermissionsMap[userId] = {};
      }

      userPermissionsMap[userId][permissionName] = true;
    }

    const userPermissions = (users || []).map((u) => ({
      userId: u.id,
      userName: u.full_name,
      userEmail: u.email,
      permissions: userPermissionsMap[u.id] || {},
    }));

    return NextResponse.json({
      permissions: permissionsWithCounts,
      users: users.map((u) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        isRootAdmin: u.is_root_admin,
      })),
      userPermissions,
    });
  } catch (error: any) {
    console.error('Error fetching DPR permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch DPR permissions' },
      { status: 500 }
    );
  }
}

