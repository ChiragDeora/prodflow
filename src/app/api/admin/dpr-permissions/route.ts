import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyRootAdmin } from '@/lib/auth-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get all DPR permissions with user counts
export async function GET(request: NextRequest) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can view DPR permissions' },
        { status: 403 }
      );
    }

    // Get all DPR permissions
    const { data: permissions, error: permError } = await supabase
      .from('auth_permissions')
      .select('id, name, description, module, action, resource')
      .like('name', 'dpr.%')
      .order('name');

    if (permError) {
      throw permError;
    }

    // Get user counts for each permission
    const permissionsWithCounts = await Promise.all(
      (permissions || []).map(async (perm) => {
        const { count } = await supabase
          .from('auth_user_permissions')
          .select('*', { count: 'exact', head: true })
          .eq('permission_id', perm.id)
          .eq('is_active', true);

        return {
          ...perm,
          userCount: count || 0,
        };
      })
    );

    return NextResponse.json({ permissions: permissionsWithCounts });
  } catch (error: any) {
    console.error('Error fetching DPR permissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch DPR permissions' },
      { status: 500 }
    );
  }
}

