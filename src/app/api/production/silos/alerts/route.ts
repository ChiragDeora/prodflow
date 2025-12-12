import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');
    const siloId = searchParams.get('silo_id');

    let query = supabase
      .from('silo_alerts')
      .select(`
        *,
        silos (
          silo_name,
          silo_number
        )
      `)
      .order('created_at', { ascending: false });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (siloId) {
      query = query.eq('silo_id', siloId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching silo alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch silo alerts' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silo alerts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      silo_id,
      alert_type,
      alert_level,
      message,
      threshold_value,
      current_value
    } = body;

    const { data, error } = await supabase
      .from('silo_alerts')
      .insert([{
        silo_id,
        alert_type,
        alert_level,
        message,
        threshold_value,
        current_value,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating silo alert:', error);
      return NextResponse.json({ error: 'Failed to create silo alert' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in silo alerts POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

