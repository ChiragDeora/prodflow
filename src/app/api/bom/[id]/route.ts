import { NextRequest, NextResponse } from 'next/server';
import { bomMasterAPI } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await bomMasterAPI.getById(id);
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'BOM master not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching BOM master:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BOM master' },
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
    const { status, description, updatedBy } = body;

    if (!updatedBy) {
      return NextResponse.json(
        { success: false, error: 'Updated by field is required' },
        { status: 400 }
      );
    }

    const updates: any = { created_by: updatedBy };
    if (status) updates.status = status;
    if (description !== undefined) updates.description = description;

    const data = await bomMasterAPI.update(id, updates);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating BOM master:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update BOM master' },
      { status: 500 }
    );
  }
}
