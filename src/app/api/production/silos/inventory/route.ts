import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siloId = searchParams.get('silo_id');
    const date = searchParams.get('date');

    let query = supabase
      .from('silo_daily_inventory')
      .select('*');

    if (siloId) {
      query = query.eq('silo_id', siloId);
    }

    if (date) {
      query = query.eq('inventory_date', date);
    }

    query = query.order('inventory_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching silo inventory:', error);
      return NextResponse.json({ error: 'Failed to fetch silo inventory' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silo inventory API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      silo_id,
      inventory_date,
      hp_grade_bags,
      hp_grade_kg,
      icp_grade_bags,
      icp_grade_kg,
      cp_grade_bags,
      cp_grade_kg,
      ld_grade_bags,
      ld_grade_kg,
      mb_bags,
      mb_kg,
      created_by
    } = body;

    const { data, error } = await supabase
      .from('silo_daily_inventory')
      .insert([{
        silo_id,
        inventory_date,
        hp_grade_bags: hp_grade_bags || 0,
        hp_grade_kg: hp_grade_kg || 0,
        icp_grade_bags: icp_grade_bags || 0,
        icp_grade_kg: icp_grade_kg || 0,
        cp_grade_bags: cp_grade_bags || 0,
        cp_grade_kg: cp_grade_kg || 0,
        ld_grade_bags: ld_grade_bags || 0,
        ld_grade_kg: ld_grade_kg || 0,
        mb_bags: mb_bags || 0,
        mb_kg: mb_kg || 0,
        created_by: created_by || 'system'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating silo inventory:', error);
      return NextResponse.json({ error: 'Failed to create silo inventory' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in silo inventory POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

