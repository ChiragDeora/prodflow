import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const siloId = searchParams.get('silo_id');
    const limit = searchParams.get('limit') || '100';

    let query = supabase
      .from('silo_grinding_records')
      .select(`
        *,
        silos (
          silo_name,
          silo_number
        )
      `)
      .order('record_date', { ascending: false })
      .limit(parseInt(limit));

    if (date) {
      query = query.eq('record_date', date);
    }

    if (siloId) {
      query = query.eq('silo_id', siloId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching grinding records:', error);
      return NextResponse.json({ error: 'Failed to fetch grinding records' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in grinding records API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
      .insert([{
        record_date: record_date || new Date().toISOString().split('T')[0],
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
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating grinding record:', error);
      return NextResponse.json({ error: 'Failed to create grinding record' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in grinding records POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

