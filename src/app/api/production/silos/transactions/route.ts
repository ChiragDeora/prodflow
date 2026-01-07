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
    const { searchParams } = new URL(request.url);
    const siloId = searchParams.get('silo_id');
    const transactionType = searchParams.get('transaction_type');
    const limit = searchParams.get('limit') || '50';

    let query = supabase
      .from('silo_transactions')
      .select(`
        *,
        silos (
          silo_name,
          silo_number
        )
      `)
      .order('transaction_date', { ascending: false })
      .limit(parseInt(limit));

    if (siloId) {
      query = query.eq('silo_id', siloId);
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching silo transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch silo transactions' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silo transactions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const body = await request.json();
    const {
      silo_id,
      transaction_date,
      transaction_type,
      material_grade,
      material_name,
      supplier,
      bags_count,
      weight_kg,
      grn_number,
      batch_number,
      operator_name,
      supervisor_name,
      remarks,
      created_by
    } = body;

    const { data, error } = await supabase
      .from('silo_transactions')
      .insert([{
        silo_id,
        transaction_date: transaction_date || new Date().toISOString(),
        transaction_type,
        material_grade,
        material_name,
        supplier,
        bags_count,
        weight_kg,
        grn_number,
        batch_number,
        operator_name,
        supervisor_name,
        remarks,
        created_by: created_by || 'system'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating silo transaction:', error);
      return NextResponse.json({ error: 'Failed to create silo transaction' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in silo transactions POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

