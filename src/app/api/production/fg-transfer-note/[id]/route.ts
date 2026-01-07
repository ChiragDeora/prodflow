// ============================================================================
// /api/production/fg-transfer-note/[id]
// GET: Get single FG Transfer Note with items
// PUT: Update FG Transfer Note
// DELETE: Delete FG Transfer Note
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getFGTransferNoteById, 
  updateFGTransferNote, 
  deleteFGTransferNote 
} from '@/lib/production/fg-transfer-note';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const data = await getFGTransferNoteById(id);
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'FG Transfer Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/production/fg-transfer-note/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const note = {
      date: body.date,
      from_dept: body.from_dept,
      to_dept: body.to_dept,
      transfer_date_time: body.transfer_date_time,
      shift_incharge: body.shift_incharge,
      qc_inspector: body.qc_inspector,
      fg_received_by: body.fg_received_by
    };

    const data = await updateFGTransferNote(id, note, body.items);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/production/fg-transfer-note/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    await deleteFGTransferNote(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/production/fg-transfer-note/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

