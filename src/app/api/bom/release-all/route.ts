import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/utils';
import { verifySession } from '@/lib/auth-utils';

// Helper function to create audit entries for released BOMs
async function createBulkAuditEntries(
  supabase: any,
  tableName: string,
  bomIds: string[],
  releaser: string,
  releasedAt: string
) {
  if (bomIds.length === 0) return;
  
  const auditEntries = bomIds.map(id => ({
    table_name: tableName,
    record_id: id,
    action: 'RELEASE',
    old_values: JSON.stringify({ status: 'draft' }),
    new_values: JSON.stringify({ status: 'released', released_at: releasedAt, released_by: releaser }),
    changed_by: releaser,
    changed_at: releasedAt,
    change_reason: `Bulk release by ${releaser}`
  }));
  
  const { error } = await supabase
    .from('bom_audit_trial')
    .insert(auditEntries);
  
  if (error) {
    console.error(`Error creating audit entries for ${tableName}:`, error);
  }
}

// POST: Release all BOMs in a category (or all categories)
export async function POST(request: NextRequest) {
  try {
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, releasedBy } = body;

    const supabase = getSupabase();
    const releasedAt = new Date().toISOString();
    const releaser = releasedBy || sessionData.user?.username || 'system';

    const results: { 
      sfg: number; 
      fg: number; 
      local: number;
      total: number;
    } = { sfg: 0, fg: 0, local: 0, total: 0 };

    // Release SFG BOMs
    if (!category || category === 'SFG') {
      const { data: sfgData, error: sfgError } = await supabase
        .from('sfg_bom')
        .update({ 
          status: 'released',
          released_at: releasedAt,
          released_by: releaser,
          updated_at: releasedAt
        })
        .eq('status', 'draft')
        .select('id');
      
      if (sfgError) {
        console.error('Error releasing SFG BOMs:', sfgError);
      } else {
        results.sfg = sfgData?.length || 0;
        // Create audit entries for released SFG BOMs
        await createBulkAuditEntries(supabase, 'sfg_bom', sfgData?.map((b: any) => b.id) || [], releaser, releasedAt);
      }
    }

    // Release FG BOMs
    if (!category || category === 'FG') {
      const { data: fgData, error: fgError } = await supabase
        .from('fg_bom')
        .update({ 
          status: 'released',
          released_at: releasedAt,
          released_by: releaser,
          updated_at: releasedAt
        })
        .eq('status', 'draft')
        .select('id');
      
      if (fgError) {
        console.error('Error releasing FG BOMs:', fgError);
      } else {
        results.fg = fgData?.length || 0;
        // Create audit entries for released FG BOMs
        await createBulkAuditEntries(supabase, 'fg_bom', fgData?.map((b: any) => b.id) || [], releaser, releasedAt);
      }
    }

    // Release LOCAL BOMs
    if (!category || category === 'LOCAL') {
      const { data: localData, error: localError } = await supabase
        .from('local_bom')
        .update({ 
          status: 'released',
          released_at: releasedAt,
          released_by: releaser,
          updated_at: releasedAt
        })
        .eq('status', 'draft')
        .select('id');
      
      if (localError) {
        console.error('Error releasing LOCAL BOMs:', localError);
      } else {
        results.local = localData?.length || 0;
        // Create audit entries for released LOCAL BOMs
        await createBulkAuditEntries(supabase, 'local_bom', localData?.map((b: any) => b.id) || [], releaser, releasedAt);
      }
    }

    results.total = results.sfg + results.fg + results.local;

    return NextResponse.json({ 
      success: true, 
      data: results,
      message: `Released ${results.total} BOMs (SFG: ${results.sfg}, FG: ${results.fg}, LOCAL: ${results.local})`
    });
  } catch (error) {
    console.error('Error releasing all BOMs:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to release BOMs' },
      { status: 500 }
    );
  }
}

