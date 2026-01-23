import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/utils';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

// Allowed tables for security
const ALLOWED_TABLES = [
  'store_jw_annexure_grn',
  'store_grn',
  'store_mis',
  'dpr_data',
  'store_job_work_challan',
  'store_fgn',
  'dispatch_delivery_challan',
];

// Tables that have doc_no field
const TABLES_WITH_DOC_NO = [
  'store_jw_annexure_grn',
  'store_job_work_challan',
];

export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const id = searchParams.get('id');
  const field = searchParams.get('field');

  if (!table || !id || !field) {
    return NextResponse.json(
      { error: 'Missing required parameters: table, id, field' },
      { status: 400 }
    );
  }

  // Validate table name for security
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json(
      { error: 'Invalid table name' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    
    // Build select query - only include doc_no if the table has it
    const selectFields = TABLES_WITH_DOC_NO.includes(table)
      ? `${field}, doc_no`
      : field;

    // Fetch the document with the specified field
    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .eq('id', id)
      .single();

    if (error) {
      // Check if it's a "not found" error (PGRST116) or other error
      if (error.code === 'PGRST116') {
        console.log(`[source-doc] Document not found: table=${table}, id=${id}`);
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      
      console.error('[source-doc] Error fetching source document:', {
        table,
        id,
        field,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      return NextResponse.json(
        { error: 'Error fetching document', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Return the document number (prefer doc_no if available, otherwise use the requested field)
    const record = data as Record<string, any> | null;
    const docNo = record?.doc_no || (field ? record?.[field] : null) || null;

    return NextResponse.json({ doc_no: docNo });
  } catch (error) {
    console.error('[source-doc] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
