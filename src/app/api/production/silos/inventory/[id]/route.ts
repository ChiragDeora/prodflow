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
      .from('silo_daily_inventory')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching silo inventory:', error);
      return NextResponse.json({ error: 'Failed to fetch silo inventory' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Silo inventory not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silo inventory GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      hp_grade_bags,
      hp_grade_kg,
      icp_grade_bags,
      icp_grade_kg,
      cp_grade_bags,
      cp_grade_kg,
      ld_grade_bags,
      ld_grade_kg,
      mb_bags,
      mb_kg
    } = body;

    const { data, error } = await supabase
      .from('silo_daily_inventory')
      .update({
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
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating silo inventory:', error);
      return NextResponse.json({ error: 'Failed to update silo inventory' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silo inventory PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('silo_daily_inventory')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting silo inventory:', error);
      return NextResponse.json({ error: 'Failed to delete silo inventory' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Silo inventory deleted successfully' });
  } catch (error) {
    console.error('Error in silo inventory DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

