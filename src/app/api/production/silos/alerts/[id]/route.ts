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
      .from('silo_alerts')
      .select(`
        *,
        silos (
          silo_name,
          silo_number
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching silo alert:', error);
      return NextResponse.json({ error: 'Failed to fetch silo alert' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Silo alert not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silo alert GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { acknowledged, acknowledged_by } = body;

    const updateData: any = {};

    if (acknowledged !== undefined) {
      updateData.is_active = !acknowledged;
      if (acknowledged) {
        updateData.acknowledged_at = new Date().toISOString();
        updateData.acknowledged_by = acknowledged_by || 'system';
      }
    }

    const { data, error } = await supabase
      .from('silo_alerts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating silo alert:', error);
      return NextResponse.json({ error: 'Failed to update silo alert' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in silo alert PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('silo_alerts')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting silo alert:', error);
      return NextResponse.json({ error: 'Failed to delete silo alert' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Silo alert deleted successfully' });
  } catch (error) {
    console.error('Error in silo alert DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

