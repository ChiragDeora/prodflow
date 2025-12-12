import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('current_silo_status')
      .select('*')
      .order('silo_number');

    if (error) {
      console.error('Error fetching silo data:', error);
      return NextResponse.json({ error: 'Failed to fetch silo data' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silos API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { silo_number, silo_name, capacity_kg, status, location } = body;

    const { data, error } = await supabase
      .from('silos')
      .insert([{
        silo_number,
        silo_name,
        capacity_kg,
        status,
        location
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating silo:', error);
      return NextResponse.json({ error: 'Failed to create silo' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in silos POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

