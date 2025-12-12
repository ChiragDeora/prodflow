import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('mould_loading_unloading_reports')
      .select(`
        *,
        unloading_procedures:mould_unloading_procedures(*),
        loading_procedures:mould_loading_procedures(*)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching mould report:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/production/mould-reports/[id]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Update main report
    const { data: reportData, error: reportError } = await supabase
      .from('mould_loading_unloading_reports')
      .update({
        ...body.report,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (reportError) {
      console.error('Error updating mould report:', reportError);
      return NextResponse.json({ success: false, error: reportError.message }, { status: 500 });
    }

    // Update unloading procedures if provided
    if (body.unloading_procedures) {
      for (const procedure of body.unloading_procedures) {
        const { error: procError } = await supabase
          .from('mould_unloading_procedures')
          .update({
            tick_yes_no: procedure.tick_yes_no,
            remarks: procedure.remarks
          })
          .eq('id', procedure.id);

        if (procError) {
          console.error('Error updating unloading procedure:', procError);
        }
      }
    }

    // Update loading procedures if provided
    if (body.loading_procedures) {
      for (const procedure of body.loading_procedures) {
        const { error: procError } = await supabase
          .from('mould_loading_procedures')
          .update({
            tick_yes_no: procedure.tick_yes_no,
            remarks: procedure.remarks
          })
          .eq('id', procedure.id);

        if (procError) {
          console.error('Error updating loading procedure:', procError);
        }
      }
    }

    // Get updated report with procedures
    const { data: updatedData, error: fetchError } = await supabase
      .from('mould_loading_unloading_reports')
      .select(`
        *,
        unloading_procedures:mould_unloading_procedures(*),
        loading_procedures:mould_loading_procedures(*)
      `)
      .eq('id', params.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated report:', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedData });
  } catch (error) {
    console.error('Error in PUT /api/production/mould-reports/[id]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('mould_loading_unloading_reports')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting mould report:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/production/mould-reports/[id]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

