import { NextRequest, NextResponse } from 'next/server';
import { bomVersionAPI } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await bomVersionAPI.getByBOMMasterId(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching BOM versions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BOM versions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { components, notes, changeReason, createdBy } = body;

    if (!components || !Array.isArray(components) || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const data = await bomVersionAPI.createNewVersion(
      id,
      components,
      notes || '',
      changeReason || '',
      createdBy
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating BOM version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create BOM version' },
      { status: 500 }
    );
  }
}
