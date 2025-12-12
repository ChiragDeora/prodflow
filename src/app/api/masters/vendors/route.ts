import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('vendor_master')
      .select('*')
      .order('vendor_name', { ascending: true });

    if (error) {
      console.error('Error fetching vendors:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/masters/vendors:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate vendor code if not provided
    if (!body.vendor_code) {
      const { data: lastVendor } = await supabase
        .from('vendor_master')
        .select('vendor_code')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastCode = lastVendor?.[0]?.vendor_code || 'VEND000';
      const lastNumber = parseInt(lastCode.replace('VEND', '')) || 0;
      body.vendor_code = `VEND${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const { data, error } = await supabase
      .from('vendor_master')
      .insert([{
        ...body,
        created_by: 'system', // Replace with actual user ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error creating vendor:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Error in POST /api/masters/vendors:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

