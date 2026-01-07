import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { data, error } = await supabase
      .from('mould_loading_unloading_reports')
      .select('*')
      .order('report_date', { ascending: false });

    if (error) {
      console.error('Error fetching mould reports:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/production/mould-reports:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const body = await request.json();
    
    // Use the function to create report with default procedures
    const { data, error } = await supabase
      .rpc('create_mould_report_with_procedures', {
        p_report_date: body.report_date,
        p_line_no: body.line_no,
        p_created_by: body.created_by || 'system'
      });

    if (error) {
      console.error('Error creating mould report:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get the created report with procedures
    const { data: reportData, error: fetchError } = await supabase
      .from('mould_loading_unloading_reports')
      .select(`
        *,
        unloading_procedures:mould_unloading_procedures(*),
        loading_procedures:mould_loading_procedures(*)
      `)
      .eq('id', data)
      .single();

    if (fetchError) {
      console.error('Error fetching created report:', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (error) {
    console.error('Error in POST /api/production/mould-reports:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

