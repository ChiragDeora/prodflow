// ============================================================================
// ADMIN API: Form Deletion – List documents for a form type
// GET /api/admin/form-deletion/documents?formCode=600&limit=50
// Root admin only. Returns recent documents (id, doc_no, stock_status) for the given form type.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';
import { verifyRootAdmin } from '@/lib/auth-utils';
import { FORM_DELETION_CONFIG } from '@/utils/formCodeUtils';

export async function GET(request: NextRequest) {
  const admin = await verifyRootAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Root admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const formCode = searchParams.get('formCode');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);

  if (!formCode) {
    return NextResponse.json({ success: false, error: 'formCode is required' }, { status: 400 });
  }

  const config = FORM_DELETION_CONFIG[formCode];
  if (!config) {
    return NextResponse.json({ success: false, error: `Unknown form code: ${formCode}` }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const cols = ['id', config.docNoColumn];
    if (config.stockStatusColumn) cols.push(config.stockStatusColumn);

    const { data: rows, error } = await supabase
      .from(config.table)
      .select(cols.join(', '))
      .order(config.docNoColumn, { ascending: false })
      .limit(limit);

    if (error) {
      handleSupabaseError(error, `listing documents for ${config.table}`);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const data = (rows || []).map((r) => {
      const row = r as unknown as Record<string, unknown>;
      return {
        id: row.id,
        doc_no: row[config.docNoColumn],
        stock_status: config.stockStatusColumn ? (row[config.stockStatusColumn] as string | undefined) ?? null : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('Form deletion documents list error:', e);
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'List failed',
    }, { status: 500 });
  }
}
