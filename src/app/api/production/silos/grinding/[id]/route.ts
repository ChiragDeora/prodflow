import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('silo_grinding_records')
      .select(`
        *,
        silos (
          silo_name,
          silo_number
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching grinding record:', error);
      return NextResponse.json({ error: 'Failed to fetch grinding record' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in grinding record GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      record_date,
      silo_id,
      material_grade,
      material_name,
      input_weight_kg,
      output_weight_kg,
      waste_weight_kg,
      efficiency_percentage,
      operator_name,
      supervisor_name,
      remarks
    } = body;

    const { data, error } = await supabase
      .from('silo_grinding_records')
      .update({
        record_date,
        silo_id,
        material_grade,
        material_name,
        input_weight_kg,
        output_weight_kg,
        waste_weight_kg,
        efficiency_percentage,
        operator_name,
        supervisor_name,
        remarks,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating grinding record:', error);
      return NextResponse.json({ error: 'Failed to update grinding record' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in grinding record PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    const { error } = await supabase
      .from('silo_grinding_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting grinding record:', error);
      return NextResponse.json({ error: 'Failed to delete grinding record' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Grinding record deleted successfully' });
  } catch (error) {
    console.error('Error in grinding record DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
