// ============================================================================
// ADMIN API: Form Deletion – Lookup form by form code and doc number
// GET /api/admin/form-deletion/lookup?formCode=700&docNo=70025260001
// Root admin only. Returns form id, doc_no, stock_status, has_ledger.
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
  const docNo = searchParams.get('docNo');

  if (!formCode || !docNo) {
    return NextResponse.json({
      success: false,
      error: 'formCode and docNo are required'
    }, { status: 400 });
  }

  const config = FORM_DELETION_CONFIG[formCode];
  if (!config) {
    return NextResponse.json({
      success: false,
      error: `Unknown form code: ${formCode}`
    }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const selectCols = ['id', config.docNoColumn];
    if (config.stockStatusColumn) {
      selectCols.push(config.stockStatusColumn);
    }

    const { data: row, error } = await supabase
      .from(config.table)
      .select(selectCols.join(', '))
      .eq(config.docNoColumn, docNo)
      .maybeSingle();

    if (error) {
      handleSupabaseError(error, `looking up form ${config.table}`);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({
        success: false,
        error: 'Form not found',
        found: false
      }, { status: 404 });
    }

    const r = row as unknown as Record<string, unknown>;
    const id = r.id as string;
    const docNoVal = r[config.docNoColumn] as string;
    const stockStatus = config.stockStatusColumn ? (r[config.stockStatusColumn] as string | undefined) : undefined;

    let has_ledger = false;
    if (config.ledgerDocTypes && config.ledgerDocTypes.length > 0) {
      const { count, error: leError } = await supabase
        .from('stock_ledger')
        .select('*', { count: 'exact', head: true })
        .in('document_type', config.ledgerDocTypes)
        .eq('document_id', id);

      if (!leError && count != null && count > 0) {
        has_ledger = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        doc_no: docNoVal,
        stock_status: stockStatus ?? null,
        has_ledger,
        can_form_only: !has_ledger,
        can_form_and_ledger: true,
      },
      found: true
    });
  } catch (e) {
    console.error('Form deletion lookup error:', e);
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'Lookup failed'
    }, { status: 500 });
  }
}
