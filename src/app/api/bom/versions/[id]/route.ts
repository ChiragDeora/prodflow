import { NextRequest, NextResponse } from 'next/server';
import { bomVersionAPI } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await bomVersionAPI.getById(id);
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'BOM version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching BOM version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BOM version' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, updatedBy } = body;

    if (!updatedBy) {
      return NextResponse.json(
        { success: false, error: 'Updated by field is required' },
        { status: 400 }
      );
    }

    let data;
    if (action === 'activate') {
      data = await bomVersionAPI.activate(id, updatedBy);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating BOM version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update BOM version' },
      { status: 500 }
    );
  }
}
