import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const getSupabase = () => createClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');
    const date = searchParams.get('date');
    const isActive = searchParams.get('isActive');

    let query = supabase
      .from('line_mold_assignments')
      .select('*')
      .order('assignment_date', { ascending: false });

    if (lineId) {
      query = query.eq('line_id', lineId);
    }
    if (date) {
      query = query.eq('assignment_date', date);
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching line-mold assignments:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch line-mold assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in line-mold assignments API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const {
      line_id,
      mold_name,
      assignment_date,
      changeover_time,
      shift,
      is_active
    } = body;

    // Validate required fields
    if (!line_id || !mold_name || !assignment_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('line_mold_assignments')
      .insert({
        line_id,
        mold_name,
        assignment_date,
        changeover_time,
        shift: shift || 'day',
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating line-mold assignment:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create line-mold assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in line-mold assignments POST API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
