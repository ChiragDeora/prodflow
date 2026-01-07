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
      .from('customer_master')
      .select('*')
      .order('customer_name', { ascending: true });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/masters/customers:', error);
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
    
    // Generate customer code if not provided
    if (!body.customer_code) {
      const { data: lastCustomer } = await supabase
        .from('customer_master')
        .select('customer_code')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastCode = lastCustomer?.[0]?.customer_code || 'CUST000';
      const lastNumber = parseInt(lastCode.replace('CUST', '')) || 0;
      body.customer_code = `CUST${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const { data, error } = await supabase
      .from('customer_master')
      .insert([{
        ...body,
        created_by: auth.user?.username || 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Error in POST /api/masters/customers:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

