// ============================================================================
// ADMIN API: Form Deletion – Delete form (and optionally ledger)
// POST /api/admin/form-deletion
// Body: { formCode, docNo, deleteLedger: boolean }
// - deleteLedger false: Delete form + child rows only. Allowed only when not posted.
// - deleteLedger true:  Delete ledger entries for this document, then form + child rows.
// Root admin only.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';
import { verifyRootAdmin } from '@/lib/auth-utils';
import { FORM_DELETION_CONFIG } from '@/utils/formCodeUtils';

export async function POST(request: NextRequest) {
  const admin = await verifyRootAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Root admin access required' }, { status: 403 });
  }

  let body: { formCode?: string; docNo?: string; deleteLedger?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { formCode, docNo, deleteLedger } = body;
  if (!formCode || !docNo || typeof deleteLedger !== 'boolean') {
    return NextResponse.json({
      success: false,
      error: 'formCode, docNo, and deleteLedger (boolean) are required'
    }, { status: 400 });
  }

  const config = FORM_DELETION_CONFIG[formCode];
  if (!config) {
    return NextResponse.json({ success: false, error: `Unknown form code: ${formCode}` }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // 1) Resolve form id and check posted/ledger
    const { data: row, error: fetchErr } = await supabase
      .from(config.table)
      .select('id' + (config.stockStatusColumn ? `, ${config.stockStatusColumn}` : ''))
      .eq(config.docNoColumn, docNo)
      .maybeSingle();

    if (fetchErr) {
      handleSupabaseError(fetchErr, `fetching form ${config.table}`);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
    }

    const id = (row as unknown as Record<string, unknown>).id as string;

    let has_ledger = false;
    if (config.ledgerDocTypes && config.ledgerDocTypes.length > 0) {
      const { count, error: leErr } = await supabase
        .from('stock_ledger')
        .select('*', { count: 'exact', head: true })
        .in('document_type', config.ledgerDocTypes)
        .eq('document_id', id);
      if (!leErr && count != null && count > 0) has_ledger = true;
    }

    // 2) If form is posted (has ledger) and user chose "form only" -> reject
    if (has_ledger && !deleteLedger) {
      return NextResponse.json({
        success: false,
        error: 'Form is posted to stock. Use "Form + Ledger" to delete the form and its ledger entries.'
      }, { status: 400 });
    }

    // 3) If deleteLedger: delete ledger rows for this document
    if (deleteLedger && config.ledgerDocTypes && config.ledgerDocTypes.length > 0) {
      const { error: delLedgerErr } = await supabase
        .from('stock_ledger')
        .delete()
        .in('document_type', config.ledgerDocTypes)
        .eq('document_id', id);

      if (delLedgerErr) {
        handleSupabaseError(delLedgerErr, 'deleting ledger entries');
        return NextResponse.json({
          success: false,
          error: `Failed to delete ledger: ${delLedgerErr.message}`
        }, { status: 500 });
      }
    }

    // 4) Delete child tables (child rows first)
    for (const ch of config.childTables) {
      const { error: chErr } = await supabase
        .from(ch.table)
        .delete()
        .eq(ch.fkColumn, id);

      if (chErr) {
        handleSupabaseError(chErr, `deleting ${ch.table}`);
        return NextResponse.json({
          success: false,
          error: `Failed to delete ${ch.table}: ${chErr.message}`
        }, { status: 500 });
      }
    }

    // 5) Delete main form row
    const { error: mainErr } = await supabase
      .from(config.table)
      .delete()
      .eq('id', id);

    if (mainErr) {
      handleSupabaseError(mainErr, `deleting ${config.table}`);
      return NextResponse.json({
        success: false,
        error: `Failed to delete form: ${mainErr.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: deleteLedger && has_ledger
        ? `Form ${docNo} and its ledger entries have been deleted. Rebuild stock_balances from stock_ledger if you need correct balances.`
        : `Form ${docNo} has been deleted.`
    });
  } catch (e) {
    console.error('Form deletion error:', e);
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'Deletion failed'
    }, { status: 500 });
  }
}
