import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export async function GET(request: NextRequest) {
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
    // Fetch the document with the specified field
    const { data, error } = await supabase
      .from(table)
      .select(`${field}, doc_no`)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching source document:', error);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Return the document number (prefer doc_no if available)
    const docNo = data?.doc_no || data?.[field] || null;

    return NextResponse.json({ doc_no: docNo });
  } catch (error) {
    console.error('Error in source-doc API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
